export enum TaxCode {
  IVA = '2',
  ICE = '3',
  IRBPNR = '5',
}
 
export enum IvaRate {
  CERO = '0',          // 0%
  DOCE = '2',          // 12% — tarifa general
  CATORCE = '3',       // 14%
  QUINCE = '4',        // 15%
  CINCO = '5',         // 5%
  NO_OBJETO = '6',     // No objeto de impuesto
  EXENTO = '7',        // Exento de IVA
  DIFERENCIADO = '8',  // IVA diferenciado por decreto (ej: 8% turismo Carnaval 2026)
}
 
// Porcentajes para cálculo interno — Tabla 17 ficha técnica SRI v2.26
export const IVA_PERCENTAGES: Record<string, number> = {
  '0': 0,
  '2': 0.12,
  '3': 0.14,
  '4': 0.15,
  '5': 0.05,
  '6': 0,
  '7': 0,
  '8': 0.08, // diferenciado — actualizar según decreto vigente
};
 
// Porcentajes para campo <tarifa> en el XML del SRI
export const IVA_TARIFA: Record<string, string> = {
  '0': '0',
  '2': '12',
  '3': '14',
  '4': '15',
  '5': '5',
  '6': '0',
  '7': '0',
  '8': '8',
};