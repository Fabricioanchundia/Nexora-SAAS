// ⚠️ PENDIENTE DE VALIDACIÓN CON SRI:
// Verificar cada valor contra la ficha técnica SRI v2.26 vigente
// antes de pasar a producción.

// ─── Versión del esquema XML ──────────────────────────────────────────────────
// ⚠️ PENDIENTE: confirmar versión vigente con XSD oficial del SRI
export const SRI_XML_VERSION = '2.1.0';

// ─── Códigos de tipo de documento — Tabla 3 ficha técnica SRI v2.26 ──────────
// ⚠️ PENDIENTE: verificar todos los códigos contra la tabla oficial
export enum DocumentType {
  FACTURA                = '01',
  NOTA_DEBITO            = '05',
  NOTA_CREDITO           = '04',
  GUIA_REMISION          = '06',
  COMPROBANTE_RETENCION  = '07',
  LIQUIDACION_COMPRA     = '03',
}

// ─── Códigos de impuesto — Tabla 15 ficha técnica SRI v2.26 ──────────────────
// ⚠️ PENDIENTE: verificar códigos vigentes
export enum TaxGroupCode {
  IVA    = '2',
  ICE    = '3',
  IRBPNR = '5',
}

// ─── Códigos de porcentaje IVA — Tabla 17 ficha técnica SRI v2.26 ────────────
// ⚠️ PENDIENTE: verificar tarifas vigentes (pueden cambiar por decreto)
export const IVA_CODE_TO_RATE: Record<string, string> = {
  '0': '0',    // 0%
  '2': '12',   // 12% — tarifa general
  '3': '14',   // 14%
  '4': '15',   // 15%
  '5': '5',    // 5%
  '6': '0',    // No objeto
  '7': '0',    // Exento
  '8': '8',    // Diferenciado por decreto (ej: turismo Carnaval 2026)
};

// ─── Formas de pago por defecto — Tabla 24 ficha técnica SRI v2.26 ───────────
// ⚠️ PENDIENTE: confirmar código correcto para "sin utilización sistema financiero"
export const DEFAULT_PAYMENT_CODE = '01'; // Sin utilización del sistema financiero
export const DEFAULT_TIME_UNIT = 'dias';

// ─── Moneda ───────────────────────────────────────────────────────────────────
// Ecuador usa DOLAR — si cambia, cambiar aquí
export const SRI_CURRENCY = 'DOLAR';

// ─── Límite consumidor final — ⚠️ PENDIENTE: verificar monto vigente ─────────
// Según la ficha técnica el monto puede actualizarse
export const CONSUMIDOR_FINAL_LIMIT_USD = 50;

// ─── Días hacia atrás permitidos para fecha de emisión ───────────────────────
// ⚠️ PENDIENTE: verificar con ficha técnica SRI
export const MAX_DAYS_BEFORE_ISSUE = 3;

// ─── Ambientes ────────────────────────────────────────────────────────────────
export enum SriEnvironment {
  PRUEBAS    = '1',
  PRODUCCION = '2',
}

// ─── Tipos de emisión — Tabla 2 ficha técnica SRI v2.26 ──────────────────────
// ⚠️ PENDIENTE: confirmar que solo existe tipo 1 actualmente
export enum EmissionType {
  NORMAL = '1',
}