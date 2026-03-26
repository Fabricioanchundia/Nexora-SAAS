// src/modules/jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { QueueName } from '../../common/enums/queue-name.enum';
import { SignDocumentProcessor } from './processors/sign-document.processor';
import { TransmitDocumentProcessor } from './processors/transmit-document.processor';
import { GenerateRideProcessor } from './processors/generate-ride.processor';
import { RecoveryProcessor } from './processors/recovery.processor';
import { RecoveryScheduler } from './schedulers/recovery.scheduler';

import { Invoice } from '../invoices/entities/invoice.entity';
import { TaxDocument } from '../tax-documents/entities/tax-document.entity';
import { TaxDocumentEvent } from '../tax-documents/entities/tax-document-event.entity';

import { XmlGenerationModule } from '../xml-generation/xml-generation.module';
import { SigningModule } from '../signing/signing.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { SriIntegrationModule } from '../sri-integration/sri-integration.module';
import { TaxDocumentsModule } from '../tax-documents/tax-documents.module';
import { StorageModule } from '../storage/storage.module';
import { RideModule } from '../ride/ride.module';
import { NotificationsModule } from '../notifications/notifications.module';

const DEFAULT_JOB_OPTS = {
  removeOnComplete: { count: 200, age: 7 * 24 * 60 * 60 }, // 200 jobs o 7 días
  removeOnFail: false,
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Invoice, TaxDocument, TaxDocumentEvent]),

    // ─── Queues ──────────────────────────────────────────────────────────────
    BullModule.registerQueue(
      {
        name: QueueName.DOCUMENT_SIGNING,
        defaultJobOptions: {
          ...DEFAULT_JOB_OPTS,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      },
      {
        name: QueueName.DOCUMENT_TRANSMISSION,
        defaultJobOptions: {
          ...DEFAULT_JOB_OPTS,
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
        },
      },
      {
        name: QueueName.RIDE_GENERATION,
        defaultJobOptions: {
          ...DEFAULT_JOB_OPTS,
          attempts: 3,
          backoff: { type: 'fixed', delay: 5_000 },
        },
      },
      {
        name: QueueName.RECOVERY,
        defaultJobOptions: {
          ...DEFAULT_JOB_OPTS,
          attempts: 1,
        },
      },
    ),

    XmlGenerationModule,
    SigningModule,
    CertificatesModule,
    SriIntegrationModule,
    TaxDocumentsModule,
    StorageModule,
    RideModule,
    NotificationsModule,
  ],
  providers: [
    SignDocumentProcessor,
    TransmitDocumentProcessor,
    GenerateRideProcessor,
    RecoveryProcessor,
    RecoveryScheduler,
  ],
})
export class JobsModule {}