// src/modules/jobs/processors/sign-document.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import {
  TaxDocumentEventType,
} from '../../tax-documents/entities/tax-document-event.entity';
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
    private readonly taxDocumentsService: TaxDocumentsService,
    private readonly xmlGenerationService: XmlGenerationService,
    private readonly signingService: SigningService,
    private readonly certificatesService: CertificatesService,
    private readonly storageService: StorageService,
    @InjectQueue(QueueName.DOCUMENT_TRANSMISSION)
    private readonly transmissionQueue: Queue,
  ) {}

  @Process(JobName.SIGN_DOCUMENT)
  async handle(job: Job<SignDocumentJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, companyId } = job.data;
    this.logger.log(`Procesando firma: invoice=${invoiceId}`);

    // Actualizar estado a PROCESSING
    await this.invoiceRepo.update(invoiceId, {
      status: InvoiceStatus.PROCESSING,
    });

    await this.taxDocumentsService.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.SIGN_STARTED,
      sriStatus: TaxDocumentStatus.PENDING_SIGN,
      metadata: { jobId: job.id, attempt: job.attemptsMade },
    });

    try {
      // 1. Cargar la factura completa con sus relaciones
      const invoice = await this.invoiceRepo.findOne({
        where: { id: invoiceId },
        relations: ['company', 'customer', 'items'],
      });
      if (!invoice) throw new Error(`Factura ${invoiceId} no encontrada`);

      // 2. Generar XML
      const xmlString = await this.xmlGenerationService.generateInvoiceXml(invoice);

      // 3. Guardar XML sin firmar
      const xmlPath = `${companyId}/xml/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${invoice.accessKey}.xml`;
      await this.storageService.upload(xmlPath, Buffer.from(xmlString, 'utf-8'));

      await this.taxDocRepo.update(taxDocumentId, { xmlPath });

      // 4. Obtener certificado y firmar
      const { buffer: p12Buffer, passphrase } =
        await this.certificatesService.getCertificateForSigning(companyId);

      const signedXml = await this.signingService.signXml(
        xmlString,
        p12Buffer,
        passphrase,
      );

      // 5. Guardar XML firmado
      const signedXmlPath = `${companyId}/xml/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${invoice.accessKey}-signed.xml`;
      await this.storageService.upload(
        signedXmlPath,
        Buffer.from(signedXml, 'utf-8'),
      );

      // 6. Actualizar estado
      await this.taxDocRepo.update(taxDocumentId, {
        signedXmlPath,
        sriStatus: TaxDocumentStatus.SIGNED,
      });

      await this.taxDocumentsService.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SIGN_COMPLETED,
        sriStatus: TaxDocumentStatus.SIGNED,
        metadata: { xmlPath, signedXmlPath },
      });

      // 7. Encolar transmisión
      await this.transmissionQueue.add(
        JobName.TRANSMIT_DOCUMENT,
        {
          invoiceId,
          taxDocumentId,
          companyId,
          signedXmlPath,
          accessKey: invoice.accessKey,
          environment: invoice.company.sriEnvironment,
        },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
          delay: 2000, // esperar 2s antes del primer intento
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.log(`Firma completada: invoice=${invoiceId}`);
    } catch (error) {
      this.logger.error(`Error en firma: invoice=${invoiceId}`, error.stack);

      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.PENDING_SIGN, // volver al estado anterior
        lastError: error.message,
      });

      await this.taxDocumentsService.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SIGN_FAILED,
        sriStatus: TaxDocumentStatus.PENDING_SIGN,
        errorDetail: error.message,
        metadata: { jobId: job.id, attempt: job.attemptsMade },
      });

      await this.invoiceRepo.update(invoiceId, {
        status: InvoiceStatus.ERROR,
      });

      // Re-lanzar para que BullMQ gestione el reintento
      throw error;
    }
  }
}