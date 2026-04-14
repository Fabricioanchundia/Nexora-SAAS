// Clasificación de errores del proceso de firma
// El job processor usa esto para decidir: reintentar | revisión manual | no hacer nada

export enum SigningErrorType {
  // ─── TRANSITORIOS — SÍ reintentar automáticamente ──────────────────────
  // Causa: problema temporal de recursos o lectura
  STORAGE_READ_FAILED = 'STORAGE_READ_FAILED',        // no se pudo leer el .p12
  FORGE_PARSE_TIMEOUT = 'FORGE_PARSE_TIMEOUT',        // timeout al parsear .p12 (raro)

  // ─── PERMANENTES — NO reintentar, mandar a revisión manual ─────────────
  // Causa: error en los datos o en la estructura del XML
  INVALID_PASSPHRASE  = 'INVALID_PASSPHRASE',         // contraseña incorrecta
  CORRUPT_P12         = 'CORRUPT_P12',                // archivo .p12 dañado
  XML_MALFORMED       = 'XML_MALFORMED',              // XML sin tag de cierre
  PRIVATE_KEY_MISSING = 'PRIVATE_KEY_MISSING',        // .p12 sin clave privada
  CERT_MISSING        = 'CERT_MISSING',               // .p12 sin certificado

  // ─── DE CONFIGURACIÓN — mandar a revisión manual, notificar al admin ───
  // Causa: el certificado tiene un problema de vigencia o datos
  CERT_EXPIRED        = 'CERT_EXPIRED',               // certificado vencido
  CERT_NOT_YET_VALID  = 'CERT_NOT_YET_VALID',        // certificado no vigente aún
  NO_CERT_CONFIGURED  = 'NO_CERT_CONFIGURED',         // empresa sin certificado subido
}

export interface ClassifiedSigningError {
  type: SigningErrorType;
  message: string;
  retryable: boolean;
  requiresManualReview: boolean;
  // Si true: notificar al admin de la empresa (no solo al sistema)
  notifyAdmin: boolean;
}

// Tabla de clasificación — el processor solo consulta esto
export const SIGNING_ERROR_MAP: Record<SigningErrorType, Omit<ClassifiedSigningError, 'type' | 'message'>> = {
  [SigningErrorType.STORAGE_READ_FAILED]:  { retryable: true,  requiresManualReview: false, notifyAdmin: false },
  [SigningErrorType.FORGE_PARSE_TIMEOUT]:  { retryable: true,  requiresManualReview: false, notifyAdmin: false },
  [SigningErrorType.INVALID_PASSPHRASE]:   { retryable: false, requiresManualReview: true,  notifyAdmin: true  },
  [SigningErrorType.CORRUPT_P12]:          { retryable: false, requiresManualReview: true,  notifyAdmin: true  },
  [SigningErrorType.XML_MALFORMED]:        { retryable: false, requiresManualReview: true,  notifyAdmin: false },
  [SigningErrorType.PRIVATE_KEY_MISSING]:  { retryable: false, requiresManualReview: true,  notifyAdmin: true  },
  [SigningErrorType.CERT_MISSING]:         { retryable: false, requiresManualReview: true,  notifyAdmin: true  },
  [SigningErrorType.CERT_EXPIRED]:         { retryable: false, requiresManualReview: true,  notifyAdmin: true  },
  [SigningErrorType.CERT_NOT_YET_VALID]:   { retryable: false, requiresManualReview: true,  notifyAdmin: true  },
  [SigningErrorType.NO_CERT_CONFIGURED]:   { retryable: false, requiresManualReview: true,  notifyAdmin: true  },
};

export function classifySigningError(err: unknown): ClassifiedSigningError {
  const msg = err instanceof Error ? err.message : String(err);

  let type: SigningErrorType;

  if (msg.includes('No hay certificado') || msg.includes('NO_CERT')) {
    type = SigningErrorType.NO_CERT_CONFIGURED;
  } else if (msg.includes('venció') || msg.includes('expired')) {
    type = SigningErrorType.CERT_EXPIRED;
  } else if (msg.includes('contraseña') || msg.includes('passphrase') || msg.includes('MAC')) {
    type = SigningErrorType.INVALID_PASSPHRASE;
  } else if (msg.includes('.p12') && msg.includes('inválido')) {
    type = SigningErrorType.CORRUPT_P12;
  } else if (msg.includes('clave privada') || msg.includes('private key')) {
    type = SigningErrorType.PRIVATE_KEY_MISSING;
  } else if (msg.includes('certificado') && msg.includes('válido')) {
    type = SigningErrorType.CERT_MISSING;
  } else if (msg.includes('XML malformado') || msg.includes('tag de cierre')) {
    type = SigningErrorType.XML_MALFORMED;
  } else {
    // Default: transitorio — se reintenta hasta agotar intentos
    type = SigningErrorType.STORAGE_READ_FAILED;
  }

  return {
    type,
    message: msg,
    ...SIGNING_ERROR_MAP[type],
  };
}