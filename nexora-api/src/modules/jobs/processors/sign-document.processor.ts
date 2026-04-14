// CAMBIO vs versión anterior:
// - Usa classifySigningError() para decidir reintentar vs revisión manual
// - Errores permanentes → NO re-lanza (BullMQ no reintenta)
// - Errores transitorios → re-lanza (BullMQ reintenta)
// - Errores de configuración → marca para revisión manual Y notifica admin

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';

import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { SriStatus } from '../../../common/enums/tax-document-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import { XmlGenerationService } from '../../xml-generation/xml-generation.service';
import { SigningService } from '../../signing/signing.service';
import { CertificatesService } from '../../certificates/certificates.service';
import { StorageService } from '../../storage/storage.service';
import { SriStateMachine } from '../../../common/states/invoice-state.machine';
import {
  classifySigningError,
  SigningErrorType,
} from '../../signing/signing-error.types';

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
      `[FIRMA] invoice=${invoiceId} intento=${job.attemptsMade + 1}`,
    );

    await this.invoiceRepo.update(invoiceId, {
      status: InvoiceStatus.PROCESSING,
    });

    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.SIGN_STARTED,
      sriStatus: SriStatus.PENDING_SIGN,
      metadata: {
        jobId: String(job.id),
        attempt: job.attemptsMade,
      },
    });

    try {
      // Cargar factura con todas las relaciones necesarias para XML
      const invoice = await this.invoiceRepo.findOne({
        where: { id: invoiceId },
        relations: ['company', 'customer', 'items'],
      });

      if (!invoice) {
        // Error permanente — la factura no existe
        throw new Error(`Factura ${invoiceId} no encontrada en BD`);
      }

      // Generar XML
      const xmlString = await this.xmlSvc.generateInvoiceXml(invoice);
      const now = new Date();
      const prefix = `${companyId}/xml/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const xmlPath = `${prefix}/${invoice.accessKey}.xml`;

      await this.storageSvc.upload(xmlPath, Buffer.from(xmlString, 'utf-8'));
      await this.taxDocRepo.update(taxDocumentId, { xmlPath });

      // Cargar certificado y firmar
      const { buffer: p12, passphrase } =
        await this.certSvc.getCertForSigning(companyId);

      const signedXml = await this.signSvc.signXml(
        xmlString,
        p12,
        passphrase,
        companyId,
      );

      const signedPath = `${prefix}/${invoice.accessKey}-signed.xml`;
      await this.storageSvc.upload(signedPath, Buffer.from(signedXml, 'utf-8'));

      // Transición de estado validada
      await this.taxDocSvc.transition({
        taxDocumentId,
        toStatus: SriStatus.SIGNED,
        updates: { signedXmlPath: signedPath },
        event: {
          eventType: TaxDocumentEventType.SIGN_COMPLETED,
          metadata: { xmlPath, signedPath },
        },
      });

      // Encolar transmisión
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
          jobId: `transmit-${invoiceId}`,
          delay: 1000,
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.log(`[FIRMA] Completada: invoice=${invoiceId}`);
    } catch (err) {
      // ─── Clasificar el error para decidir estrategia ──────────────────
      const classified = classifySigningError(err);

      this.logger.error(
        `[FIRMA] Error invoice=${invoiceId} ` +
          `tipo=${classified.type} reintentable=${classified.retryable}: ` +
          classified.message,
      );

      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SIGN_FAILED,
        sriStatus: SriStatus.PENDING_SIGN,
        errorDetail: classified.message,
        metadata: {
          errorType: classified.type,
          retryable: classified.retryable,
          requiresManualReview: classified.requiresManualReview,
          attempt: job.attemptsMade,
        },
      });

      await this.taxDocRepo.update(taxDocumentId, {
        lastError: `[${classified.type}] ${classified.message}`,
      });

      if (classified.requiresManualReview) {
        // Error permanente o de configuración → no reintentar
        await this.invoiceRepo.update(invoiceId, {
          status: InvoiceStatus.ERROR,
        });

        // TODO: si classified.notifyAdmin → enviar notificación al admin de la empresa
        // this.notificationsService.notifyAdminCertError(companyId, classified.message)

        this.logger.warn(
          `[FIRMA] Marcada para revisión manual: invoice=${invoiceId} tipo=${classified.type}`,
        );
        // NO re-lanzar — BullMQ no reintenta
        return;
      }

      // Error transitorio → re-lanzar para que BullMQ reintente
      await this.invoiceRepo.update(invoiceId, {
        status: InvoiceStatus.ERROR,
      });
      throw err;
    }
  }
}