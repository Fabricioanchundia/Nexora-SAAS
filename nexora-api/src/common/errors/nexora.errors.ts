export abstract class NexoraError extends Error {
    abstract readonly code: string;
    abstract readonly retryable: boolean;

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

// ─── Errores de negocio (NO reintentar) ───────────────────────────────────────

export class SriRejectedError extends NexoraError {
    readonly code = 'SRI_REJECTED';
    readonly retryable = false;

    constructor(
        public readonly messages: string[],
        public readonly accessKey: string,
    ) {
    super(`SRI rechazó el comprobante ${accessKey}: ${messages.join(' | ')}`);
    }
}

export class InvalidAccessKeyError extends NexoraError {
    readonly code = 'INVALID_ACCESS_KEY';
    readonly retryable = false;

    constructor(key: string, reason: string) {
        super(`Clave de acceso inválida "${key}": ${reason}`);
    }
}

export class CertificateExpiredError extends NexoraError {
    readonly code = 'CERTIFICATE_EXPIRED';
    readonly retryable = false;

    constructor(expiresAt: Date) {
    super(`El certificado .p12 venció el ${expiresAt.toLocaleDateString('es-EC')}`);
    }
}

export class CertificateInvalidError extends NexoraError {
    readonly code = 'CERTIFICATE_INVALID';
    readonly retryable = false;

    constructor(reason: string) {
        super(`Certificado .p12 inválido: ${reason}`);
    }
}

export class InvoiceDuplicateError extends NexoraError {
  readonly code = 'INVOICE_DUPLICATE';
  readonly retryable = false;

  constructor(idempotencyKey: string, existingId: string) {
    super(
      `Factura duplicada detectada (idempotencyKey=${idempotencyKey}, id existente=${existingId})`,
    );
  }
}

export class InvalidStateTransitionError extends NexoraError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly retryable = false;

  constructor(from: string, to: string) {
    super(`Transición de estado inválida: ${from} → ${to}`);
  }
}

// ─── Errores técnicos (SÍ reintentar) ─────────────────────────────────────────

export class SriConnectionError extends NexoraError {
  readonly code = 'SRI_CONNECTION';
  readonly retryable = true;

  constructor(cause: string) {
    super(`Error de conexión con SRI: ${cause}`);
  }
}

export class SriTimeoutError extends NexoraError {
  readonly code = 'SRI_TIMEOUT';
  readonly retryable = true;

  constructor() {
    super('El SRI no respondió en el tiempo esperado');
  }
}

export class SigningError extends NexoraError {
  readonly code = 'SIGNING_ERROR';
  readonly retryable = false; // error de firma = XML o cert malo, no reintenta

  constructor(cause: string) {
    super(`Error durante la firma del comprobante: ${cause}`);
  }
}

export class StorageError extends NexoraError {
  readonly code = 'STORAGE_ERROR';
  readonly retryable = true;

  constructor(operation: string, cause: string) {
    super(`Error de storage en ${operation}: ${cause}`);
  }
}

// ─── Helper para clasificar errores desconocidos ──────────────────────────────

export function isRetryable(error: unknown): boolean {
  if (error instanceof NexoraError) return error.retryable;
  // Errores de red de Node.js son reintentables
  if (error instanceof Error) {
    const networkCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND'];
    return networkCodes.some((code) => error.message.includes(code));
  }
  return false;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}