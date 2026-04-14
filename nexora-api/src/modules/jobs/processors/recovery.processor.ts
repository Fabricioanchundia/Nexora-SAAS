// src/modules/jobs/processors/recovery.processor.ts
//
// CAMBIO vs versión anterior:
// - Usa SriStateMachine.needsAutoRecovery(status, retryCount) con límites por estado
// - Usa SriStateMachine.needsManualReview() para clasificar correctamente
// - Separa recovery de sriStatus vs recovery de postStatus (RIDE fallido)
// - Logs detallados por tipo de recovery

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { SriStatus, PostStatus } from '../../../common/enums/tax-document-status.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import {
  SriStateMachine,
  PostStateMachine,
} from '../../../common/states/invoice-state.machine';

const STUCK_THRESHOLD_MINUTES = 20;

@Processor(QueueName.RECOVERY)
export class RecoveryProcessor {
  private readonly logger = new Logger(RecoveryProcessor.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(TaxDocument)
    private readonly taxDocRepo: Repository<TaxDocument>,
    private readonly taxDocSvc: TaxDocumentsService,
    @InjectQueue(QueueName.DOCUMENT_SIGNING)
    private readonly signingQueue: Queue,
    @InjectQueue(QueueName.RIDE_GENERATION)
    private readonly rideQueue: Queue,
  ) {}

  @Process(JobName.RECOVER_STUCK)
  async handle(): Promise<void> {
    this.logger.log('[RECOVERY] Iniciando búsqueda de documentos atascados...');

    await Promise.all([
      this.recoverSriStuck(),
      this.recoverPostStuck(),
    ]);
  }

  // ─── Recovery de documentos atascados en flujo fiscal ──────────────────
  private async recoverSriStuck(): Promise<void> {
    const docs = await this.taxDocSvc.findStuck(STUCK_THRESHOLD_MINUTES);

    let autoRetried = 0;
    let manualReview = 0;

    for (const doc of docs) {
      const strategy = SriStateMachine.needsAutoRecovery(doc.sriStatus, doc.sriRetryCount)
        ? 'AUTO_RETRY'
        : 'MANUAL_REVIEW';

      if (strategy === 'AUTO_RETRY') {
        await this.retryFiscal(doc);
        autoRetried++;
      } else {
        await this.markManualReview(doc);
        manualReview++;
      }
    }

    if (docs.length > 0) {
      this.logger.log(
        `[RECOVERY FISCAL] ${docs.length} docs: ${autoRetried} re-encolados, ${manualReview} a revisión manual`,
      );
    }
  }

  // ─── Recovery de documentos con RIDE fallido ────────────────────────────
  // El sriStatus sigue siendo AUTHORIZED (no lo tocamos)
  // Solo el postStatus falla → recovery independiente
  private async recoverPostStuck(): Promise<void> {
    const docs = await this.taxDocRepo.find({
      where: [
        { postStatus: PostStatus.RIDE_FAILED },
        { postStatus: PostStatus.DELIVERY_FAILED },
      ],
    });

    // Filtrar los que aún pueden reintentarse automáticamente
    const retryable = docs.filter((d) =>
      PostStateMachine.needsAutoRecovery(
        d.postStatus!,
        d.postRetryCount,
      ),
    );

    for (const doc of retryable) {
      await this.rideQueue.add(
        JobName.GENERATE_RIDE,
        { invoiceId: doc.invoiceId, taxDocumentId: doc.id, companyId: doc.environment },
        {
          jobId: `ride-recovery-${doc.id}-${Date.now()}`,
          attempts: 3,
          backoff: { type: 'fixed', delay: 5_000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      await this.taxDocRepo.update(doc.id, {
        postStatus: PostStatus.PENDING_RIDE,
        postRetryCount: doc.postRetryCount + 1,
      });

      this.logger.log(
        `[RECOVERY POST] RIDE re-encolado: taxDoc=${doc.id} intento=${doc.postRetryCount + 1}`,
      );
    }
  }

  private async retryFiscal(doc: TaxDocument): Promise<void> {
    try {
      await this.signingQueue.add(
        JobName.SIGN_DOCUMENT,
        {
          invoiceId: doc.invoiceId,
          taxDocumentId: doc.id,
          companyId: doc.environment ?? 'unknown',
        },
        {
          jobId: `sign-${doc.invoiceId}-recovery-${Date.now()}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      await this.invoiceRepo.update(doc.invoiceId, {
        status: InvoiceStatus.PENDING,
      });

      await this.taxDocSvc.addEvent(doc.id, {
        eventType: TaxDocumentEventType.RETRY_SCHEDULED,
        sriStatus: SriStatus.PENDING_SIGN,
        metadata: {
          autoRecovery: true,
          previousStatus: doc.sriStatus,
          sriRetryCount: doc.sriRetryCount + 1,
        },
      });

      await this.taxDocRepo.update(doc.id, {
        sriStatus: SriStatus.PENDING_SIGN,
        sriRetryCount: doc.sriRetryCount + 1,
      });
    } catch (err) {
      this.logger.error(
        `[RECOVERY] Error re-encolando taxDoc=${doc.id}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private async markManualReview(doc: TaxDocument): Promise<void> {
    await this.invoiceRepo.update(doc.invoiceId, {
      status: InvoiceStatus.ERROR,
    });

    await this.taxDocSvc.addEventSafe(doc.id, {
      eventType: TaxDocumentEventType.RETRY_SCHEDULED,
      sriStatus: doc.sriStatus,
      errorDetail: `Max reintentos automáticos agotados (${doc.sriRetryCount}). Requiere revisión manual.`,
      metadata: {
        autoRecovery: false,
        sriRetryCount: doc.sriRetryCount,
        maxRetries: SriStateMachine.getMaxRetries(doc.sriStatus),
      },
    });

    this.logger.warn(
      `[RECOVERY] Marcado revisión manual: taxDoc=${doc.id} ` +
        `status=${doc.sriStatus} intentos=${doc.sriRetryCount}`,
    );
  }
}