import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxDocument } from './entities/tax-document.entity';
import { TaxDocumentEvent } from './entities/tax-document-event.entity';
import { TaxDocumentsService } from './tax-documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaxDocument, TaxDocumentEvent])],
  providers: [TaxDocumentsService],
  exports: [TaxDocumentsService, TypeOrmModule],
})
export class TaxDocumentsModule {}
