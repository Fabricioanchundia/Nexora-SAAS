// src/modules/xml-generation/xml-generation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { Invoice } from '../invoices/entities/invoice.entity';
import { EnvironmentType } from '../../common/enums/environment-type.enum';
import Decimal from 'decimal.js';

// ⚠️ PENDIENTE DE PARAMETRIZACIÓN CRÍTICA
// Esta estructura XML corresponde a la ficha técnica de comprobantes
// electrónicos del SRI Ecuador.
// ANTES de usar en producción DEBES:
// 1. Descargar la ficha técnica vigente del SRI (https://www.sri.gob.ec)
// 2. Verificar la versión del esquema (actualmente v2.1.0 pero puede cambiar)
// 3. Verificar cada campo, su longitud máxima y validaciones
// 4. Probar contra el validador del SRI en ambiente de pruebas
// 5. Verificar el manejo de campos opcionales vs obligatorios

@Injectable()
export class XmlGenerationService {
  private readonly logger = new Logger(XmlGenerationService.name);

  // ⚠️ Versión del esquema — VERIFICAR con ficha técnica SRI vigente
  private readonly SCHEMA_VERSION = '2.1.0';
  private readonly ID_COMPROBANTE = '01'; // factura — verificar con ficha técnica

  async generateInvoiceXml(invoice: Invoice): Promise<string> {
    if (!invoice.customer || !invoice.items || !invoice.company) {
      throw new Error(
        'La factura debe incluir customer, items y company para generar XML',
      );
    }

    try {
      const xml = this.buildFacturaXml(invoice);
      return xml;
    } catch (error) {
      this.logger.error(`Error generando XML para factura ${invoice.id}`, error);
      throw new Error(`Generación XML fallida: ${error.message}`);
    }
  }

  private buildFacturaXml(invoice: Invoice): string {
    // ⚠️ Estructura según ficha técnica SRI — VERIFICAR cada elemento
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('factura', {
        id: 'comprobante',
        version: this.SCHEMA_VERSION,
      });

    // ─── infoTributaria ─────────────────────────────────────────────────────
    const infoTributaria = doc.ele('infoTributaria');
    // ⚠️ ambiente: '1' pruebas, '2' producción — verificar con ficha técnica
    infoTributaria.ele('ambiente').txt(invoice.company.sriEnvironment);
    // ⚠️ tipoEmision: '1' normal — verificar con ficha técnica
    infoTributaria.ele('tipoEmision').txt(invoice.company.emissionType);
    infoTributaria.ele('razonSocial').txt(invoice.company.businessName);
    infoTributaria.ele('nombreComercial').txt(
      invoice.company.tradeName || invoice.company.businessName,
    );
    infoTributaria.ele('ruc').txt(invoice.company.ruc);
    infoTributaria.ele('claveAcceso').txt(invoice.accessKey);
    // ⚠️ codDoc: '01' factura — verificar con ficha técnica
    infoTributaria.ele('codDoc').txt(this.ID_COMPROBANTE);
    infoTributaria.ele('estab').txt(invoice.company.establishmentCode);
    infoTributaria.ele('ptoEmi').txt(invoice.company.emissionPoint);
    infoTributaria.ele('secuencial').txt(
      invoice.sequential.split('-')[2], // solo los 9 dígitos del secuencial
    );
    infoTributaria.ele('dirMatriz').txt(invoice.company.address);

    // ─── infoFactura ─────────────────────────────────────────────────────────
    const infoFactura = doc.ele('infoFactura');
    infoFactura.ele('fechaEmision').txt(this.formatDate(invoice.issueDate));
    infoFactura.ele('dirEstablecimiento').txt(invoice.company.address);
    // ⚠️ obligadoContabilidad: verificar campo y valores con ficha técnica
    infoFactura.ele('obligadoContabilidad').txt('NO');
    // ⚠️ tipoIdentificacionComprador: verificar códigos con ficha técnica
    infoFactura
      .ele('tipoIdentificacionComprador')
      .txt(invoice.customer.identificationType);
    infoFactura.ele('razonSocialComprador').txt(invoice.customer.fullName);
    infoFactura
      .ele('identificacionComprador')
      .txt(invoice.customer.identification);
    infoFactura.ele('totalSinImpuestos').txt(
      this.formatDecimal(
        new Decimal(invoice.subtotalNoTax)
          .plus(invoice.subtotalTaxable)
          .toNumber(),
      ),
    );
    infoFactura.ele('totalDescuento').txt(
      this.formatDecimal(Number(invoice.discountTotal)),
    );

    // totalConImpuestos — estructura por tarifa
    const totalConImpuestos = infoFactura.ele('totalConImpuestos');
    // ⚠️ Este bloque debe generarse dinámicamente por tarifa de IVA aplicada
    // PENDIENTE: agrupar ítems por tarifa y generar un totalImpuesto por cada una
    if (Number(invoice.subtotalTaxable) > 0) {
      const totalImpuesto = totalConImpuestos.ele('totalImpuesto');
      // ⚠️ código e identificador — verificar con ficha técnica SRI
      totalImpuesto.ele('codigo').txt('2'); // IVA
      totalImpuesto.ele('codigoPorcentaje').txt('2'); // 12% — verificar
      totalImpuesto.ele('baseImponible').txt(
        this.formatDecimal(Number(invoice.subtotalTaxable)),
      );
      totalImpuesto.ele('valor').txt(
        this.formatDecimal(Number(invoice.taxAmount)),
      );
    }

    infoFactura.ele('propina').txt('0.00');
    infoFactura.ele('importeTotal').txt(
      this.formatDecimal(Number(invoice.total)),
    );
    // ⚠️ moneda: verificar campo con ficha técnica — generalmente 'DOLAR'
    infoFactura.ele('moneda').txt('DOLAR');

    // ─── detalles ────────────────────────────────────────────────────────────
    const detalles = doc.ele('detalles');
    for (const item of invoice.items) {
      const detalle = detalles.ele('detalle');
      // ⚠️ Longitudes máximas de campos — verificar con ficha técnica
      detalle.ele('codigoPrincipal').txt(item.productCode.substring(0, 25));
      detalle.ele('descripcion').txt(item.description.substring(0, 300));
      detalle.ele('cantidad').txt(this.formatDecimal(Number(item.quantity), 6));
      detalle.ele('precioUnitario').txt(
        this.formatDecimal(Number(item.unitPrice), 6),
      );
      detalle.ele('descuento').txt(this.formatDecimal(Number(item.discount)));
      detalle.ele('precioTotalSinImpuesto').txt(
        this.formatDecimal(Number(item.subtotal)),
      );

      const impuestos = detalle.ele('impuestos');
      const impuesto = impuestos.ele('impuesto');
      // ⚠️ código e identificador — verificar con ficha técnica SRI
      impuesto.ele('codigo').txt('2');
      impuesto.ele('codigoPorcentaje').txt(item.ivaRate);
      impuesto.ele('tarifa').txt(this.getIvaRatePercent(item.ivaRate));
      impuesto.ele('baseImponible').txt(
        this.formatDecimal(Number(item.subtotal)),
      );
      impuesto.ele('valor').txt(this.formatDecimal(Number(item.taxAmount)));
    }

    // ─── infoAdicional (opcional) ────────────────────────────────────────────
    if (invoice.customer.email || invoice.customer.phone) {
      const infoAdicional = doc.ele('infoAdicional');
      if (invoice.customer.email) {
        infoAdicional
          .ele('campoAdicional', { nombre: 'email' })
          .txt(invoice.customer.email);
      }
      if (invoice.customer.phone) {
        infoAdicional
          .ele('campoAdicional', { nombre: 'telefono' })
          .txt(invoice.customer.phone);
      }
    }

    return doc.end({ prettyPrint: false }); // el SRI espera XML compacto
  }

  private formatDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`; // ⚠️ formato dd/mm/yyyy — verificar con ficha técnica
  }

  private formatDecimal(value: number, places = 2): string {
    return new Decimal(value).toFixed(places);
  }

  // ⚠️ PENDIENTE DE PARAMETRIZACIÓN — verificar porcentajes vigentes con SRI
  private getIvaRatePercent(ivaRate: string): string {
    const rates: Record<string, string> = {
      '0': '0',
      '2': '12', // Verificar tarifa vigente
      '3': '15', // Verificar si aplica
      '6': '0',
      '7': '0',
    };
    return rates[ivaRate] ?? '0';
  }
}