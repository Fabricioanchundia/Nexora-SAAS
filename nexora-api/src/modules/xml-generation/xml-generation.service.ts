import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { Invoice } from '../invoices/entities/invoice.entity';
import Decimal from 'decimal.js';
import { formatDateSri } from '../../common/utils/date.util';

// ⚠️ PENDIENTE — verificar estructura completa con ficha técnica SRI vigente
@Injectable()
export class XmlGenerationService {
  private readonly logger = new Logger(XmlGenerationService.name);
  private readonly SCHEMA_VERSION = '2.1.0'; // ⚠️ verificar versión vigente

  async generateInvoiceXml(invoice: Invoice): Promise<string> {
    if (!invoice.customer || !invoice.items || !invoice.company) {
      throw new Error('La factura requiere customer, items y company cargados');
    }
    return this.buildXml(invoice);
  }

  private buildXml(invoice: Invoice): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('factura', {
      id: 'comprobante',
      version: this.SCHEMA_VERSION,
    });

    // ─── infoTributaria ──────────────────────────────────────────
    const info = doc.ele('infoTributaria');
    info.ele('ambiente').txt(invoice.company.sriEnvironment);       // ⚠️ verificar
    info.ele('tipoEmision').txt(invoice.company.emissionType);      // ⚠️ verificar
    info.ele('razonSocial').txt(invoice.company.businessName);
    info.ele('nombreComercial').txt(invoice.company.tradeName || invoice.company.businessName);
    info.ele('ruc').txt(invoice.company.ruc);
    info.ele('claveAcceso').txt(invoice.accessKey);
    info.ele('codDoc').txt('01');                                    // ⚠️ verificar código factura
    info.ele('estab').txt(invoice.company.establishmentCode);
    info.ele('ptoEmi').txt(invoice.company.emissionPoint);
    info.ele('secuencial').txt(invoice.sequential.split('-')[2]);
    info.ele('dirMatriz').txt(invoice.company.address);

    // ─── infoFactura ─────────────────────────────────────────────
    const fact = doc.ele('infoFactura');
    fact.ele('fechaEmision').txt(formatDateSri(new Date(invoice.issueDate)));
    fact.ele('dirEstablecimiento').txt(invoice.company.address);
    fact.ele('obligadoContabilidad').txt('NO');                     // ⚠️ parametrizar por empresa
    fact.ele('tipoIdentificacionComprador').txt(invoice.customer.identificationType);
    fact.ele('razonSocialComprador').txt(invoice.customer.fullName);
    fact.ele('identificacionComprador').txt(invoice.customer.identification);
    fact.ele('totalSinImpuestos').txt(
      new Decimal(invoice.subtotalNoTax).plus(invoice.subtotalTaxable).toFixed(2),
    );
    fact.ele('totalDescuento').txt(new Decimal(invoice.discountTotal).toFixed(2));

    const totalImp = fact.ele('totalConImpuestos');
    if (Number(invoice.subtotalTaxable) > 0) {
      const ti = totalImp.ele('totalImpuesto');
      ti.ele('codigo').txt('2');             // ⚠️ código IVA — verificar
      ti.ele('codigoPorcentaje').txt('2');   // ⚠️ 12% — verificar tarifa vigente
      ti.ele('baseImponible').txt(new Decimal(invoice.subtotalTaxable).toFixed(2));
      ti.ele('valor').txt(new Decimal(invoice.taxAmount).toFixed(2));
    }

    fact.ele('propina').txt('0.00');
    fact.ele('importeTotal').txt(new Decimal(invoice.total).toFixed(2));
    fact.ele('moneda').txt('DOLAR');

    // ─── detalles ─────────────────────────────────────────────────
    const detalles = doc.ele('detalles');
    for (const item of invoice.items) {
      const d = detalles.ele('detalle');
      d.ele('codigoPrincipal').txt(String(item.productCode).substring(0, 25));
      d.ele('descripcion').txt(String(item.description).substring(0, 300));
      d.ele('cantidad').txt(new Decimal(item.quantity).toFixed(6));
      d.ele('precioUnitario').txt(new Decimal(item.unitPrice).toFixed(6));
      d.ele('descuento').txt(new Decimal(item.discount).toFixed(2));
      d.ele('precioTotalSinImpuesto').txt(new Decimal(item.subtotal).toFixed(2));
      const imp = d.ele('impuestos').ele('impuesto');
      imp.ele('codigo').txt('2');
      imp.ele('codigoPorcentaje').txt(item.ivaRate);
      imp.ele('tarifa').txt(this.ivaPercent(item.ivaRate));
      imp.ele('baseImponible').txt(new Decimal(item.subtotal).toFixed(2));
      imp.ele('valor').txt(new Decimal(item.taxAmount).toFixed(2));
    }

    // ─── infoAdicional ────────────────────────────────────────────
    if (invoice.customer.email || invoice.customer.phone) {
      const extra = doc.ele('infoAdicional');
      if (invoice.customer.email) {
        extra.ele('campoAdicional', { nombre: 'email' }).txt(invoice.customer.email);
      }
      if (invoice.customer.phone) {
        extra.ele('campoAdicional', { nombre: 'telefono' }).txt(invoice.customer.phone);
      }
    }

    return doc.end({ prettyPrint: false });
  }

  // ⚠️ Verificar porcentajes vigentes con SRI
  private ivaPercent(rate: string): string {
    const m: Record<string, string> = {
      '0': '0', '2': '12', '3': '15', '6': '0', '7': '0',
    };
    return m[rate] ?? '0';
  }
}