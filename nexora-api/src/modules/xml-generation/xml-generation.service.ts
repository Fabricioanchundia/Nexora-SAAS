import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import Decimal from 'decimal.js';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { IVA_TARIFA } from '../../common/enums/tax-code.enum';
import { formatDateSri } from '../../common/utils/date.util';

const FACTURA_VERSION = '2.1.0';
const COD_DOC_FACTURA = '01';

@Injectable()
export class XmlGenerationService {
  private readonly logger = new Logger(XmlGenerationService.name);

  async generateInvoiceXml(invoice: Invoice): Promise<string> {
    this.validateRelations(invoice);
    return this.buildFacturaXml(invoice);
  }

  private validateRelations(invoice: Invoice): void {
    if (!invoice.company) throw new Error('Factura sin empresa cargada');
    if (!invoice.customer) throw new Error('Factura sin cliente cargado');
    if (!invoice.items?.length) throw new Error('Factura sin ítems cargados');
    if (!invoice.accessKey) throw new Error('Factura sin clave de acceso');
    // ← FIX: validar sequential antes de usarlo
    if (!invoice.sequential) throw new Error('Factura sin número secuencial');
  }

  private buildFacturaXml(invoice: Invoice): string {
    const { company, customer, items } = invoice;

    // ← FIX: sequential ya está validado en validateRelations, el ! es seguro
    const sequential = invoice.sequential!;
    const parts = sequential.split('-');
    const estab = parts[0] ?? '001';
    const ptoEmi = parts[1] ?? '001';
    const secuencial = parts[2] ?? '000000001';

    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('factura', {
      id: 'comprobante',
      version: FACTURA_VERSION,
    });

    // ─── infoTributaria ───────────────────────────────────────────────────
    const infoTrib = doc.ele('infoTributaria');
    infoTrib.ele('ambiente').txt(String(company.sriEnvironment));
    infoTrib.ele('tipoEmision').txt(String(company.emissionType));
    infoTrib.ele('razonSocial').txt(this.sanitize(company.businessName));
    infoTrib
      .ele('nombreComercial')
      .txt(this.sanitize(company.tradeName ?? company.businessName));
    infoTrib.ele('ruc').txt(company.ruc);
    // ← accessKey validado en validateRelations
    infoTrib.ele('claveAcceso').txt(invoice.accessKey!);
    infoTrib.ele('codDoc').txt(COD_DOC_FACTURA);
    infoTrib.ele('estab').txt(estab);
    infoTrib.ele('ptoEmi').txt(ptoEmi);
    infoTrib.ele('secuencial').txt(secuencial);
    // ← FIX: address puede venir como null en la entidad — usar fallback
    infoTrib.ele('dirMatriz').txt(this.sanitize(company.address ?? ''));

    if (company.specialContributorCode) {
      infoTrib
        .ele('contribuyenteEspecial')
        .txt(company.specialContributorCode);
    }

    // ─── infoFactura ──────────────────────────────────────────────────────
    const infoFact = doc.ele('infoFactura');
    infoFact
      .ele('fechaEmision')
      .txt(formatDateSri(new Date(invoice.issueDate)));
    infoFact
      .ele('dirEstablecimiento')
      .txt(
        this.sanitize(company.establishmentAddress ?? company.address ?? ''),
      );
    infoFact
      .ele('obligadoContabilidad')
      .txt(company.obligadoContabilidad ? 'SI' : 'NO');
    infoFact
      .ele('tipoIdentificacionComprador')
      .txt(String(customer.identificationType));
    infoFact
      .ele('razonSocialComprador')
      .txt(this.sanitize(customer.fullName));
    infoFact.ele('identificacionComprador').txt(customer.identification);

    if (invoice.guiaRemision) {
      infoFact.ele('guiaRemision').txt(invoice.guiaRemision);
    }

    const totalSinImpuestos = new Decimal(invoice.subtotalNoTax)
      .plus(invoice.subtotalTaxable)
      .toDecimalPlaces(2);

    infoFact.ele('totalSinImpuestos').txt(totalSinImpuestos.toFixed(2));
    infoFact
      .ele('totalDescuento')
      .txt(
        new Decimal(invoice.discountTotal).toDecimalPlaces(2).toFixed(2),
      );

    // totalConImpuestos agrupado por tarifa
    const totalConImp = infoFact.ele('totalConImpuestos');
    const ivaGroups = this.groupByIvaRate(items);

    for (const [ivaRate, group] of Object.entries(ivaGroups)) {
      const ti = totalConImp.ele('totalImpuesto');
      ti.ele('codigo').txt('2');
      ti.ele('codigoPorcentaje').txt(ivaRate);
      ti.ele('descuentoAdicional').txt('0.00');
      ti.ele('baseImponible').txt(group.base.toFixed(2));
      ti.ele('valor').txt(group.tax.toFixed(2));
    }

    infoFact.ele('propina').txt('0.00');
    infoFact
      .ele('importeTotal')
      .txt(new Decimal(invoice.total).toDecimalPlaces(2).toFixed(2));
    infoFact.ele('moneda').txt('DOLAR');

    // pagos — si no se especifica usa '01' (sin sistema financiero)
    const pagos = infoFact.ele('pagos');
    const formasPago = invoice.paymentMethods?.length
      ? invoice.paymentMethods
      : [{ code: '01', total: Number(invoice.total), term: 0, timeUnit: 'dias' }];

    for (const pago of formasPago) {
      const p = pagos.ele('pago');
      p.ele('formaPago').txt(String(pago.code));
      p.ele('total').txt(
        new Decimal(pago.total).toDecimalPlaces(2).toFixed(2),
      );
      if (pago.term) {
        p.ele('plazo').txt(String(pago.term));
        p.ele('unidadTiempo').txt(pago.timeUnit ?? 'dias');
      }
    }

    // ─── detalles ─────────────────────────────────────────────────────────
    const detalles = doc.ele('detalles');
    for (const item of items) {
      const d = detalles.ele('detalle');
      d.ele('codigoPrincipal').txt(this.trunc(String(item.productCode), 25));

      // auxiliaryCode ahora existe en InvoiceItem
      if (item.auxiliaryCode) {
        d.ele('codigoAuxiliar').txt(this.trunc(item.auxiliaryCode, 25));
      }

      d.ele('descripcion').txt(
        this.sanitize(this.trunc(item.description, 300)),
      );
      d.ele('cantidad').txt(
        new Decimal(item.quantity).toDecimalPlaces(6).toFixed(6),
      );
      d.ele('precioUnitario').txt(
        new Decimal(item.unitPrice).toDecimalPlaces(6).toFixed(6),
      );
      d.ele('descuento').txt(
        new Decimal(item.discount ?? 0).toDecimalPlaces(2).toFixed(2),
      );
      d.ele('precioTotalSinImpuesto').txt(
        new Decimal(item.subtotal).toDecimalPlaces(2).toFixed(2),
      );

      const impuestos = d.ele('impuestos');
      const imp = impuestos.ele('impuesto');
      imp.ele('codigo').txt('2');
      imp.ele('codigoPorcentaje').txt(String(item.ivaRate));
      imp.ele('tarifa').txt(IVA_TARIFA[String(item.ivaRate)] ?? '0');
      imp.ele('baseImponible').txt(
        new Decimal(item.subtotal).toDecimalPlaces(2).toFixed(2),
      );
      imp.ele('valor').txt(
        new Decimal(item.taxAmount).toDecimalPlaces(2).toFixed(2),
      );
    }

    // ─── infoAdicional ────────────────────────────────────────────────────
    const campos: { nombre: string; valor: string }[] = [];
    if (customer.email) campos.push({ nombre: 'email', valor: customer.email });
    if (customer.phone) campos.push({ nombre: 'telefono', valor: customer.phone });
    if (customer.address) campos.push({ nombre: 'direccion', valor: this.sanitize(customer.address) });
    if (invoice.notes) campos.push({ nombre: 'observaciones', valor: this.sanitize(invoice.notes) });

    if (campos.length > 0) {
      const infoAd = doc.ele('infoAdicional');
      for (const c of campos) {
        infoAd.ele('campoAdicional', { nombre: c.nombre }).txt(c.valor);
      }
    }

    const xml = doc.end({ prettyPrint: false });
    this.logger.debug(
      `XML generado: ${invoice.sequential} (${xml.length} bytes)`,
    );
    return xml;
  }

  private groupByIvaRate(
    items: InvoiceItem[],
  ): Record<string, { base: Decimal; tax: Decimal }> {
    const groups: Record<string, { base: Decimal; tax: Decimal }> = {};
    for (const item of items) {
      const rate = String(item.ivaRate);
      if (!groups[rate]) {
        groups[rate] = { base: new Decimal(0), tax: new Decimal(0) };
      }
      groups[rate].base = groups[rate].base.plus(item.subtotal);
      groups[rate].tax = groups[rate].tax.plus(item.taxAmount);
    }
    return groups;
  }

  // ← FIX: replaceAll en vez de replace(/regex/g) — resuelve SonarQube S7781
  private sanitize(str: string): string {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private trunc(str: string, max: number): string {
    return str.length > max ? str.substring(0, max) : str;
  }
}