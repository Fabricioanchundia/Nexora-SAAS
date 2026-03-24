// Códigos de impuesto — PENDIENTE DE PARAMETRIZACIÓN según ficha técnica vigente SRI
export enum TaxCode {
  IVA = '2',         // Impuesto al Valor Agregado
  ICE = '3',         // Impuesto a los Consumos Especiales
  IRBPNR = '5',      // Impuesto Redimible a las Botellas Plásticas
}

export enum IvaRate {
  CERO = '0',      // 0% (tarifa 0)
  DOCE = '2',      // 12% — VERIFICAR tarifa vigente con SRI
  QUINCE = '3',    // 15% — VERIFICAR si aplica en versión actual
  EXENTO = '6',    // exento de IVA
  NO_OBJETO = '7', // no objeto de IVA
}