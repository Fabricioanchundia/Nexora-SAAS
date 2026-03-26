// src/modules/jobs/processors/sign-document.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';

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
import { InvoiceStateMachine } from '../../../common/states/invoice-state.machine';
import {
  isRetryable,
  toErrorMessage,
  CertificateExpiredError,
  CertificateInvalidError,
  SigningError,
} from '../../../common/errors/nexora.errors';

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

  @Process({ name: JobName.SIGN_DOCUMENT, concurrency: 5 })
  async handle(job: Job<SignDocumentJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, companyId } = job.data;

    this.logger.log(
      `[FIRMA] Iniciando: invoice=${invoiceId} intento=${job.attemptsMade + 1}`,
    );

    // Marcar como en proceso
    await this.invoiceRepo.update(invoiceId, {
      status: InvoiceStatus.PROCESSING,
    });

    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.SIGN_STARTED,
      sriStatus: TaxDocumentStatus.PENDING_SIGN,
      metadata: {
        jobId: String(job.id),
        attempt: job.attemptsMade,
        queue: QueueName.DOCUMENT_SIGNING,
      },
    });

    try {
      // ─── Cargar la factura completa ──────────────────────────────────────
      const invoice = await this.invoiceRepo.findOne({
        where: { id: invoiceId },
        relations: ['company', 'customer', 'items'],
      });

      if (!invoice) {
        // Error no reintentable — la factura no existe
        throw new SigningError(`Factura ${invoiceId} no encontrada en BD`);
      }

      if (!invoice.company || !invoice.customer || !invoice.items?.length) {
        throw new SigningError(
          `Factura ${invoiceId} incompleta: falta company, customer o items`,
        );
      }

      // ─── Generar XML ─────────────────────────────────────────────────────
      const xmlString = await this.xmlSvc.generateInvoiceXml(invoice);

      const now = new Date();
      const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const xmlPath = `${companyId}/xml/${yearMonth}/${invoice.accessKey}.xml`;

      await this.storageSvc.upload(xmlPath, Buffer.from(xmlString, 'utf-8'));
      await this.taxDocRepo.update(taxDocumentId, { xmlPath });

      this.logger.debug(`XML generado y guardado: ${xmlPath}`);

      // ─── Cargar certificado y firmar ──────────────────────────────────────
      const { buffer: p12Buffer, passphrase } =
        await this.certSvc.getCertForSigning(companyId);

      const signedXml = await this.signSvc.signXml(
        xmlString,
        p12Buffer,
        passphrase,
        companyId,
      );

      const signedPath = `${companyId}/xml/${yearMonth}/${invoice.accessKey}-signed.xml`;
      await this.storageSvc.upload(
        signedPath,
        Buffer.from(signedXml, 'utf-8'),
      );

      this.logger.debug(`XML firmado guardado: ${signedPath}`);

      // ─── Transición de estado validada ───────────────────────────────────
      await this.taxDocSvc.transition({
        taxDocumentId,
        toStatus: TaxDocumentStatus.SIGNED,
        updates: { signedXmlPath: signedPath },
        event: {
          eventType: TaxDocumentEventType.SIGN_COMPLETED,
          metadata: { xmlPath, signedPath },
        },
      });

      // ─── Encolar transmisión ──────────────────────────────────────────────
      await this.txQueue.add(
        JobName.TRANSMIT_DOCUMENT,
        {
          invoiceId,
          taxDocumentId,
          companyId,
          signedXmlPath: signedPath,
          accessKey: invoice.accessKey,
          environment: invoice.company.sriEnvironment,
        },
        {
          jobId: `transmit-${invoiceId}`, // idempotente
          delay: 1000,
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.log(`[FIRMA] Completada: invoice=${invoiceId}`);
    } catch (err) {
      const message = toErrorMessage(err);
      const shouldRetry = isRetryable(err);

      this.logger.error(
        `[FIRMA] Error invoice=${invoiceId} reintentable=${shouldRetry}: ${message}`,
      );

      // Errores de certificado no son reintentables
      const isCertError =
        err instanceof CertificateExpiredError ||
        err instanceof CertificateInvalidError;

      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SIGN_FAILED,
        sriStatus: TaxDocumentStatus.PENDING_SIGN,
        errorDetail: message,
        metadata: {
          attempt: job.attemptsMade,
          retryable: shouldRetry,
          errorType: isCertError ? 'CERTIFICATE' : 'SIGNING',
        },
      });

      await this.taxDocRepo.update(taxDocumentId, {
        lastError: message,
      });

      // Si es un error de certificado, marcar como ERROR definitivo
      if (isCertError) {
        await this.invoiceRepo.update(invoiceId, {
          status: InvoiceStatus.ERROR,
        });
        // NO re-lanzar — BullMQ no reintentará
        return;
      }

      await this.invoiceRepo.update(invoiceId, {
        status: InvoiceStatus.ERROR,
      });

      // Re-lanzar para que BullMQ gestione el reintento
      throw err;
    }
  }
}