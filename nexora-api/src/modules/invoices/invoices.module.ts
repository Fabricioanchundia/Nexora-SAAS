import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { TaxDocument } from '../tax-documents/entities/tax-document.entity';
import { TaxDocumentEvent } from '../tax-documents/entities/tax-document-event.entity';
import { Company } from '../companies/entities/company.entity';
import { Customer } from '../customers/entities/customer.entity';

import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AccessKeyService } from './access-key.service';  // ← nuevo

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
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    AccessKeyService,  // ← registrar como provider
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}