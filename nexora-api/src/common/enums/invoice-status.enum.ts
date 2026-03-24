export enum InvoiceStatus {
  DRAFT = 'DRAFT',           // borrador, no enviado aún
  PENDING = 'PENDING',       // encolado para procesar
  PROCESSING = 'PROCESSING', // trabajador activo
  SUBMITTED = 'SUBMITTED',   // enviado al SRI
  AUTHORIZED = 'AUTHORIZED', // autorizado por el SRI
  REJECTED = 'REJECTED',     // rechazado por el SRI
  ERROR = 'ERROR',           // error técnico (firma, red, etc.)
  CANCELLED = 'CANCELLED',   // anulado internamente
}