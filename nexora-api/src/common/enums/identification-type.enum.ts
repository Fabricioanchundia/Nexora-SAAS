// Tipos de identificación del receptor según ficha técnica SRI
// PENDIENTE DE PARAMETRIZACIÓN — verificar con ficha técnica vigente del SRI
export enum IdentificationType {
  RUC = '04',            // Registro Único de Contribuyentes
  CEDULA = '05',         // Cédula de ciudadanía ecuatoriana
  PASAPORTE = '06',      // Pasaporte
  CONSUMIDOR_FINAL = '07', // Consumidor final (sin identificación específica)
  EXTERIOR = '08',       // Identificación del exterior
  PLACA = '09',          // Placa (para guías de remisión, no aplica en facturas)
}