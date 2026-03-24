// src/modules/jobs/processors/transmit-document.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import { SriIntegrationService, SRI_RECEPTION_STATES, SRI_AUTHORIZATION_STATES } from '../../sri-integration/sri-integration.service';
import { StorageService } from '../../storage/storage.service';
import { EnvironmentType } from '../../../common/enums/environment-type.enum';

export interface TransmitDocumentJobData {
  invoiceId: string;
  taxDocumentId: string;
  companyId: string;
  signedXmlPath: string;
  accessKey: string;
  environment: EnvironmentType;
}

// Máximo de consultas de autorización antes de declarar fallo
const MAX_AUTHORIZATION_POLLS = 5;

@Processor(QueueName.DOCUMENT_TRANSMISSION)
export class TransmitDocumentProcessor {
  private readonly logger = new Logger(TransmitDocumentProcessor.name);

  constructor(
    @InjectRepository(TaxDocument)
    private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly taxDocumentsService: TaxDocumentsService,
    private readonly sriService: SriIntegrationService,
    private readonly storageService: StorageService,
    @InjectQueue(QueueName.RIDE_GENERATION)
    private readonly rideQueue: Queue,
  ) {}

  @Process(JobName.TRANSMIT_DOCUMENT)
  async handle(job: Job<TransmitDocumentJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, signedXmlPath, accessKey, environment } =
      job.data;

    this.logger.log(`Transmitiendo al SRI: invoice=${invoiceId}`);

    await this.taxDocumentsService.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.SUBMISSION_STARTED,
      sriStatus: TaxDocumentStatus.SIGNED,
      metadata: { jobId: job.id, attempt: job.attemptsMade },
    });

    try {
      // 1. Cargar el XML firmado desde storage
      const signedXmlBuffer = await this.storageService.download(signedXmlPath);
      const signedXml = signedXmlBuffer.toString('utf-8');

      // 2. Enviar al SRI (recepción)
      const receptionResult = await this.sriService.submitDocument(
        signedXml,
        environment,
      );

      await this.taxDocRepo.update(taxDocumentId, {
        submittedAt: new Date(),
        sriStatus: TaxDocumentStatus.SUBMITTED,
        sriRawResponse: receptionResult.rawResponse,
      });

      await this.invoiceRepo.update(invoiceId, {
        status: InvoiceStatus.SUBMITTED,
      });

      // 3. Verificar si fue recibida
      if (receptionResult.state === SRI_RECEPTION_STATES.REJECTED) {
        const errors = receptionResult.messages
          .map((m) => `${m.message}: ${m.additionalInfo}`)
          .join(' | ');

        await this.taxDocRepo.update(taxDocumentId, {
          sriStatus: TaxDocumentStatus.REJECTED,
          lastError: errors,
        });

        await this.invoiceRepo.update(invoiceId, {
          status: InvoiceStatus.REJECTED,
        });

        await this.taxDocumentsService.addEvent(taxDocumentId, {
          eventType: TaxDocumentEventType.REJECTED,
          sriStatus: TaxDocumentStatus.REJECTED,
          rawResponse: receptionResult.rawResponse,
          errorDetail: errors,
        });

        // NO re-lanzar — un rechazo del SRI es definitivo (error de datos)
        return;
      }

      await this.taxDocumentsService.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SUBMISSION_COMPLETED,
        sriStatus: TaxDocumentStatus.RECEIVED,
        rawResponse: receptionResult.rawResponse,
      });

      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.RECEIVED,
      });

      // 4. Polling de autorización con espera progresiva
      await this.pollAuthorization(job.data, 0);
    } catch (error) {
      this.logger.error(
        `Error transmitiendo: invoice=${invoiceId}`,
        error.stack,
      );

      const isNetworkError =
        error.message.includes('TIMEOUT') ||
        error.message.includes('CONNECTION_ERROR');

      const sriStatus = isNetworkError
        ? TaxDocumentStatus.NOT_RECEIVED
        : TaxDocumentStatus.RETRY_QUEUED;

      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus,
        lastError: error.message,
        retryCount: () => 'retry_count + 1',
      });

      await this.taxDocumentsService.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SUBMISSION_FAILED,
        sriStatus,
        errorDetail: error.message,
        metadata: { attempt: job.attemptsMade },
      });

      throw error; // BullMQ gestiona el reintento
    }
  }

  private async pollAuthorization(
    data: TransmitDocumentJobData,
    attempt: number,
  ): Promise<void> {
    const { invoiceId, taxDocumentId, accessKey, environment } = data;

    if (attempt >= MAX_AUTHORIZATION_POLLS) {
      this.logger.warn(
        `Max polls alcanzado para invoice=${invoiceId}. Dejando en RECEIVED para revisión manual.`,
      );
      return;
    }

    // Espera progresiva: 5s, 10s, 20s, 40s, 80s
    const delay = Math.pow(2, attempt) * 5000;
    await this.sleep(delay);

    this.logger.log(
      `Poll autorización ${attempt + 1}/${MAX_AUTHORIZATION_POLLS}: invoice=${invoiceId}`,
    );

    const authResult = await this.sriService.checkAuthorization(
      accessKey,
      environment,
    );

    await this.taxDocumentsService.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.STATUS_CHECKED,
      sriStatus: TaxDocumentStatus.IN_PROCESS,
      rawResponse: authResult.rawResponse,
      metadata: { pollAttempt: attempt + 1 },
    });

    if (authResult.state === SRI_AUTHORIZATION_STATES.IN_PROCESS) {
      // Todavía procesando — reintentar
      return this.pollAuthorization(data, attempt + 1);
    }

    if (authResult.state === SRI_AUTHORIZATION_STATES.AUTHORIZED) {
      // Autorizado
      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.AUTHORIZED,
        authorizationNumber: authResult.authorizationNumber,
        authorizedAt: authResult.authorizedAt ?? new Date(),
        sriRawResponse: authResult.rawResponse,
      });

      await this.invoiceRepo.update(invoiceId, {
        status: InvoiceStatus.AUTHORIZED,
      });

      await this.taxDocumentsService.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.AUTHORIZED,
        sriStatus: TaxDocumentStatus.AUTHORIZED,
        rawResponse: authResult.rawResponse,
        metadata: { authorizationNumber: authResult.authorizationNumber },
      });

      // Encolar generación del RIDE
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

    // No autorizado con error
    const errors = authResult.messages
      .map((m) => `${m.message}: ${m.additionalInfo}`)
      .join(' | ');

    await this.taxDocRepo.update(taxDocumentId, {
      sriStatus: TaxDocumentStatus.REJECTED,
      lastError: errors,
      sriRawResponse: authResult.rawResponse,
    });

    await this.invoiceRepo.update(invoiceId, {
      status: InvoiceStatus.REJECTED,
    });

    await this.taxDocumentsService.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.REJECTED,
      sriStatus: TaxDocumentStatus.REJECTED,
      rawResponse: authResult.rawResponse,
      errorDetail: errors,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}