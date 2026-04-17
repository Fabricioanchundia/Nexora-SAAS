import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { StorageModule } from '../storage/storage.module';
import { RideModule } from '../ride/ride.module';

import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { TaxDocument } from '../tax-documents/entities/tax-document.entity';
import { TaxDocumentEvent } from '../tax-documents/entities/tax-document-event.entity';
import { Company } from '../companies/entities/company.entity';
import { Customer } from '../customers/entities/customer.entity';

import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';

// ← Ahora vive en common/services (única fuente de verdad)
import { AccessKeyService } from '../../common/service/access-key.service';

// ← NUEVO: validador pre-SRI
import { InvoicePreValidatorService } from './validators/invoice-pre-validator.service';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CompaniesModule } from '../companies/companies.module';
import { QueueName } from '../../common/enums/queue-name.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      TaxDocument,
      TaxDocumentEvent,
      Company,
      Customer,
    ]),
    BullModule.registerQueue({ name: QueueName.DOCUMENT_SIGNING }),
    AuditLogsModule,
    CompaniesModule,
    StorageModule,
    RideModule,   // ← aquí, fuera del TypeOrmModule
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    AccessKeyService,
    InvoicePreValidatorService,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}