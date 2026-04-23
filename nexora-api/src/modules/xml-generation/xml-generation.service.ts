import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import Decimal from 'decimal.js';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { formatDateSri, parseDateLocal } from '../../common/utils/date.util';
import {
  SRI_XML_VERSION,
  DocumentType,
  TaxGroupCode,
  IVA_CODE_TO_RATE,
  SRI_CURRENCY,
  DEFAULT_PAYMENT_CODE,
  DEFAULT_TIME_UNIT,
} from '../../config/sri-config';

@Injectable()
export class XmlGenerationService {
  private readonly logger = new Logger(XmlGenerationService.name);

  async generateInvoiceXml(invoice: Invoice): Promise<string> {
    this.validateRelations(invoice);
    return this.build(invoice);
  }

  private validateRelations(invoice: Invoice): void {
    if (!invoice.company)       throw new Error('Factura sin empresa cargada');
    if (!invoice.customer)      throw new Error('Factura sin cliente cargado');
    if (!invoice.items?.length) throw new Error('Factura sin ítems cargados');
    if (!invoice.accessKey)     throw new Error('Factura sin clave de acceso');
    if (!invoice.sequential)    throw new Error('Factura sin número secuencial');
  }

  private build(invoice: Invoice): string {
    const { company, customer, items } = invoice;
    const [estab, ptoEmi, secuencial] = invoice.sequential!.split('-');

    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('factura', {
      id: 'comprobante',
      version: SRI_XML_VERSION,
    });

    this.buildInfoTributaria(doc, company, invoice, estab, ptoEmi, secuencial);
    this.buildInfoFactura(doc, company, customer, invoice, items);
    this.buildDetalles(doc, items);
    this.buildInfoAdicional(doc, customer, invoice);

    const xml = doc.end({ prettyPrint: false });
    this.logger.debug(`XML generado: ${invoice.sequential} (${xml.length} bytes)`);
    return xml;
  }

  private buildInfoTributaria(
    doc: any,
    company: any,
    invoice: Invoice,
    estab: string,
    ptoEmi: string,
    secuencial: string,
  ): void {
    const it = doc.ele('infoTributaria');
    it.ele('ambiente').txt(String(company.sriEnvironment));
    it.ele('tipoEmision').txt(String(company.emissionType));
    it.ele('razonSocial').txt(this.sanitize(company.businessName));
    it.ele('nombreComercial').txt(this.sanitize(company.tradeName ?? company.businessName));
    it.ele('ruc').txt(company.ruc);
    it.ele('claveAcceso').txt(invoice.accessKey!);
    it.ele('codDoc').txt(DocumentType.FACTURA);
    it.ele('estab').txt(estab ?? '001');
    it.ele('ptoEmi').txt(ptoEmi ?? '001');
    it.ele('secuencial').txt(secuencial ?? '000000001');
    it.ele('dirMatriz').txt(this.sanitize(company.address ?? ''));

    if (company.specialContributorCode) {
      it.ele('contribuyenteEspecial').txt(company.specialContributorCode);
    }
  }

  private buildInfoFactura(
    doc: any,
    company: any,
    customer: any,
    invoice: Invoice,
    items: InvoiceItem[],
  ): void {
    const inf = doc.ele('infoFactura');
    inf.ele('fechaEmision').txt(formatDateSri(parseDateLocal(invoice.issueDate)));
    inf.ele('dirEstablecimiento').txt(this.sanitize(company.establishmentAddress ?? company.address ?? ''));
    inf.ele('obligadoContabilidad').txt(company.obligadoContabilidad ? 'SI' : 'NO');
    inf.ele('tipoIdentificacionComprador').txt(String(customer.identificationType));
    inf.ele('razonSocialComprador').txt(this.sanitize(customer.fullName));
    inf.ele('identificacionComprador').txt(customer.identification);

    if (invoice.guiaRemision) {
      inf.ele('guiaRemision').txt(invoice.guiaRemision);
    }

    const totalSinImp = new Decimal(invoice.subtotalNoTax)
      .plus(invoice.subtotalTaxable)
      .toDecimalPlaces(2);

    inf.ele('totalSinImpuestos').txt(totalSinImp.toFixed(2));
    inf.ele('totalDescuento').txt(new Decimal(invoice.discountTotal).toDecimalPlaces(2).toFixed(2));

    this.buildTotalConImpuestos(inf, items);

    inf.ele('propina').txt('0.00');
    inf.ele('importeTotal').txt(new Decimal(invoice.total).toDecimalPlaces(2).toFixed(2));
    inf.ele('moneda').txt(SRI_CURRENCY);

    this.buildPagos(inf, invoice);
  }

  private buildTotalConImpuestos(inf: any, items: InvoiceItem[]): void {
    const tci = inf.ele('totalConImpuestos');
    for (const [ivaRate, group] of Object.entries(this.groupByIva(items))) {
      const ti = tci.ele('totalImpuesto');
      ti.ele('codigo').txt(TaxGroupCode.IVA);
      ti.ele('codigoPorcentaje').txt(ivaRate);
      ti.ele('descuentoAdicional').txt('0.00');
      ti.ele('baseImponible').txt(group.base.toFixed(2));
      ti.ele('valor').txt(group.tax.toFixed(2));
    }
  }

  private buildPagos(inf: any, invoice: Invoice): void {
    const pagos = inf.ele('pagos');
    const formasPago = invoice.paymentMethods?.length
      ? invoice.paymentMethods
      : [{ code: DEFAULT_PAYMENT_CODE, total: Number(invoice.total) }];

    for (const pago of formasPago) {
      const p = pagos.ele('pago');
      p.ele('formaPago').txt(String(pago.code));
      p.ele('total').txt(new Decimal(pago.total).toDecimalPlaces(2).toFixed(2));
      if (pago.term) {
        p.ele('plazo').txt(String(pago.term));
        p.ele('unidadTiempo').txt(pago.timeUnit ?? DEFAULT_TIME_UNIT);
      }
    }
  }

  private buildDetalles(doc: any, items: InvoiceItem[]): void {
    const dets = doc.ele('detalles');
    for (const item of items) {
      const d = dets.ele('detalle');
      d.ele('codigoPrincipal').txt(this.trunc(String(item.productCode), 25));

      if (item.auxiliaryCode) {
        d.ele('codigoAuxiliar').txt(this.trunc(item.auxiliaryCode, 25));
      }

      d.ele('descripcion').txt(this.sanitize(this.trunc(item.description, 300)));
      d.ele('cantidad').txt(new Decimal(item.quantity).toDecimalPlaces(6).toFixed(6));
      d.ele('precioUnitario').txt(new Decimal(item.unitPrice).toDecimalPlaces(6).toFixed(6));
      d.ele('descuento').txt(new Decimal(item.discount ?? 0).toDecimalPlaces(2).toFixed(2));
      d.ele('precioTotalSinImpuesto').txt(new Decimal(item.subtotal).toDecimalPlaces(2).toFixed(2));

      const imps = d.ele('impuestos').ele('impuesto');
      imps.ele('codigo').txt(TaxGroupCode.IVA);
      imps.ele('codigoPorcentaje').txt(String(item.ivaRate));
      imps.ele('tarifa').txt(IVA_CODE_TO_RATE[String(item.ivaRate)] ?? '0');
      imps.ele('baseImponible').txt(new Decimal(item.subtotal).toDecimalPlaces(2).toFixed(2));
      imps.ele('valor').txt(new Decimal(item.taxAmount).toDecimalPlaces(2).toFixed(2));
    }
  }

  private buildInfoAdicional(doc: any, customer: any, invoice: Invoice): void {
    const campos: Array<{ nombre: string; valor: string }> = [];
    if (customer.email)   campos.push({ nombre: 'email',         valor: customer.email });
    if (customer.phone)   campos.push({ nombre: 'telefono',      valor: customer.phone });
    if (customer.address) campos.push({ nombre: 'direccion',     valor: this.sanitize(customer.address) });
    if (invoice.notes)    campos.push({ nombre: 'observaciones', valor: this.sanitize(invoice.notes) });

    if (campos.length > 0) {
      const ia = doc.ele('infoAdicional');
      for (const c of campos) {
        ia.ele('campoAdicional', { nombre: c.nombre }).txt(c.valor);
      }
    }
  }

  private groupByIva(items: InvoiceItem[]): Record<string, { base: Decimal; tax: Decimal }> {
    const g: Record<string, { base: Decimal; tax: Decimal }> = {};
    for (const item of items) {
      const k = String(item.ivaRate);
      if (!g[k]) g[k] = { base: new Decimal(0), tax: new Decimal(0) };
      g[k].base = g[k].base.plus(item.subtotal);
      g[k].tax  = g[k].tax.plus(item.taxAmount);
    }
    return g;
  }

  private sanitize(s: string): string {
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;')
      .replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private trunc(s: string, max: number): string {
    return s.length > max ? s.substring(0, max) : s;
  }
}