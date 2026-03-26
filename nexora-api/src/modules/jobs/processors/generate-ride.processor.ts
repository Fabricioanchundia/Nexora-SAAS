import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import { StorageService } from '../../storage/storage.service';
import { RideService } from '../../ride/ride.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface GenerateRideJobData {
  invoiceId: string;
  taxDocumentId: string;
  companyId: string;
}

@Processor(QueueName.RIDE_GENERATION)
export class GenerateRideProcessor {
  private readonly logger = new Logger(GenerateRideProcessor.name);

  constructor(
    @InjectRepository(TaxDocument)
    private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly taxDocSvc: TaxDocumentsService,
    private readonly rideSvc: RideService,
    private readonly storageSvc: StorageService,
    private readonly notifSvc: NotificationsService,
  ) {}

  @Process(JobName.GENERATE_RIDE)
  async handle(job: Job<GenerateRideJobData>): Promise<void> {
    const { invoiceId, taxDocumentId, companyId } = job.data;
    this.logger.log(`Generando RIDE: invoice=${invoiceId}`);

    try {
      const invoice = await this.invoiceRepo.findOne({
        where: { id: invoiceId },
        relations: ['company', 'customer', 'items', 'taxDocument'],
      });
      if (!invoice) throw new Error(`Factura ${invoiceId} no encontrada`);
      if (!invoice.taxDocument?.authorizationNumber) {
        throw new Error('Factura no autorizada — no se puede generar RIDE');
      }

      const pdfBuffer = await this.rideSvc.generatePdf(invoice);
      const now = new Date();
      const pdfPath =
        `${companyId}/pdf/${now.getFullYear()}/` +
        `${String(now.getMonth() + 1).padStart(2, '0')}/` +
        `${invoice.accessKey}.pdf`;

      await this.storageSvc.upload(pdfPath, pdfBuffer);
      await this.taxDocRepo.update(taxDocumentId, {
        ridePdfPath: pdfPath,
        sriStatus: TaxDocumentStatus.AUTHORIZED,
      });
      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.RIDE_GENERATED,
        sriStatus: TaxDocumentStatus.AUTHORIZED,
        metadata: { pdfPath },
      });

      // Notificar al cliente si tiene email
      if (invoice.customer?.email && invoice.sequential) {
        const xmlBuf = invoice.taxDocument.signedXmlPath
          ? await this.storageSvc.download(invoice.taxDocument.signedXmlPath)
          : Buffer.alloc(0);

        await this.notifSvc.sendInvoiceToCustomer(
          invoice.customer.email,
          invoice.sequential,
          pdfBuffer,
          xmlBuf,
        );
        await this.taxDocSvc.addEvent(taxDocumentId, {
          eventType: TaxDocumentEventType.NOTIFICATION_SENT,
          metadata: { email: invoice.customer.email },
        });
      }

      this.logger.log(`RIDE generado: invoice=${invoiceId} path=${pdfPath}`);
    } catch (err) {
      this.logger.error(`Error generando RIDE invoice=${invoiceId}`, err.stack);
      await this.taxDocSvc.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.RIDE_FAILED,
        sriStatus: TaxDocumentStatus.AUTHORIZED, // autorización intacta
        errorDetail: err.message,
      });
      throw err;
    }
  }
}