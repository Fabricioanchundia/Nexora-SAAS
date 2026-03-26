export enum TaxDocumentStatus {
  PENDING_SIGN = 'PENDING_SIGN',       // pendiente de firma
  SIGNED = 'SIGNED',                   // XML firmado
  SUBMITTED = 'SUBMITTED',             // enviado al SRI (recepción)
  RECEIVED = 'RECEIVED',               // SRI confirmó recepción
  IN_PROCESS = 'IN_PROCESS',           // SRI procesando (PPR)
  AUTHORIZED = 'AUTHORIZED',           // autorizado por el SRI
  REJECTED = 'REJECTED',               // rechazado por el SRI
  NOT_RECEIVED = 'NOT_RECEIVED',       // no llegó al SRI (error de red)
  RETRY_QUEUED = 'RETRY_QUEUED',       // en cola de reintento
  RIDE_GENERATED = 'RIDE_GENERATED',   // PDF del RIDE generado
}