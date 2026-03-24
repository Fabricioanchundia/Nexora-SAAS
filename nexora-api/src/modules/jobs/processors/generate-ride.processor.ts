// src/modules/jobs/processors/generate-ride.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import * as PDFDocument from 'pdfkit';

import { QueueName, JobName } from '../../../common/enums/queue-name.enum';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { TaxDocumentEventType } from '../../tax-documents/entities/tax-document-event.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentsService } from '../../tax-documents/tax-documents.service';
import { StorageService } from '../../storage/storage.service';

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
    private readonly taxDocumentsService: TaxDocumentsService,
    private readonly storageService: StorageService,
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
        throw new Error('Factura no autorizada, no se puede generar RIDE');
      }

      // Generar PDF
      // ⚠️ El formato del RIDE está definido en la ficha técnica del SRI.
      // Esta es una implementación básica. El RIDE real debe incluir:
      // - Datos del emisor con logo
      // - Datos del receptor
      // - Detalle de ítems en tabla
      // - Totales e impuestos
      // - Número de autorización y código QR
      // - Código de barras de la clave de acceso
      // Todo según el formato oficial del SRI.
      const pdfBuffer = await this.generateRidePdf(invoice);

      const pdfPath = `${companyId}/pdf/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${invoice.accessKey}.pdf`;
      await this.storageService.upload(pdfPath, pdfBuffer);

      await this.taxDocRepo.update(taxDocumentId, {
        ridePdfPath: pdfPath,
        sriStatus: TaxDocumentStatus.RIDE_GENERATED,
      });

      await this.taxDocumentsService.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.RIDE_GENERATED,
        sriStatus: TaxDocumentStatus.RIDE_GENERATED,
        metadata: { pdfPath },
      });

      this.logger.log(`RIDE generado: invoice=${invoiceId}`);
    } catch (error) {
      this.logger.error(
        `Error generando RIDE: invoice=${invoiceId}`,
        error.stack,
      );

      await this.taxDocumentsService.addEvent(taxDocumentId, {
        eventType: TaxDocumentEventType.RIDE_FAILED,
        sriStatus: TaxDocumentStatus.AUTHORIZED, // la autorización no se pierde
        errorDetail: error.message,
      });

      // El RIDE es importante pero no bloquea la autorización
      // Reintentará por la configuración de BullMQ
      throw error;
    }
  }

  // ⚠️ PENDIENTE — Implementar según formato oficial RIDE del SRI Ecuador
  private generateRidePdf(invoice: Invoice): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ─── Encabezado ──────────────────────────────────────────────────────
      doc
        .fontSize(16)
        .text(invoice.company.businessName, { align: 'center' });
      doc.fontSize(10).text(`RUC: ${invoice.company.ruc}`, { align: 'center' });
      doc.text(`Dirección: ${invoice.company.address}`, { align: 'center' });
      doc.moveDown();

      // Datos del comprobante
      doc.fontSize(12).text('FACTURA', { align: 'center', underline: true });
      doc.fontSize(10).text(`No.: ${invoice.sequential}`);
      doc.text(`Clave de acceso: ${invoice.accessKey}`);
      doc.text(
        `Autorización: ${invoice.taxDocument?.authorizationNumber ?? 'N/A'}`,
      );
      doc.text(
        `Fecha emisión: ${new Date(invoice.issueDate).toLocaleDateString('es-EC')}`,
      );
      doc.moveDown();

      // ─── Datos del receptor ───────────────────────────────────────────────
      doc.text(`Receptor: ${invoice.customer.fullName}`);
      doc.text(
        `Identificación: ${invoice.customer.identificationType} - ${invoice.customer.identification}`,
      );
      if (invoice.customer.address) {
        doc.text(`Dirección: ${invoice.customer.address}`);
      }
      doc.moveDown();

      // ─── Detalle de ítems ─────────────────────────────────────────────────
      doc.text('DETALLE', { underline: true });
      for (const item of invoice.items) {
        doc.text(
          `${item.description} | Cant: ${item.quantity} | P.Unit: $${Number(item.unitPrice).toFixed(2)} | Total: $${Number(item.subtotal).toFixed(2)}`,
        );
      }
      doc.moveDown();

      // ─── Totales ──────────────────────────────────────────────────────────
      doc.text(`Subtotal 0%: $${Number(invoice.subtotalNoTax).toFixed(2)}`);
      doc.text(`Subtotal IVA: $${Number(invoice.subtotalTaxable).toFixed(2)}`);
      doc.text(`IVA: $${Number(invoice.taxAmount).toFixed(2)}`);
      doc
        .fontSize(12)
        .text(`TOTAL: $${Number(invoice.total).toFixed(2)}`, { bold: true });

      // ⚠️ Agregar código QR con la clave de acceso (requerido por SRI)
      // Usar librería qrcode para generar el QR de la clave de acceso

      doc.end();
    });
  }
}