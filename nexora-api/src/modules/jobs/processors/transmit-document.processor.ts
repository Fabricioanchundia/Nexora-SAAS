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
import { SriIntegrationService } from '../../sri-integration/sri-integration.service';
import { StorageService } from '../../storage/storage.service';
import { EnvironmentType } from '../../../common/enums/environment-type.enum';

const MAX_POLLS = 5;

export interface TransmitJobData {
  invoiceId: string;
  taxDocumentId: string;
  companyId: string;
  signedXmlPath: string;
  accessKey: string;
  environment: EnvironmentType;
}

@Processor(QueueName.DOCUMENT_TRANSMISSION)
export class TransmitDocumentProcessor {
  private readonly logger = new Logger(TransmitDocumentProcessor.name);

  constructor(
    @InjectRepository(TaxDocument)
    private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly taxDocSvc: TaxDocumentsService,
    private readonly sriSvc: SriIntegrationService,
    private readonly storageSvc: StorageService,
    @InjectQueue(QueueName.RIDE_GENERATION)
    private readonly rideQueue: Queue,
  ) {}

  @Process(JobName.TRANSMIT_DOCUMENT)
  async handle(job: Job<TransmitJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, signedXmlPath, accessKey, environment } =
      job.data;
    this.logger.log(
      `Transmitiendo al SRI: invoice=${invoiceId} intento=${job.attemptsMade + 1}`,
    );

    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.SUBMISSION_STARTED,
      sriStatus: TaxDocumentStatus.SIGNED,
      metadata: { attempt: job.attemptsMade },
    });

    try {
      const xmlBuf = await this.storageSvc.download(signedXmlPath);
      const result = await this.sriSvc.submitDocument(
        xmlBuf.toString('utf-8'),
        environment,
      );

      await this.taxDocRepo.update(taxDocumentId, {
        submittedAt: new Date(),
        sriStatus: TaxDocumentStatus.RECEIVED,
        sriRawResponse: (result as any).rawResponse || result,
      });
      await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.SUBMITTED });

      // Si el SRI rechazó (DEVUELTA) — error de datos, no reintentar
      if (result.state === 'DEVUELTA') {
        const errors = result.messages.map((m: any) => m.message).join(' | ');
        await this.taxDocRepo.update(taxDocumentId, {
          sriStatus: TaxDocumentStatus.REJECTED,
          lastError: errors,
        });
        await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.REJECTED });
        await this.taxDocSvc.addEvent(taxDocumentId, {
          eventType: TaxDocumentEventType.REJECTED,
          sriStatus: TaxDocumentStatus.REJECTED,
          rawResponse: result.rawResponse,
          errorDetail: errors,
        });
        return; // No lanzar error — rechazo es definitivo
      }

      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SUBMISSION_COMPLETED,
        sriStatus: TaxDocumentStatus.RECEIVED,
        rawResponse: result.rawResponse,
      });
      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.RECEIVED,
      });

      // Polling de autorización
      await this.pollAuthorization(job.data, 0);
    } catch (err) {
      this.logger.error(
        `Error transmitiendo invoice=${invoiceId}`,
        err.stack,
      );
      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.RETRY_QUEUED,
        lastError: err.message,
      });
      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SUBMISSION_FAILED,
        sriStatus: TaxDocumentStatus.RETRY_QUEUED,
        errorDetail: err.message,
        metadata: { attempt: job.attemptsMade },
      });
      throw err; // BullMQ gestiona el reintento
    }
  }

  private async pollAuthorization(
    data: TransmitJobData,
    attempt: number,
  ): Promise<void> {
    const { invoiceId, taxDocumentId, accessKey, environment } = data;

    if (attempt >= MAX_POLLS) {
      this.logger.warn(
        `Max polls alcanzado invoice=${invoiceId}. Quedó en RECEIVED.`,
      );
      return;
    }

    // Espera progresiva: 5s, 10s, 20s, 40s, 80s
    await this.sleep(Math.pow(2, attempt) * 5000);

    const auth = await this.sriSvc.checkAuthorization(accessKey, environment);

    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.STATUS_CHECKED,
      sriStatus: TaxDocumentStatus.IN_PROCESS,
      rawResponse: auth.rawResponse,
      metadata: { pollAttempt: attempt + 1 },
    });

    if (auth.state === 'EN PROCESO') {
      return this.pollAuthorization(data, attempt + 1);
    }

    if (auth.state === 'AUTORIZADO') {
      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.AUTHORIZED,
        authorizationNumber: auth.authorizationNumber || undefined,
        authorizedAt: auth.authorizedAt ? new Date(auth.authorizedAt) : new Date(),
        sriRawResponse: (auth as any).rawResponse || auth,
      });
      await this.invoiceRepo.update(invoiceId, {
        status: InvoiceStatus.AUTHORIZED,
      });
      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.AUTHORIZED,
        sriStatus: TaxDocumentStatus.AUTHORIZED,
        rawResponse: auth.rawResponse,
        metadata: { authorizationNumber: auth.authorizationNumber },
      });
      await this.rideQueue.add(
        JobName.GENERATE_RIDE,
        { invoiceId, taxDocumentId, companyId: data.companyId },
        {
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
      return;
    }

    // No autorizado
    const errors = auth.messages.map((m: any) => m.message).join(' | ');
    await this.taxDocRepo.update(taxDocumentId, {
      sriStatus: TaxDocumentStatus.REJECTED,
      lastError: errors,
    });
    await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.REJECTED });
    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.REJECTED,
      sriStatus: TaxDocumentStatus.REJECTED,
      rawResponse: auth.rawResponse,
      errorDetail: errors,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
