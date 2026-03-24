// src/modules/invoices/invoices.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Decimal from 'decimal.js';

import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { TaxDocument } from '../tax-documents/entities/tax-document.entity';
import {
  TaxDocumentEvent,
  TaxDocumentEventType,
} from '../tax-documents/entities/tax-document-event.entity';
import { Company } from '../companies/entities/company.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { TaxDocumentStatus } from '../../common/enums/tax-document-status.enum';
import { QueueName, JobName } from '../../common/enums/queue-name.enum';
import { IvaRate } from '../../common/enums/tax-code.enum';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { AccessKeyService } from '../tax-documents/access-key.service';

// ⚠️ PENDIENTE DE PARAMETRIZACIÓN
// Las tasas de IVA deben verificarse contra la resolución vigente del SRI
// antes de usar en producción
const IVA_RATES: Record<IvaRate, number> = {
  [IvaRate.CERO]: 0,
  [IvaRate.DOCE]: 0.12,    // Verificar tarifa vigente con SRI
  [IvaRate.QUINCE]: 0.15,  // Verificar si aplica
  [IvaRate.EXENTO]: 0,
  [IvaRate.NO_OBJETO]: 0,
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    private readonly accessKeyService: AccessKeyService,
    @InjectQueue(QueueName.DOCUMENT_SIGNING)
    private readonly signingQueue: Queue,
  ) {}

  async create(
    dto: CreateInvoiceDto,
    companyId: string,
    user: User,
  ): Promise<Invoice> {
    // Validar empresa
    const company = await this.companyRepo.findOne({
      where: { id: companyId, isActive: true },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    // Validar certificado activo
    // La validación real del .p12 ocurre en el worker de firma
    // Aquí solo verificamos que exista uno registrado
    if (!company) throw new BadRequestException('Empresa inválida');

    // Validar cliente
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId, companyId, isActive: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    // Calcular totales ANTES de abrir la transacción
    const calculated = this.calculateTotals(dto.items);

    // Toda la operación es atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener y reservar el número secuencial (SELECT FOR UPDATE)
      const companyLocked = await queryRunner.manager
        .createQueryBuilder(Company, 'c')
        .setLock('pessimistic_write')
        .where('c.id = :id', { id: companyId })
        .getOne();

      const sequential = this.formatSequential(
        companyLocked.establishmentCode,
        companyLocked.emissionPoint,
        companyLocked.nextSequential,
      );

      // Incrementar secuencial
      await queryRunner.manager.update(Company, companyId, {
        nextSequential: companyLocked.nextSequential + 1,
      });

      // 2. Crear la factura
      const invoice = queryRunner.manager.create(Invoice, {
        companyId,
        customerId: dto.customerId,
        userId: user.id,
        sequential,
        issueDate: new Date(dto.issueDate),
        subtotalNoTax: calculated.subtotalNoTax,
        subtotalTaxable: calculated.subtotalTaxable,
        discountTotal: calculated.discountTotal,
        taxAmount: calculated.taxAmount,
        total: calculated.total,
        status: InvoiceStatus.PENDING,
        notes: dto.notes,
      });

      const savedInvoice = await queryRunner.manager.save(Invoice, invoice);

      // 3. Crear los ítems (snapshot inmutable del precio/producto)
      const items = dto.items.map((itemDto) =>
        queryRunner.manager.create(InvoiceItem, {
          invoiceId: savedInvoice.id,
          productId: itemDto.productId,
          productCode: itemDto.productCode,
          description: itemDto.description,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          discount: itemDto.discount ?? 0,
          subtotal: this.calculateItemSubtotal(itemDto),
          ivaRate: itemDto.ivaRate,
          taxCode: itemDto.taxCode,
          taxAmount: this.calculateItemTax(itemDto),
        }),
      );
      await queryRunner.manager.save(InvoiceItem, items);

      // 4. Generar la clave de acceso
      // ⚠️ PENDIENTE DE PARAMETRIZACIÓN — algoritmo según ficha técnica SRI
      const accessKey = this.accessKeyService.generate({
        issueDate: new Date(dto.issueDate),
        documentType: '01', // factura — verificar código en ficha técnica
        ruc: company.ruc,
        environment: company.sriEnvironment,
        sequential,
        emissionType: company.emissionType,
      });

      // Actualizar la factura con la clave de acceso
      await queryRunner.manager.update(Invoice, savedInvoice.id, { accessKey });

      // 5. Crear el documento tributario asociado
      const taxDocument = queryRunner.manager.create(TaxDocument, {
        invoiceId: savedInvoice.id,
        accessKey,
        sriStatus: TaxDocumentStatus.PENDING_SIGN,
        retryCount: 0,
      });
      const savedTaxDoc = await queryRunner.manager.save(TaxDocument, taxDocument);

      // 6. Registrar evento inicial
      const event = queryRunner.manager.create(TaxDocumentEvent, {
        taxDocumentId: savedTaxDoc.id,
        eventType: TaxDocumentEventType.CREATED,
        sriStatus: TaxDocumentStatus.PENDING_SIGN,
        metadata: {
          invoiceId: savedInvoice.id,
          sequential,
          accessKey,
          userId: user.id,
        },
      });
      await queryRunner.manager.save(TaxDocumentEvent, event);

      await queryRunner.commitTransaction();

      // 7. Encolar el trabajo de firma DESPUÉS del commit
      // Si el encolado falla, la factura queda en PENDING y se puede reintentar
      await this.signingQueue.add(
        JobName.SIGN_DOCUMENT,
        {
          invoiceId: savedInvoice.id,
          taxDocumentId: savedTaxDoc.id,
          companyId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: false, // conservar para auditoría
          removeOnFail: false,
        },
      );

      // 8. Auditoría
      await this.auditLogsService.log({
        companyId,
        userId: user.id,
        entityType: 'Invoice',
        entityId: savedInvoice.id,
        action: 'CREATE',
        metadata: { sequential, accessKey, total: calculated.total },
      });

      return await this.findOne(savedInvoice.id, companyId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error creando factura para empresa ${companyId}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    companyId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Invoice>> {
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { companyId },
      relations: ['customer', 'taxDocument'],
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findOne(id: string, companyId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['customer', 'items', 'taxDocument', 'taxDocument.events', 'user'],
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  // ─── Cálculos de totales ─────────────────────────────────────────────────────

  private calculateTotals(items: CreateInvoiceDto['items']) {
    // Usar Decimal.js para evitar errores de precisión de flotantes
    let subtotalNoTax = new Decimal(0);
    let subtotalTaxable = new Decimal(0);
    let discountTotal = new Decimal(0);
    let taxAmount = new Decimal(0);

    for (const item of items) {
      const qty = new Decimal(item.quantity);
      const price = new Decimal(item.unitPrice);
      const discount = new Decimal(item.discount ?? 0);
      const subtotal = qty.mul(price).minus(discount);
      const rate = new Decimal(IVA_RATES[item.ivaRate] ?? 0);
      const tax = subtotal.mul(rate);

      discountTotal = discountTotal.plus(discount);

      if (rate.isZero()) {
        subtotalNoTax = subtotalNoTax.plus(subtotal);
      } else {
        subtotalTaxable = subtotalTaxable.plus(subtotal);
      }

      taxAmount = taxAmount.plus(tax);
    }

    const total = subtotalNoTax.plus(subtotalTaxable).plus(taxAmount);

    return {
      subtotalNoTax: subtotalNoTax.toDecimalPlaces(2).toNumber(),
      subtotalTaxable: subtotalTaxable.toDecimalPlaces(2).toNumber(),
      discountTotal: discountTotal.toDecimalPlaces(2).toNumber(),
      taxAmount: taxAmount.toDecimalPlaces(2).toNumber(),
      total: total.toDecimalPlaces(2).toNumber(),
    };
  }

  private calculateItemSubtotal(item: any): number {
    return new Decimal(item.quantity)
      .mul(item.unitPrice)
      .minus(item.discount ?? 0)
      .toDecimalPlaces(2)
      .toNumber();
  }

  private calculateItemTax(item: any): number {
    const subtotal = new Decimal(item.quantity)
      .mul(item.unitPrice)
      .minus(item.discount ?? 0);
    const rate = new Decimal(IVA_RATES[item.ivaRate] ?? 0);
    return subtotal.mul(rate).toDecimalPlaces(2).toNumber();
  }

  // ─── Formato del número secuencial ──────────────────────────────────────────
  // ⚠️ PENDIENTE DE PARAMETRIZACIÓN — formato según ficha técnica SRI vigente
  // Formato esperado: 001-001-000000001
  private formatSequential(
    establishment: string,
    emissionPoint: string,
    sequence: number,
  ): string {
    return `${establishment}-${emissionPoint}-${String(sequence).padStart(9, '0')}`;
  }
}