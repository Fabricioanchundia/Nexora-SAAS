import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueName } from '../../common/enums/queue-name.enum';
import { SignDocumentProcessor } from './processors/sign-document.processor';
import { TransmitDocumentProcessor } from './processors/transmit-document.processor';
import { GenerateRideProcessor } from './processors/generate-ride.processor';
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

const QUEUE_OPTS = { removeOnComplete: { count: 100 }, removeOnFail: false };

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, TaxDocument, TaxDocumentEvent]),
    BullModule.registerQueue(
      {
        name: QueueName.DOCUMENT_SIGNING,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          ...QUEUE_OPTS,
        },
      },
      {
        name: QueueName.DOCUMENT_TRANSMISSION,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
          ...QUEUE_OPTS,
        },
      },
      {
        name: QueueName.RIDE_GENERATION,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
          ...QUEUE_OPTS,
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
  providers: [SignDocumentProcessor, TransmitDocumentProcessor, GenerateRideProcessor],
})
export class JobsModule {}