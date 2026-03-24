import { Injectable, Logger } from '@nestjs/common';
import { Invoice } from '../invoices/entities/invoice.entity';
import Decimal from 'decimal.js';

// ⚠️ PENDIENTE — El formato del RIDE oficial está en la ficha técnica del SRI.
// Este PDF es básico — implementar con el diseño oficial antes de producción.
@Injectable()
export class RideService {
    private readonly logger = new Logger(RideService.name);

    async generatePdf(invoice: Invoice): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

      // Encabezado
        doc.fontSize(14).text(invoice.company.businessName, { align: 'center' });
        doc.fontSize(10).text(`RUC: ${invoice.company.ruc}`, { align: 'center' });
        doc.text(`Dirección: ${invoice.company.address}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text('FACTURA ELECTRÓNICA', { align: 'center', underline: true });
        doc.fontSize(10);
        doc.text(`Número: ${invoice.sequential}`);
        doc.text(`Clave de acceso: ${invoice.accessKey}`);
        if (invoice.taxDocument?.authorizationNumber) {
        doc.text(`Autorización No.: ${invoice.taxDocument.authorizationNumber}`);
        doc.text(
            `Fecha autorización: ${new Date(invoice.taxDocument.authorizedAt).toLocaleString('es-EC')}`,
        );
        }
        doc.text(
        `Fecha emisión: ${new Date(invoice.issueDate).toLocaleDateString('es-EC')}`,
        );
        doc.moveDown();

      // Comprador
        doc.text('─── DATOS DEL COMPRADOR ───');
        doc.text(`Razón social / Nombre: ${invoice.customer.fullName}`);
        doc.text(
        `Identificación (${invoice.customer.identificationType}): ${invoice.customer.identification}`,
        );
        if (invoice.customer.address) doc.text(`Dirección: ${invoice.customer.address}`);
        doc.moveDown();

      // Detalle
        doc.text('─── DETALLE ───');
        for (const item of invoice.items || []) {
        doc.text(
            `${item.description} | Cant: ${item.quantity} | P.Unit: $${Number(item.unitPrice).toFixed(2)} | Total: $${Number(item.subtotal).toFixed(2)}`,
            { indent: 10 },
        );
        }
        doc.moveDown();

      // Totales
        doc.text('─── TOTALES ───');
        doc.text(`Subtotal (0%): $${new Decimal(invoice.subtotalNoTax).toFixed(2)}`);
        doc.text(`Subtotal (IVA): $${new Decimal(invoice.subtotalTaxable).toFixed(2)}`);
        doc.text(`IVA: $${new Decimal(invoice.taxAmount).toFixed(2)}`);
        if (Number(invoice.discountTotal) > 0) {
        doc.text(`Descuento: -$${new Decimal(invoice.discountTotal).toFixed(2)}`);
        }
        doc.fontSize(12).text(`TOTAL: $${new Decimal(invoice.total).toFixed(2)}`, {
        underline: true,
        });

      // ⚠️ Pendiente: agregar código QR con clave de acceso (requerido por SRI)

        doc.end();
    });
    }
}