import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { TaxDocumentStatus } from '../../common/enums/tax-document-status.enum';
import { QueueName, JobName } from '../../common/enums/queue-name.enum';
import { IVA_PERCENTAGES } from '../../common/enums/tax-code.enum';
import { User } from '../users/entities/user.entity';
import { formatDateKey } from '../../common/utils/date.util';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(TaxDocument) private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(TaxDocumentEvent) private readonly eventRepo: Repository<TaxDocumentEvent>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    @InjectQueue(QueueName.DOCUMENT_SIGNING) private readonly signingQueue: Queue,
  ) {}

  async create(dto: CreateInvoiceDto, companyId: string, user: User): Promise<Invoice> {
    const company = await this.companyRepo.findOne({ where: { id: companyId, isActive: true } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId, companyId, isActive: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const totals = this.calcTotals(dto.items);
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Secuencial atómico — SELECT FOR UPDATE
      const locked = await qr.manager
        .createQueryBuilder(Company, 'c')
        .setLock('pessimistic_write')
        .where('c.id = :id', { id: companyId })
        .getOne();

      if (!locked) throw new NotFoundException('Empresa no encontrada para generar secuencial');

      const sequential = `${locked.establishmentCode}-${locked.emissionPoint}-${String(locked.nextSequential).padStart(9, '0')}`;
      await qr.manager.update(Company, companyId, {
        nextSequential: locked.nextSequential + 1,
      });

      // ⚠️ Clave de acceso — verificar algoritmo con ficha técnica SRI
      const accessKey = this.buildAccessKey(
        new Date(dto.issueDate), '01',
        company.ruc, company.sriEnvironment,
        sequential, company.emissionType,
      );

      const invoice = await qr.manager.save(
        Invoice,
        qr.manager.create(Invoice, {
          companyId, customerId: dto.customerId, userId: user.id,
          sequential, accessKey, issueDate: new Date(dto.issueDate),
          ...totals, status: InvoiceStatus.PENDING, notes: dto.notes,
        }),
      );

      const items = dto.items.map((i) =>
        qr.manager.create(InvoiceItem, {
          invoiceId: invoice.id,
          productId: i.productId,
          productCode: i.productCode,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount ?? 0,
          subtotal: this.itemSub(i),
          ivaRate: i.ivaRate,
          taxCode: i.taxCode,
          taxAmount: this.itemTax(i),
        }),
      );
      await qr.manager.save(InvoiceItem, items);

      const taxDoc = await qr.manager.save(
        TaxDocument,
        qr.manager.create(TaxDocument, {
          invoiceId: invoice.id,
          accessKey,
          sriStatus: TaxDocumentStatus.PENDING_SIGN,
          retryCount: 0,
        }),
      );

      await qr.manager.save(
        TaxDocumentEvent,
        qr.manager.create(TaxDocumentEvent, {
          taxDocumentId: taxDoc.id,
          eventType: TaxDocumentEventType.CREATED,
          sriStatus: TaxDocumentStatus.PENDING_SIGN,
          metadata: { invoiceId: invoice.id, sequential, accessKey },
        }),
      );

      await qr.commitTransaction();

      // Encolar DESPUÉS del commit para garantizar consistencia
      await this.signingQueue.add(
        JobName.SIGN_DOCUMENT,
        { invoiceId: invoice.id, taxDocumentId: taxDoc.id, companyId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.auditLogsService
        .log({
          companyId, userId: user.id, entityType: 'Invoice',
          entityId: invoice.id, action: 'CREATE',
          metadata: { sequential, total: totals.total },
        })
        .catch(() => {});

      return this.findOne(invoice.id, companyId);
    } catch (err) {
      await qr.rollbackTransaction();
      this.logger.error(`Error creando factura empresa=${companyId}`, err.stack);
      throw err;
    } finally {
      await qr.release();
    }
  }

  async findAll(companyId: string, page = 1, limit = 20): Promise<{
    data: Invoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { companyId },
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
      relations: ['customer', 'items', 'taxDocument', 'taxDocument.events', 'user'],
    });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    return inv;
  }

  async getTimeline(id: string, companyId: string): Promise<{
    invoiceStatus: InvoiceStatus;
    taxDocument: {
      id: string | null;
      accessKey: string | null;
      sriStatus: TaxDocumentStatus | null;
      authorizationNumber: string | null;
      authorizedAt: Date | null;
      retryCount: number | null;
      lastError: string | null;
    };
    timeline: Array<{
      id: string;
      eventType: TaxDocumentEventType;
      sriStatus: TaxDocumentStatus;
      errorDetail: string | null;
      metadata: any;
      createdAt: Date;
    }>;
  }> {
    const inv = await this.findOne(id, companyId);
    return {
      invoiceStatus: inv.status,
      taxDocument: {
        id: inv.taxDocument?.id || null,
        accessKey: inv.taxDocument?.accessKey || null,
        sriStatus: inv.taxDocument?.sriStatus || null,
        authorizationNumber: inv.taxDocument?.authorizationNumber || null,
        authorizedAt: inv.taxDocument?.authorizedAt || null,
        retryCount: inv.taxDocument?.retryCount || null,
        lastError: inv.taxDocument?.lastError || null,
      },
      timeline: (inv.taxDocument?.events || []).map((e) => ({
        id: e.id,
        eventType: e.eventType,
        sriStatus: e.sriStatus,
        errorDetail: e.errorDetail,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
    };
  }

  // ─── Cálculos de totales ────────────────────────────────────────────────────
  private calcTotals(items: CreateInvoiceDto['items']) {
    let noTax = new Decimal(0);
    let taxable = new Decimal(0);
    let disc = new Decimal(0);
    let tax = new Decimal(0);

    for (const i of items) {
      const sub = new Decimal(i.quantity).mul(i.unitPrice).minus(i.discount ?? 0);
      const rate = new Decimal(IVA_PERCENTAGES[i.ivaRate] ?? 0);
      disc = disc.plus(i.discount ?? 0);
      if (rate.isZero()) noTax = noTax.plus(sub);
      else taxable = taxable.plus(sub);
      tax = tax.plus(sub.mul(rate));
    }

    return {
      subtotalNoTax: noTax.toDecimalPlaces(2).toNumber(),
      subtotalTaxable: taxable.toDecimalPlaces(2).toNumber(),
      discountTotal: disc.toDecimalPlaces(2).toNumber(),
      taxAmount: tax.toDecimalPlaces(2).toNumber(),
      total: noTax.plus(taxable).plus(tax).toDecimalPlaces(2).toNumber(),
    };
  }

  private itemSub(i: CreateInvoiceDto['items'][number]): number {
    return new Decimal(i.quantity)
      .mul(i.unitPrice)
      .minus(i.discount ?? 0)
      .toDecimalPlaces(2)
      .toNumber();
  }

  private itemTax(i: CreateInvoiceDto['items'][number]): number {
    return new Decimal(this.itemSub(i))
      .mul(IVA_PERCENTAGES[i.ivaRate] ?? 0)
      .toDecimalPlaces(2)
      .toNumber();
  }

  // ⚠️ PENDIENTE — verificar algoritmo módulo 11 con ficha técnica SRI vigente
  private buildAccessKey(
    date: Date, docType: string, ruc: string,
    env: string, seq: string, emType: string,
  ): string {
    const dateKey = formatDateKey(date);
    const clean = seq.replace(/-/g, '');
    const serie = clean.substring(0, 6);
    const numero = clean.substring(6);
    const codigo = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    const partial = `${dateKey}${docType}${ruc}${env}${serie}${numero}${codigo}${emType}`;
    return partial + this.mod11(partial);
  }

  private mod11(k: string): string {
    const w = [2, 3, 4, 5, 6, 7];
    let s = 0;
    let wi = 0;
    for (let i = k.length - 1; i >= 0; i--) {
      s += parseInt(k[i], 10) * w[wi++ % w.length];
    }
    const r = 11 - (s % 11);
    if (r === 11) return '0';
    if (r === 10) return '1';
    return String(r);
  }
}