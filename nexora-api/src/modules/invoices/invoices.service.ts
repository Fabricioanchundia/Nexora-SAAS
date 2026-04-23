import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
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
import { SriStatus, PostStatus } from '../../common/enums/tax-document-status.enum';
import { QueueName, JobName } from '../../common/enums/queue-name.enum';
import { IVA_PERCENTAGES } from '../../common/enums/tax-code.enum';
import { User } from '../users/entities/user.entity';
import { AccessKeyService } from '../../common/service/access-key.service';
import { DocumentType } from '../../config/sri-config';
import { InvoicePreValidatorService } from './validators/invoice-pre-validator.service';
import { StorageService } from '../storage/storage.service';
import { RideService } from '../ride/ride.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)       private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)   private readonly itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Company)       private readonly companyRepo: Repository<Company>,
    @InjectRepository(Customer)      private readonly customerRepo: Repository<Customer>,
    @InjectRepository(TaxDocument)   private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(TaxDocumentEvent) private readonly eventRepo: Repository<TaxDocumentEvent>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    private readonly accessKeyService: AccessKeyService,
    private readonly preValidator: InvoicePreValidatorService,
    private readonly storageSvc: StorageService,
    private readonly rideSvc: RideService,
    @InjectQueue(QueueName.DOCUMENT_SIGNING) private readonly signingQueue: Queue,
  ) {}

  async create(dto: CreateInvoiceDto, companyId: string, user: User): Promise<Invoice> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const customer = await this.customerRepo.findOne({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    this.preValidator.validate(dto, company, customer);

    if (dto.idempotencyKey) {
      const existing = await this.invoiceRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey, companyId } });
      if (existing) {
        this.logger.warn(`Factura duplicada detectada — idempotencyKey=${dto.idempotencyKey}`);
        return existing;
      }
    }

    const totals = this.calculateTotals(dto.items);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      await qr.manager.createQueryBuilder()
        .update(Company).set({ nextSequential: () => 'next_sequential + 1' })
        .where('id = :id', { id: companyId }).execute();

      const refreshed = await qr.manager.findOne(Company, { where: { id: companyId } });
      if (!refreshed) throw new Error('Error cargando empresa');
      const sequential = refreshed.nextSequential - 1;

      // Fix zona horaria — agregar mediodía para evitar desfase UTC-5
      const issueDate = new Date(dto.issueDate + 'T12:00:00');

      const accessKey = this.accessKeyService.generate({
        issueDate,
        documentType:      DocumentType.FACTURA,
        ruc:               company.ruc,
        environment:       company.sriEnvironment,
        establishmentCode: company.establishmentCode,
        emissionPoint:     company.emissionPoint,
        sequentialNumber:  sequential,
        numericCode:       Math.floor(Math.random() * 99_999_999) + 1,
        emissionType:      company.emissionType,
      });

      const invoice = qr.manager.create(Invoice, {
        companyId,
        customerId:       dto.customerId,
        userId:           user.id,
        sequential:       this.buildSequential(company.establishmentCode, company.emissionPoint, sequential),
        accessKey,
        idempotencyKey:   dto.idempotencyKey ?? null,
        issueDate,
        notes:            dto.notes ?? null,
        guiaRemision:     dto.guiaRemision ?? null,
        paymentMethods:   dto.paymentMethods ?? null,
        status:           InvoiceStatus.PENDING,
        ...totals,
      });
      const savedInvoice = await qr.manager.save(Invoice, invoice);

      const items = dto.items.map((i) =>
        qr.manager.create(InvoiceItem, {
          invoiceId:     savedInvoice.id,
          productId:     i.productId ?? null,
          productCode:   i.productCode,
          description:   i.description,
          quantity:      i.quantity,
          unitPrice:     i.unitPrice,
          discount:      i.discount ?? 0,
          subtotal:      this.itemSubtotal(i),
          ivaRate:       i.ivaRate,
          taxCode:       i.taxCode,
          taxAmount:     this.itemTax(i),
        }),
      );
      await qr.manager.save(InvoiceItem, items);

      const taxDoc = qr.manager.create(TaxDocument, {
        invoiceId: savedInvoice.id,
        accessKey,
        sriStatus:    SriStatus.PENDING_SIGN,
        postStatus:   PostStatus.PENDING_RIDE,
        environment:  company.sriEnvironment as any,
        sriRetryCount: 0,
        postRetryCount: 0,
      });
      const savedTaxDoc = await qr.manager.save(TaxDocument, taxDoc);

      const event = qr.manager.create(TaxDocumentEvent, {
        taxDocumentId: savedTaxDoc.id,
        eventType:     TaxDocumentEventType.CREATED,
        sriStatus:     SriStatus.PENDING_SIGN,
        metadata:      { sequential, accessKey },
      });
      await qr.manager.save(TaxDocumentEvent, event);

      await qr.commitTransaction();

      await this.signingQueue.add(
        JobName.SIGN_DOCUMENT,
        { invoiceId: savedInvoice.id, taxDocumentId: savedTaxDoc.id, companyId },
        { jobId: `sign-${savedInvoice.id}`, attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: false, removeOnFail: false },
      );

      this.logger.log(`Factura creada: ${savedInvoice.sequential} (${accessKey})`);
      this.auditLogsService.log({ companyId, userId: user.id, entityType: 'Invoice', entityId: savedInvoice.id, action: 'CREATE', metadata: { sequential, accessKey } }).catch(() => {});

      return savedInvoice;
    } catch (err) {
      await qr.rollbackTransaction();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('unique') || msg.includes('duplicate')) throw new ConflictException('Factura duplicada');
      throw err;
    } finally {
      await qr.release();
    }
  }

  async downloadPdf(id: string, companyId: string): Promise<{ buffer: Buffer; filename: string }> {
    const inv = await this.findOne(id, companyId);
    if (!inv.taxDocument?.authorizationNumber) {
      throw new BadRequestException('La factura aún no está autorizada. Espera la respuesta del SRI.');
    }
    let buffer: Buffer;
    if (inv.taxDocument.ridePdfPath) {
      buffer = await this.storageSvc.download(inv.taxDocument.ridePdfPath);
    } else {
      buffer = await this.rideSvc.generatePdf(inv);
    }
    return { buffer, filename: `factura-${inv.sequential?.replaceAll('/', '-') ?? id}.pdf` };
  }

  async downloadXml(id: string, companyId: string): Promise<{ buffer: Buffer; filename: string }> {
    const inv = await this.findOne(id, companyId);
    if (!inv.taxDocument?.signedXmlPath) {
      throw new BadRequestException('XML no disponible. La factura aún no fue firmada.');
    }
    const buffer = await this.storageSvc.download(inv.taxDocument.signedXmlPath);
    return { buffer, filename: `factura-${inv.sequential?.replaceAll('/', '-') ?? id}.xml` };
  }

  async cancel(id: string, companyId: string, userId: string): Promise<{ message: string }> {
    const inv = await this.findOne(id, companyId);
    if (inv.status !== InvoiceStatus.DRAFT) {
      throw new ForbiddenException('Solo se pueden cancelar facturas en estado DRAFT.');
    }
    await this.invoiceRepo.update(id, { status: InvoiceStatus.CANCELLED });
    this.auditLogsService.log({ companyId, userId, entityType: 'Invoice', entityId: id, action: 'CANCEL' }).catch(() => {});
    return { message: 'Factura cancelada.' };
  }

  async findAll(companyId: string, page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = { companyId };
    if (status) where['status'] = status;
    const [data, total] = await this.invoiceRepo.findAndCount({
      where,
      relations: ['customer', 'taxDocument'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId: string): Promise<Invoice> {
    const inv = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['customer', 'items', 'taxDocument', 'taxDocument.events', 'user', 'company'],
    });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    return inv;
  }

  async getTimeline(id: string, companyId: string) {
    const inv = await this.findOne(id, companyId);
    return {
      invoiceId:           inv.id,
      sequential:          inv.sequential,
      accessKey:           inv.accessKey,
      status:              inv.status,
      sriStatus:           inv.taxDocument?.sriStatus,
      authorizationNumber: inv.taxDocument?.authorizationNumber,
      authorizedAt:        inv.taxDocument?.authorizedAt,
      events: [...(inv.taxDocument?.events ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    };
  }

  async retry(id: string, companyId: string, userId: string): Promise<{ message: string }> {
    const inv = await this.findOne(id, companyId);
    if (!inv.taxDocument) throw new NotFoundException('No hay documento tributario asociado');
    if (inv.taxDocument.sriStatus === SriStatus.AUTHORIZED) throw new BadRequestException('Esta factura ya está autorizada');
    if (![InvoiceStatus.ERROR, InvoiceStatus.REJECTED].includes(inv.status)) throw new BadRequestException('Solo se pueden reintentar facturas en estado ERROR o REJECTED');

    await this.invoiceRepo.update(id, { status: InvoiceStatus.PENDING });
    await this.taxDocRepo.update(inv.taxDocument.id, { sriStatus: SriStatus.PENDING_SIGN, lastError: null });
    await this.signingQueue.add(
      JobName.SIGN_DOCUMENT,
      { invoiceId: id, taxDocumentId: inv.taxDocument.id, companyId },
      { jobId: `sign-${id}-retry-${Date.now()}`, attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: false, removeOnFail: false },
    );
    this.auditLogsService.log({ companyId, userId, entityType: 'Invoice', entityId: id, action: 'RETRY', metadata: { sriRetryCount: inv.taxDocument.sriRetryCount + 1 } }).catch(() => {});
    return { message: 'Reintento encolado correctamente' };
  }

  private calculateTotals(items: CreateInvoiceDto['items']) {
    let subtotalNoTax = new Decimal(0), subtotalTaxable = new Decimal(0);
    let discountTotal = new Decimal(0), taxAmount = new Decimal(0);
    for (const i of items) {
      const qty = new Decimal(i.quantity), price = new Decimal(i.unitPrice), disc = new Decimal(i.discount ?? 0);
      const subtotal = qty.mul(price).minus(disc);
      const rate     = new Decimal(IVA_PERCENTAGES[i.ivaRate] ?? 0);
      discountTotal  = discountTotal.plus(disc);
      if (rate.isZero()) subtotalNoTax = subtotalNoTax.plus(subtotal);
      else subtotalTaxable = subtotalTaxable.plus(subtotal);
      taxAmount = taxAmount.plus(subtotal.mul(rate));
    }
    return {
      subtotalNoTax:   subtotalNoTax.toDecimalPlaces(2).toNumber(),
      subtotalTaxable: subtotalTaxable.toDecimalPlaces(2).toNumber(),
      discountTotal:   discountTotal.toDecimalPlaces(2).toNumber(),
      taxAmount:       taxAmount.toDecimalPlaces(2).toNumber(),
      total:           subtotalNoTax.plus(subtotalTaxable).plus(taxAmount).toDecimalPlaces(2).toNumber(),
    };
  }

  private itemSubtotal(i: { quantity: number; unitPrice: number; discount?: number }) {
    return new Decimal(i.quantity).mul(i.unitPrice).minus(i.discount ?? 0).toDecimalPlaces(2).toNumber();
  }

  private itemTax(i: { quantity: number; unitPrice: number; discount?: number; ivaRate: string }) {
    return new Decimal(this.itemSubtotal(i)).mul(IVA_PERCENTAGES[i.ivaRate] ?? 0).toDecimalPlaces(2).toNumber();
  }

  private buildSequential(estab: string, punto: string, seq: number): string {
    return `${estab}-${punto}-${String(seq).padStart(9, '0')}`;
  }
}