// CAMBIO CRÍTICO: dos enums separados
// sriStatus  → estado fiscal (qué dijo el SRI) — NUNCA cambia post-AUTHORIZED
// postStatus → estado de post-proceso (RIDE, entrega) — independiente del SRI

// ─── Estado fiscal — confirmado ficha técnica SRI v2.26 ───────────────────────
export enum SriStatus {
  PENDING_SIGN  = 'PENDING_SIGN',   // pendiente de firma XAdES-BES
  SIGNED        = 'SIGNED',         // XML firmado, listo para enviar
  SUBMITTED     = 'SUBMITTED',      // enviado al web service de recepción
  RECEIVED      = 'RECEIVED',       // SRI confirmó recepción (RECIBIDA)
  IN_PROCESS    = 'IN_PROCESS',     // SRI procesando (PPR)
  AUTHORIZED    = 'AUTHORIZED',     // ← TERMINAL FISCAL. SRI autorizó. No cambia nunca más.
  REJECTED      = 'REJECTED',       // SRI rechazó (DEVUELTA o NO AUTORIZADO)
  NOT_RECEIVED  = 'NOT_RECEIVED',   // error de red — el SRI no lo vio
}

// ─── Estado de post-proceso — independiente del SRI ───────────────────────────
// Solo aplica cuando sriStatus = AUTHORIZED
export enum PostStatus {
  PENDING_RIDE  = 'PENDING_RIDE',   // esperando generar PDF
  RIDE_DONE     = 'RIDE_DONE',      // PDF generado y guardado
  DELIVERED     = 'DELIVERED',      // PDF enviado al cliente por email
  RIDE_FAILED   = 'RIDE_FAILED',    // fallo al generar PDF (reintentable)
  DELIVERY_FAILED = 'DELIVERY_FAILED', // fallo al enviar email (reintentable)
}

// Alias para retrocompatibilidad — usa los nuevos en código nuevo
export const TaxDocumentStatus = SriStatus;
export type TaxDocumentStatus = SriStatus;