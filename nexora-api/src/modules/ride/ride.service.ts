import { Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Invoice } from '../invoices/entities/invoice.entity';

/**
 * Genera el RIDE (Representación Impresa del Documento Electrónico)
 * Formato según ficha técnica SRI Ecuador v2.26
 */
@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);

  async generatePdf(invoice: Invoice): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc    = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data',  (c) => chunks.push(c));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.renderHeader(doc, invoice);
        this.renderAuthInfo(doc, invoice);
        this.renderBuyerInfo(doc, invoice);
        this.renderItems(doc, invoice);
        this.renderTotals(doc, invoice);
        this.renderFooter(doc, invoice);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, inv: Invoice): void {
    const PAGE_W = doc.page.width - 80;

    // ─── Columna izquierda: logo / razón social ───────────────────────────
    doc.rect(40, 40, PAGE_W * 0.45, 80).stroke();
    doc.fontSize(11).font('Helvetica-Bold')
       .text(inv.company.businessName ?? '', 50, 50, { width: PAGE_W * 0.43, align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text(`Dir.: ${inv.company.address ?? ''}`, 50, 70, { width: PAGE_W * 0.43, align: 'center' });
    if (inv.company.phone)
       doc.text(`Tel.: ${inv.company.phone}`, 50, 83, { width: PAGE_W * 0.43, align: 'center' });

    // ─── Columna derecha: datos del comprobante ───────────────────────────
    const rx = 40 + PAGE_W * 0.5;
    doc.rect(rx, 40, PAGE_W * 0.5, 80).stroke();
    doc.fontSize(9).font('Helvetica-Bold')
       .text('RUC:', rx + 8, 50).font('Helvetica').text(inv.company.ruc, rx + 40, 50);
    doc.font('Helvetica-Bold').text('No.:', rx + 8, 62)
       .font('Helvetica').text(inv.sequential ?? '---', rx + 40, 62);
    doc.font('Helvetica-Bold').text('Tipo:', rx + 8, 74)
       .font('Helvetica').text('FACTURA', rx + 40, 74);

    doc.moveDown(5);
  }

  private renderAuthInfo(doc: PDFKit.PDFDocument, inv: Invoice): void {
    const y   = 130;
    const W   = doc.page.width - 80;

    doc.rect(40, y, W, 55).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('NÚMERO DE AUTORIZACIÓN', 48, y + 6);
    doc.fontSize(8).font('Helvetica')
       .text(inv.taxDocument?.authorizationNumber ?? 'PENDIENTE', 48, y + 17, { width: W - 16 });

    doc.font('Helvetica-Bold').text('CLAVE DE ACCESO', 48, y + 30);
    doc.font('Helvetica')
       .text(inv.accessKey ?? '', 48, y + 40, { width: W - 16, characterSpacing: 1 });

    const fechaAuth = inv.taxDocument?.authorizedAt
      ? new Date(inv.taxDocument.authorizedAt).toLocaleString('es-EC')
      : '';
    if (fechaAuth) {
      doc.font('Helvetica-Bold').text('Fecha/Hora Autorización: ', 48, y + 52, { continued: true })
         .font('Helvetica').text(fechaAuth);
    }

    doc.moveDown(7);
  }

  private renderBuyerInfo(doc: PDFKit.PDFDocument, inv: Invoice): void {
    const y = 195;
    const W = doc.page.width - 80;

    doc.rect(40, y, W, 45).stroke();
    doc.fontSize(9).font('Helvetica-Bold').text('DATOS DEL COMPRADOR', 48, y + 5);
    doc.fontSize(8).font('Helvetica-Bold').text('Razón Social:', 48, y + 17, { continued: true })
       .font('Helvetica').text(` ${inv.customer.fullName}`);
    doc.font('Helvetica-Bold')
       .text(`${inv.customer.identificationType}:`, 48, y + 28, { continued: true })
       .font('Helvetica').text(` ${inv.customer.identification}`);
    if (inv.customer.email)
       doc.font('Helvetica-Bold').text('Email:', 200, y + 28, { continued: true })
          .font('Helvetica').text(` ${inv.customer.email}`);

    const fechaEmision = new Date(inv.issueDate).toLocaleDateString('es-EC');
    doc.font('Helvetica-Bold').text('Fecha Emisión:', 48, y + 39, { continued: true })
       .font('Helvetica').text(` ${fechaEmision}`);

    doc.moveDown(6);
  }

  private renderItems(doc: PDFKit.PDFDocument, inv: Invoice): void {
    const y  = 250;
    const W  = doc.page.width - 80;
    const cols = { cod: 48, desc: 110, cant: 340, pu: 390, desc2: 440, total: 490 };

    // Cabecera tabla
    doc.rect(40, y, W, 16).fillAndStroke('#f3f4f6', '#000');
    doc.fillColor('#000').fontSize(7).font('Helvetica-Bold');
    doc.text('CÓDIGO',    cols.cod,   y + 4);
    doc.text('DESCRIPCIÓN', cols.desc, y + 4);
    doc.text('CANT.',     cols.cant,  y + 4);
    doc.text('P.UNIT',    cols.pu,    y + 4);
    doc.text('DESC.',     cols.desc2, y + 4);
    doc.text('TOTAL',     cols.total, y + 4);

    let currentY = y + 18;
    for (const item of inv.items ?? []) {
      const rowH = 14;
      if (currentY + rowH > doc.page.height - 120) {
        doc.addPage();
        currentY = 40;
      }
      doc.rect(40, currentY, W, rowH).stroke();
      doc.fontSize(7).font('Helvetica');
      doc.text(item.productCode ?? '',        cols.cod,   currentY + 3, { width: 58 });
      doc.text(item.description ?? '',         cols.desc,  currentY + 3, { width: 220 });
      doc.text(Number(item.quantity).toFixed(2),    cols.cant, currentY + 3, { width: 45, align: 'right' });
      doc.text(`$${Number(item.unitPrice).toFixed(4)}`, cols.pu, currentY + 3, { width: 45, align: 'right' });
      doc.text(`$${Number(item.discount).toFixed(2)}`,  cols.desc2, currentY + 3, { width: 45, align: 'right' });
      doc.text(`$${Number(item.subtotal).toFixed(2)}`,  cols.total, currentY + 3, { width: 50, align: 'right' });
      currentY += rowH;
    }

    doc.y = currentY + 4;
  }

  private renderTotals(doc: PDFKit.PDFDocument, inv: Invoice): void {
    const W    = doc.page.width - 80;
    const tx   = 40 + W * 0.6;
    const tw   = W * 0.4;
    let   y    = doc.y;

    const rows: [string, string][] = [
      ['Subtotal (sin impuestos)',  `$${new Decimal(inv.subtotalNoTax).toFixed(2)}`],
      ['Subtotal (base IVA)',       `$${new Decimal(inv.subtotalTaxable).toFixed(2)}`],
      ['IVA',                       `$${new Decimal(inv.taxAmount).toFixed(2)}`],
    ];
    if (Number(inv.discountTotal) > 0)
      rows.push(['Descuento total', `-$${new Decimal(inv.discountTotal).toFixed(2)}`]);
    rows.push(['TOTAL',             `$${new Decimal(inv.total).toFixed(2)}`]);

    for (const [label, value] of rows) {
      const isTotal = label === 'TOTAL';
      doc.rect(tx, y, tw, 14).fillAndStroke(isTotal ? '#1a56db' : '#fff', '#000');
      doc.fillColor(isTotal ? '#fff' : '#000')
         .fontSize(isTotal ? 9 : 7)
         .font(isTotal ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(label,  tx + 6, y + 3);
      doc.text(value, tx + tw - 60, y + 3, { width: 55, align: 'right' });
      doc.fillColor('#000');
      y += 14;
    }

    doc.y = y + 8;
  }

  private renderFooter(doc: PDFKit.PDFDocument, inv: Invoice): void {
    const y = doc.page.height - 90;
    const W = doc.page.width - 80;

    doc.fontSize(7).font('Helvetica').fillColor('#6b7280');
    doc.text('Ambiente: ' + (inv.company.sriEnvironment === 'PRODUCTION' ? 'PRODUCCIÓN' : 'PRUEBAS'),
      40, y, { width: W });
    doc.text('Este documento es una representación impresa del comprobante electrónico autorizado por el SRI.',
      40, y + 10, { width: W });
    doc.text(`Generado por Nexora Facturación Electrónica | ${new Date().toLocaleString('es-EC')}`,
      40, y + 20, { width: W });
    doc.fillColor('#000');
  }
}
