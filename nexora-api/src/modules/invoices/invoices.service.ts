import {
  Injectable, Logger, NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Decimal from 'decimal.js';

import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { TaxDocument } from '../tax-documents/entities/tax-document.entity';
import { TaxDocumentEvent, TaxDocumentEventType } from '../tax-documents/entities/tax-document-event.entity';
import { Company } from '../companies/entities/company.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { TaxDocumentStatus } from '../../common/enums/tax-document-status.enum';
import { QueueName, JobName } from '../../common/enums/queue-name.enum';
import { IVA_PERCENTAGES } from '../../common/enums/tax-code.enum';
import { User } from '../users/entities/user.entity';
import { formatDateKey } from '../../common/utils/date.util';
import { AccessKeyService } from './access-key.service';

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
    @InjectRepository(TaxDocument)
    private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(TaxDocumentEvent)
    private readonly eventRepo: Repository<TaxDocumentEvent>,
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
    // ─── Validaciones previas fuera de la transacción ────────────────────
    const company = await this.companyRepo.findOne({
      where: { id: companyId, isActive: true },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId, companyId, isActive: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    // Idempotencia: si el cliente envía un idempotencyKey, verificar duplicado
    if (dto.idempotencyKey) {
      const existing = await this.invoiceRepo.findOne({
        where: { idempotencyKey: dto.idempotencyKey, companyId },
      });
      if (existing) {
        this.logger.warn(
          `Factura duplicada detectada por idempotencyKey=${dto.idempotencyKey}`,
        );
        return this.findOne(existing.id, companyId);
      }
    }

    const totals = this.calculateTotals(dto.items);
    this.validateTotals(totals); // falla si algo está en cero cuando no debería

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // ─── Secuencial atómico ──────────────────────────────────────────────
      const locked = await qr.manager
      .createQueryBuilder(Company, 'c')
      .setLock('pessimistic_write')
      .where('c.id = :id', { id: companyId })
      .getOne();

// Verificación explícita — TypeScript sabe que después de esto no es null
    if (!locked) {
  throw new Error(`Empresa ${companyId} no encontrada durante transacción`);
  }

    const sequential = this.buildSequential(
        locked.establishmentCode,
        locked.emissionPoint,
        locked.nextSequential,
  );

      await qr.manager.update(Company, companyId, {
        nextSequential: locked.nextSequential + 1,
  });


      // ─── Clave de acceso ─────────────────────────────────────────────────
      // ⚠️ PENDIENTE — verificar algoritmo exacto con ficha técnica SRI vigente
      const accessKey = this.accessKeyService.generate({
        issueDate: new Date(dto.issueDate),
        documentType: '01', // factura — verificar con ficha técnica
        ruc: company.ruc,
        environment: company.sriEnvironment,
        sequential,
        emissionType: company.emissionType,
        numericCode: locked.nextSequential, // usar secuencial como código numérico → no aleatorio
      });

      // ─── Guardar invoice ─────────────────────────────────────────────────
      const invoice = await qr.manager.save(
        Invoice,
        qr.manager.create(Invoice, {
          companyId,
          customerId: dto.customerId,
          userId: user.id,
          sequential,
          accessKey,
          idempotencyKey: dto.idempotencyKey,
          issueDate: new Date(dto.issueDate),
          subtotalNoTax: totals.subtotalNoTax,
          subtotalTaxable: totals.subtotalTaxable,
          discountTotal: totals.discountTotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          status: InvoiceStatus.PENDING,
          notes: dto.notes,
        }),
      );

      // ─── Items — snapshot inmutable del precio al momento de facturar ────
      const items = dto.items.map((i) =>
        qr.manager.create(InvoiceItem, {
          invoiceId: invoice.id,
          productId: i.productId ?? null,
          productCode: i.productCode,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount ?? 0,
          subtotal: this.itemSubtotal(i),
          ivaRate: i.ivaRate,
          taxCode: i.taxCode,
          taxAmount: this.itemTax(i),
        }),
      );
      await qr.manager.save(InvoiceItem, items);

      // ─── TaxDocument — documento tributario vinculado ───────────────────
      const taxDoc = await qr.manager.save(
        TaxDocument,
        qr.manager.create(TaxDocument, {
          invoiceId: invoice.id,
          accessKey,
          sriStatus: TaxDocumentStatus.PENDING_SIGN,
          retryCount: 0,
          environment: company.sriEnvironment, // guardar el ambiente al momento de crear
        }),
      );

      // ─── Primer evento del log inmutable ────────────────────────────────
      await qr.manager.save(
        TaxDocumentEvent,
        qr.manager.create(TaxDocumentEvent, {
          taxDocumentId: taxDoc.id,
          eventType: TaxDocumentEventType.CREATED,
          sriStatus: TaxDocumentStatus.PENDING_SIGN,
          metadata: {
            invoiceId: invoice.id,
            sequential,
            accessKey,
            userId: user.id,
            companyId,
          },
        }),
      );

      await qr.commitTransaction();

      // ─── Encolar DESPUÉS del commit ──────────────────────────────────────
      // Si esto falla, la factura queda en PENDING y puede reintentarse
      // manualmente o con un job de recuperación
      const job = await this.signingQueue.add(
        JobName.SIGN_DOCUMENT,
        {
          invoiceId: invoice.id,
          taxDocumentId: taxDoc.id,
          companyId,
        },
        {
          jobId: `sign-${invoice.id}`, // ID determinístico — previene duplicados en cola
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Factura creada: id=${invoice.id} seq=${sequential} jobId=${job.id}`,
      );

      // Auditoría no bloquea el flujo
      this.auditLogsService
        .log({
          companyId,
          userId: user.id,
          entityType: 'Invoice',
          entityId: invoice.id,
          action: 'CREATE',
          metadata: { sequential, accessKey, total: totals.total },
        })
        .catch((err) =>
          this.logger.error('Error en audit log', err.message),
        );

      return this.findOne(invoice.id, companyId);
    } catch (err) {
      await qr.rollbackTransaction();
      this.logger.error(
        `Error creando factura empresa=${companyId}`,
        err.stack,
      );
      throw err;
    } finally {
      await qr.release();
    }
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { companyId },
      relations: ['customer', 'taxDocument'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, companyId: string): Promise<Invoice> {
    const inv = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: [
        'customer',
        'items',
        'taxDocument',
        'taxDocument.events',
        'user',
      ],
    });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    return inv;
  }

  async getTimeline(id: string, companyId: string) {
    const inv = await this.findOne(id, companyId);
    return {
      invoiceId: inv.id,
      sequential: inv.sequential,
      invoiceStatus: inv.status,
      taxDocument: inv.taxDocument
        ? {
            id: inv.taxDocument.id,
            accessKey: inv.taxDocument.accessKey,
            sriStatus: inv.taxDocument.sriStatus,
            authorizationNumber: inv.taxDocument.authorizationNumber,
            authorizedAt: inv.taxDocument.authorizedAt,
            retryCount: inv.taxDocument.retryCount,
            lastError: inv.taxDocument.lastError,
          }
        : null,
      timeline: (inv.taxDocument?.events ?? [])
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((e) => ({
          id: e.id,
          eventType: e.eventType,
          sriStatus: e.sriStatus,
          errorDetail: e.errorDetail,
          metadata: e.metadata,
          createdAt: e.createdAt,
        })),
    };
  }

  // Reintentar manualmente una factura fallida
  async retry(id: string, companyId: string, userId: string): Promise<void> {
    const inv = await this.findOne(id, companyId);

    if (
      ![InvoiceStatus.ERROR, InvoiceStatus.REJECTED].includes(inv.status)
    ) {
      throw new ConflictException(
        'Solo se pueden reintentar facturas en estado ERROR',
      );
    }

    if (!inv.taxDocument) {
      throw new ConflictException('No hay documento tributario asociado');
    }

    // Resetear estado
    await this.invoiceRepo.update(id, { status: InvoiceStatus.PENDING });
    await this.taxDocRepo.update(inv.taxDocument.id, {
      sriStatus: TaxDocumentStatus.PENDING_SIGN,
      lastError: null,
      retryCount: inv.taxDocument.retryCount + 1,
    });

    await this.signingQueue.add(
      JobName.SIGN_DOCUMENT,
      {
        invoiceId: id,
        taxDocumentId: inv.taxDocument.id,
        companyId,
      },
      {
        jobId: `sign-${id}-retry-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.auditLogsService
      .log({
        companyId,
        userId,
        entityType: 'Invoice',
        entityId: id,
        action: 'RETRY',
        metadata: { retryCount: inv.taxDocument.retryCount + 1 },
      })
      .catch(() => {});
  }

  // ─── Cálculos ──────────────────────────────────────────────────────────────

  private calculateTotals(items: CreateInvoiceDto['items']) {
    let subtotalNoTax = new Decimal(0);
    let subtotalTaxable = new Decimal(0);
    let discountTotal = new Decimal(0);
    let taxAmount = new Decimal(0);

    for (const i of items) {
      const qty = new Decimal(i.quantity);
      const price = new Decimal(i.unitPrice);
      const disc = new Decimal(i.discount ?? 0);
      const subtotal = qty.mul(price).minus(disc);
      const rate = new Decimal(IVA_PERCENTAGES[i.ivaRate] ?? 0);

      discountTotal = discountTotal.plus(disc);

      if (rate.isZero()) {
        subtotalNoTax = subtotalNoTax.plus(subtotal);
      } else {
        subtotalTaxable = subtotalTaxable.plus(subtotal);
      }

      taxAmount = taxAmount.plus(subtotal.mul(rate));
    }

    return {
      subtotalNoTax: subtotalNoTax.toDecimalPlaces(2).toNumber(),
      subtotalTaxable: subtotalTaxable.toDecimalPlaces(2).toNumber(),
      discountTotal: discountTotal.toDecimalPlaces(2).toNumber(),
      taxAmount: taxAmount.toDecimalPlaces(2).toNumber(),
      total: subtotalNoTax
        .plus(subtotalTaxable)
        .plus(taxAmount)
        .toDecimalPlaces(2)
        .toNumber(),
    };
  }

  private validateTotals(totals: ReturnType<typeof this.calculateTotals>) {
    if (totals.total <= 0) {
      throw new ConflictException(
        'El total de la factura no puede ser cero o negativo',
      );
    }
  }

  private itemSubtotal(i: any): number {
    return new Decimal(i.quantity)
      .mul(i.unitPrice)
      .minus(i.discount ?? 0)
      .toDecimalPlaces(2)
      .toNumber();
  }

  private itemTax(i: any): number {
    return new Decimal(this.itemSubtotal(i))
      .mul(IVA_PERCENTAGES[i.ivaRate] ?? 0)
      .toDecimalPlaces(2)
      .toNumber();
  }

  private buildSequential(
    estab: string,
    punto: string,
    seq: number,
  ): string {
    // ⚠️ Formato: 001-001-000000001 — verificar con ficha técnica SRI
    return `${estab}-${punto}-${String(seq).padStart(9, '0')}`;
  }
}