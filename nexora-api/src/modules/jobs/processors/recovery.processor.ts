// src/modules/jobs/processors/recovery.processor.ts
// Job de recuperación — detecta facturas atascadas y las re-encola
// Ejecutar cada 15 minutos via cron o job recurrente
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';

const STUCK_THRESHOLD_MINUTES = 20;
const MAX_AUTO_RETRIES = 3;

@Processor(QueueName.RECOVERY)
export class RecoveryProcessor {
    private readonly logger = new Logger(RecoveryProcessor.name);

    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepo: Repository<Invoice>,
        private readonly taxDocSvc: TaxDocumentsService,
        @InjectQueue(QueueName.DOCUMENT_SIGNING)
        private readonly signingQueue: Queue,
    ) {}

    @Process(JobName.RECOVER_STUCK)
        async handleRecovery(): Promise<void> {
        this.logger.log('[RECOVERY] Buscando facturas atascadas...');

    const stuckDocs = await this.taxDocSvc.findStuck(STUCK_THRESHOLD_MINUTES);

    if (stuckDocs.length === 0) {
        this.logger.log('[RECOVERY] No hay facturas atascadas');
        return;
    }

    this.logger.warn(
        `[RECOVERY] Encontradas ${stuckDocs.length} facturas atascadas`,
    );

    let recovered = 0;
    let abandoned = 0;

    for (const doc of stuckDocs) {
        try {
            if (doc.retryCount >= MAX_AUTO_RETRIES) {
          // Demasiados reintentos — marcar como ERROR para revisión manual
            await this.invoiceRepo.update(doc.invoiceId, {
            status: InvoiceStatus.ERROR,
            });
            await this.taxDocSvc.addEvent(doc.id, {
                eventType: TaxDocumentEventType.RETRY_SCHEDULED,
                sriStatus: doc.sriStatus,
                errorDetail: `Max reintentos automáticos (${MAX_AUTO_RETRIES}) alcanzado. Requiere revisión manual.`,
                metadata: { retryCount: doc.retryCount, autoRecovery: false },
            });
            abandoned++;
            continue;
        }

        // Re-encolar desde el inicio (sign-document)
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
            sriStatus: TaxDocumentStatus.PENDING_SIGN,
            metadata: {
            retryCount: doc.retryCount + 1,
            autoRecovery: true,
            previousStatus: doc.sriStatus,
            },
        });

        recovered++;
        this.logger.log(
            `[RECOVERY] Re-encolada: invoice=${doc.invoiceId}`,
        );
        } catch (err) {
        this.logger.error(
            `[RECOVERY] Error procesando invoice=${doc.invoiceId}`,
            err instanceof Error ? err.message : String(err),
        );
        }
    }

    this.logger.log(
        `[RECOVERY] Completado: ${recovered} recuperadas, ${abandoned} abandonadas`,
    );
    }
}