export class BusinessError extends Error {
    constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    ) {
    super(message);
    this.name = 'BusinessError';
    }
}

// Errores de negocio NO reintentables
export class SriRejectedError extends BusinessError {
    constructor(messages: string[]) {
    super(messages.join(' | '), 'SRI_REJECTED', false);
    }
}

// Errores técnicos SÍ reintentables
export class SriConnectionError extends BusinessError {
    constructor(cause: string) {
    super(`Error de conexión con SRI: ${cause}`, 'SRI_CONNECTION', true);
    }
}

export class SigningError extends BusinessError {
    constructor(cause: string) {
    super(`Error de firma: ${cause}`, 'SIGNING_ERROR', false);
    }
}