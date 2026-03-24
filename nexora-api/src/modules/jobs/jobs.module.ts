// src/modules/jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueueName } from '../../common/enums/queue-name.enum';
import { SignDocumentProcessor } from './processors/sign-document.processor';
import { TransmitDocumentProcessor } from './processors/transmit-document.processor';
import { GenerateRideProcessor } from './processors/generate-ride.processor';

import { Invoice } from '../invoices/entities/invoice.entity';
import { TaxDocument } from '../tax-documents/entities/tax-document.entity';

import { XmlGenerationModule } from '../xml-generation/xml-generation.module';
import { SigningModule } from '../signing/signing.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { SriIntegrationModule } from '../sri-integration/sri-integration.module';
import { TaxDocumentsModule } from '../tax-documents/tax-documents.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, TaxDocument]),
    BullModule.registerQueue(
      {
        name: QueueName.DOCUMENT_SIGNING,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100 }, // conservar los últimos 100
          removeOnFail: false,
        },
      },
      {
        name: QueueName.DOCUMENT_TRANSMISSION,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: { count: 100 },
          removeOnFail: false,
        },
      },
      {
        name: QueueName.RIDE_GENERATION,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: { count: 100 },
          removeOnFail: false,
        },
      },
    ),
    XmlGenerationModule,
    SigningModule,
    CertificatesModule,
    SriIntegrationModule,
    TaxDocumentsModule,
    StorageModule,
  ],
  providers: [
    SignDocumentProcessor,
    TransmitDocumentProcessor,
    GenerateRideProcessor,
  ],
  exports: [BullModule],
})
export class JobsModule {}