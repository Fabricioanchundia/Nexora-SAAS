export enum TaxDocumentStatus {
  PENDING_SIGN = 'PENDING_SIGN',     // pendiente de firma
  SIGNED = 'SIGNED',                 // XML firmado
  RECEIVED = 'RECEIVED',             // SRI confirmó recepción
  IN_PROCESS = 'IN_PROCESS',         // SRI procesando
  AUTHORIZED = 'AUTHORIZED',         // autorizado con número
  REJECTED = 'REJECTED',             // rechazado con mensajes
  NOT_RECEIVED = 'NOT_RECEIVED',     // no llegó al SRI
  RETRY_QUEUED = 'RETRY_QUEUED',     // en cola de reintento
}