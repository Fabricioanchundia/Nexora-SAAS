// src/modules/jobs/processors/transmit-document.processor.ts
import { Process, Processor, InjectQueue } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job, Queue } from 'bull';

import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import {
  SriIntegrationService,
  SriAuthorizationResult,
} from '../../sri-integration/sri-integration.service';
import { StorageService } from '../../storage/storage.service';
import { EnvironmentType } from '../../../common/enums/environment-type.enum';
import {
  isRetryable,
  toErrorMessage,
} from '../../../common/errors/nexora.errors';

const MAX_POLL_ATTEMPTS = 10;
const POLL_BASE_DELAY_MS = 8_000;

export interface TransmitJobData {
  invoiceId: string;
  taxDocumentId: string;
  companyId: string;
  signedXmlPath: string;
  accessKey: string;
  environment: EnvironmentType;
}

export interface PollJobData extends TransmitJobData {
  pollAttempt: number;
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
    @InjectQueue(QueueName.DOCUMENT_TRANSMISSION)
    private readonly selfQueue: Queue,
    @InjectQueue(QueueName.RIDE_GENERATION)
    private readonly rideQueue: Queue,
  ) {}

  @Process({ name: JobName.TRANSMIT_DOCUMENT, concurrency: 3 })
  async handleTransmit(job: Job<TransmitJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, signedXmlPath, environment } = job.data;

    this.logger.log(
      `[TRANSMISIÓN] invoice=${invoiceId} intento=${job.attemptsMade + 1}`,
    );

    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.SUBMISSION_STARTED,
      sriStatus: TaxDocumentStatus.SIGNED,
      metadata: { attempt: job.attemptsMade, jobId: String(job.id) },
    });

    let xmlBuf: Buffer;
    try {
      xmlBuf = await this.storageSvc.download(signedXmlPath);
    } catch (err) {
      throw new Error(`No se pudo leer XML firmado: ${toErrorMessage(err)}`);
    }

    let result: Awaited<ReturnType<SriIntegrationService['submitDocument']>>;
    try {
      result = await this.sriSvc.submitDocument(
        xmlBuf.toString('utf-8'),
        environment,
      );
    } catch (err) {
      const message = toErrorMessage(err);
      await this.taxDocRepo.update(taxDocumentId, {
        sriStatus: TaxDocumentStatus.NOT_RECEIVED,
        lastError: message,
      });
      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.SUBMISSION_FAILED,
        sriStatus: TaxDocumentStatus.NOT_RECEIVED,
        errorDetail: message,
        metadata: { retryable: isRetryable(err) },
      });
      throw err;
    }

    if (result.state === 'DEVUELTA') {
      const yaRegistrada = result.messages.some((m) => m.identifier === '43' || m.identifier === '45');
      if (yaRegistrada) {
        this.logger.log(
          `[TRANSMISIÓN] Clave ya registrada, pasando a polling: invoice=${invoiceId}`,
        );
        await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.SUBMITTED });
        await this.selfQueue.add(
          JobName.POLL_AUTHORIZATION,
          { ...job.data, pollAttempt: 0 } as PollJobData,
          {
            jobId: `poll-${invoiceId}-0`,
            delay: 5000,
            attempts: 1,
            removeOnComplete: false,
            removeOnFail: false,
          },
        );
        return;
      }

      const errorMessages = result.messages.map((m) => m.message);
      const errorStr = errorMessages.join(' | ');

      await this.taxDocSvc.transition({
        taxDocumentId,
        toStatus: TaxDocumentStatus.REJECTED,
        updates: {
          lastError: errorStr,
          sriRawResponse: { rawXml: result.rawXml } as object,
        },
        event: {
          eventType: TaxDocumentEventType.REJECTED,
          rawResponse: { rawXml: result.rawXml } as Record<string, unknown>,
          errorDetail: errorStr,
          metadata: { type: 'sri_business_rejection', messages: errorMessages },
        },
      });

      await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.REJECTED });
      this.logger.warn(`[TRANSMISIÓN] DEVUELTA por SRI: invoice=${invoiceId} | ${errorStr}`);
      return;
    }

    await this.taxDocSvc.transition({
      taxDocumentId,
      toStatus: TaxDocumentStatus.RECEIVED,
      updates: {
        submittedAt: new Date(),
        sriRawResponse: { rawXml: result.rawXml } as object,
      },
      event: {
        eventType: TaxDocumentEventType.SUBMISSION_COMPLETED,
        rawResponse: { rawXml: result.rawXml } as Record<string, unknown>,
      },
    });

    await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.SUBMITTED });

    await this.selfQueue.add(
      JobName.POLL_AUTHORIZATION,
      { ...job.data, pollAttempt: 0 } as PollJobData,
      {
        jobId: `poll-${invoiceId}-0`,
        delay: POLL_BASE_DELAY_MS,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(`[TRANSMISIÓN] RECIBIDA por SRI, polling encolado: invoice=${invoiceId}`);
  }

  @Process({ name: JobName.POLL_AUTHORIZATION, concurrency: 10 })
  async handlePoll(job: Job<PollJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, accessKey, environment, pollAttempt } = job.data;

    this.logger.log(`[POLL] invoice=${invoiceId} intento=${pollAttempt + 1}/${MAX_POLL_ATTEMPTS}`);

    let auth: SriAuthorizationResult;
    try {
      auth = await this.sriSvc.checkAuthorization(accessKey, environment);
      this.logger.log(`[POLL] Respuesta SRI estado=${auth.state} messages=${JSON.stringify(auth.messages)} rawXml=${auth.rawXml}`);
    } catch (err) {
      const message = toErrorMessage(err);
      this.logger.warn(`[POLL] Error consultando SRI invoice=${invoiceId}: ${message}`);
      if (pollAttempt + 1 < MAX_POLL_ATTEMPTS) {
        await this.enqueueNextPoll(job.data, pollAttempt + 1);
      } else {
        await this.taxDocRepo.update(taxDocumentId, {
          lastError: `Error en consulta ${pollAttempt + 1}: ${message}`,
        });
      }
      return;
    }

    await this.taxDocSvc.addEvent(taxDocumentId, {
      eventType: TaxDocumentEventType.STATUS_CHECKED,
      sriStatus: TaxDocumentStatus.IN_PROCESS,
      rawResponse: { rawXml: auth.rawXml } as Record<string, unknown>,
      metadata: { pollAttempt: pollAttempt + 1, sriState: auth.state },
    });

    if (auth.state === 'PPR') {
      if (pollAttempt + 1 >= MAX_POLL_ATTEMPTS) {
        this.logger.warn(`[POLL] Max intentos alcanzado invoice=${invoiceId}.`);
        await this.taxDocRepo.update(taxDocumentId, {
          lastError: `Sin respuesta definitiva del SRI tras ${MAX_POLL_ATTEMPTS} consultas`,
        });
        return;
      }
      await this.enqueueNextPoll(job.data, pollAttempt + 1);
      return;
    }

    if (auth.state === 'AUTORIZADO') {
      await this.taxDocSvc.transition({
        taxDocumentId,
        toStatus: TaxDocumentStatus.AUTHORIZED,
        updates: {
          authorizationNumber: auth.authorizationNumber,
          authorizedAt: auth.authorizedAt ?? new Date(),
          sriRawResponse: { rawXml: auth.rawXml } as object,
        },
        event: {
          eventType: TaxDocumentEventType.AUTHORIZED,
          rawResponse: { rawXml: auth.rawXml } as Record<string, unknown>,
          metadata: {
            authorizationNumber: auth.authorizationNumber,
            authorizedAt: auth.authorizedAt,
          },
        },
      });

      await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.AUTHORIZED });

      await this.rideQueue.add(
        JobName.GENERATE_RIDE,
        { invoiceId, taxDocumentId, companyId: job.data.companyId },
        {
          jobId: `ride-${invoiceId}`,
          attempts: 3,
          backoff: { type: 'fixed', delay: 5_000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.log(`[POLL] AUTORIZADO: invoice=${invoiceId} auth=${auth.authorizationNumber}`);
      return;
    }

    const errorStr = auth.messages.map((m) => m.message).join(' | ');
    await this.taxDocSvc.transition({
      taxDocumentId,
      toStatus: TaxDocumentStatus.REJECTED,
      updates: {
        lastError: errorStr,
        sriRawResponse: { rawXml: auth.rawXml } as object,
      },
      event: {
        eventType: TaxDocumentEventType.REJECTED,
        rawResponse: { rawXml: auth.rawXml } as Record<string, unknown>,
        errorDetail: errorStr,
      },
    });

    await this.invoiceRepo.update(invoiceId, { status: InvoiceStatus.REJECTED });
    this.logger.warn(`[POLL] NO AUTORIZADO: invoice=${invoiceId} | ${errorStr}`);
  }

  private async enqueueNextPoll(data: TransmitJobData, nextAttempt: number): Promise<void> {
    const delay = POLL_BASE_DELAY_MS * (nextAttempt + 1);
    await this.selfQueue.add(
      JobName.POLL_AUTHORIZATION,
      { ...data, pollAttempt: nextAttempt } as PollJobData,
      {
        jobId: `poll-${data.invoiceId}-${nextAttempt}`,
        delay,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
    this.logger.log(`[POLL] Próximo poll en ${delay}ms: invoice=${data.invoiceId} intento=${nextAttempt + 1}`);
  }
}