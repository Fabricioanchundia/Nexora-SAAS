import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Job } from 'bull';
import type { Queue } from 'bull';
import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import { XmlGenerationService } from '../../xml-generation/xml-generation.service';
import { SigningService } from '../../signing/signing.service';
import { CertificatesService } from '../../certificates/certificates.service';
import { StorageService } from '../../storage/storage.service';

export interface SignDocumentJobData {
  invoiceId: string;
  taxDocumentId: string;
  companyId: string;
}

@Processor(QueueName.DOCUMENT_SIGNING)
export class SignDocumentProcessor {
  private readonly logger = new Logger(SignDocumentProcessor.name);

  constructor(
    @InjectRepository(TaxDocument)
    private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly taxDocSvc: TaxDocumentsService,
    private readonly xmlSvc: XmlGenerationService,
    private readonly signSvc: SigningService,
    private readonly certSvc: CertificatesService,
    private readonly storageSvc: StorageService,
    @InjectQueue(QueueName.DOCUMENT_TRANSMISSION)
    private readonly txQueue: Queue,
  ) {}

  @Process(JobName.SIGN_DOCUMENT)
  async handle(job: Job<SignDocumentJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, companyId } = job.data;
    this.logger.log(
      `Firmando: invoice=${invoiceId} intento=${job.attemptsMade + 1}`,
    );

    await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.PROCESSING });
    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.SIGN_STARTED,
      sriStatus: TaxDocumentStatus.PENDING_SIGN,
      metadata: { jobId: String(job.id), attempt: job.attemptsMade },
    });

    try {
      const invoice = await this.invoiceRepo.findOne({
        where: { id: invoiceId },
        relations: ['company', 'customer', 'items'],
      });
      if (!invoice) throw new Error(`Factura ${invoiceId} no encontrada`);

      // 1. Generar XML
      const xmlString = await this.xmlSvc.generateInvoiceXml(invoice);
      const now = new Date();
      const prefix = `${companyId}/xml/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const xmlPath = `${prefix}/${invoice.accessKey}.xml`;
      await this.storageSvc.upload(xmlPath, Buffer.from(xmlString, 'utf-8'));
      await this.taxDocRepo.update(taxDocumentId, { xmlPath });

      // 2. Firmar con .p12
      const { buffer: p12, passphrase } =
        await this.certSvc.getCertForSigning(companyId);
      const signedXml = await this.signSvc.signXml(xmlString, p12, passphrase);
      const signedPath = `${prefix}/${invoice.accessKey}-signed.xml`;
      await this.storageSvc.upload(signedPath, Buffer.from(signedXml, 'utf-8'));

      // 3. Actualizar estado
      await this.taxDocRepo.update(taxDocumentId, {
        signedXmlPath: signedPath,
        sriStatus: TaxDocumentStatus.SIGNED,
      });
      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SIGN_COMPLETED,
        sriStatus: TaxDocumentStatus.SIGNED,
        metadata: { xmlPath, signedPath },
      });

      // 4. Encolar transmisión
      await this.txQueue.add(
        JobName.TRANSMIT_DOCUMENT,
        {
          invoiceId, taxDocumentId, companyId,
          signedXmlPath: signedPath,
          accessKey: invoice.accessKey,
          environment: invoice.company.sriEnvironment,
        },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
          delay: 2000,
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.log(`Firma completada: invoice=${invoiceId}`);
    } catch (err) {
      this.logger.error(`Error firmando invoice=${invoiceId}`, err.stack);
      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.PENDING_SIGN,
        lastError: err.message,
      });
      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SIGN_FAILED,
        sriStatus: TaxDocumentStatus.PENDING_SIGN,
        errorDetail: err.message,
        metadata: { attempt: job.attemptsMade },
      });
      await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.ERROR });
      throw err;
    }
  }
}