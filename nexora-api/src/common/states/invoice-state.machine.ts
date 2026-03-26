import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxDocumentStatus } from '../enums/tax-document-status.enum';

// ─── Categorías de estados ────────────────────────────────────────────────────
//
// TERMINAL EXITOSO    → proceso completado, no se toca más
// TERMINAL DEFINITIVO → falló sin posibilidad de reintento automático
//                       (requiere intervención humana o anulación)
// REINTENTABLE        → puede volver a intentarse automáticamente

export type RecoveryStrategy =
  | 'NONE'           // no aplica (estado normal en flujo)
  | 'AUTO_RETRY'     // job de recovery lo reencola automáticamente
  | 'MANUAL_REVIEW'  // requiere que un humano lo revise y decida
  | 'TERMINAL';      // estado final, no hacer nada

// ─── Transiciones válidas para Invoice ───────────────────────────────────────
const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    [InvoiceStatus.DRAFT]:       [InvoiceStatus.PENDING],
    [InvoiceStatus.PENDING]:     [InvoiceStatus.PROCESSING, InvoiceStatus.ERROR],
    [InvoiceStatus.PROCESSING]:  [InvoiceStatus.SUBMITTED, InvoiceStatus.REJECTED, InvoiceStatus.ERROR],
    [InvoiceStatus.SUBMITTED]:   [InvoiceStatus.AUTHORIZED, InvoiceStatus.REJECTED, InvoiceStatus.ERROR],
    [InvoiceStatus.AUTHORIZED]:  [],  // TERMINAL EXITOSO
    [InvoiceStatus.REJECTED]:    [InvoiceStatus.PENDING],  // reintentable manualmente
    [InvoiceStatus.ERROR]:       [InvoiceStatus.PENDING],  // reintentable
    [InvoiceStatus.CANCELLED]:   [],  // TERMINAL DEFINITIVO
};

// ─── Transiciones válidas para TaxDocument ───────────────────────────────────
const TAX_DOC_TRANSITIONS: Record<TaxDocumentStatus, TaxDocumentStatus[]> = {
    [TaxDocumentStatus.PENDING_SIGN]:  [TaxDocumentStatus.SIGNED, TaxDocumentStatus.NOT_RECEIVED],
    [TaxDocumentStatus.SIGNED]:        [TaxDocumentStatus.SUBMITTED, TaxDocumentStatus.NOT_RECEIVED],
    [TaxDocumentStatus.SUBMITTED]:     [TaxDocumentStatus.RECEIVED, TaxDocumentStatus.REJECTED, TaxDocumentStatus.NOT_RECEIVED],
    [TaxDocumentStatus.RECEIVED]:      [TaxDocumentStatus.IN_PROCESS, TaxDocumentStatus.AUTHORIZED, TaxDocumentStatus.REJECTED],
    [TaxDocumentStatus.IN_PROCESS]:    [TaxDocumentStatus.IN_PROCESS, TaxDocumentStatus.AUTHORIZED, TaxDocumentStatus.REJECTED],
    [TaxDocumentStatus.AUTHORIZED]:    [TaxDocumentStatus.RIDE_GENERATED],  // TERMINAL EXITOSO
    [TaxDocumentStatus.RIDE_GENERATED]:[],  // TERMINAL EXITOSO FINAL
    [TaxDocumentStatus.REJECTED]:      [TaxDocumentStatus.PENDING_SIGN],    // reintentable
    [TaxDocumentStatus.NOT_RECEIVED]:  [TaxDocumentStatus.PENDING_SIGN],    // reintentable
    [TaxDocumentStatus.RETRY_QUEUED]:  [TaxDocumentStatus.PENDING_SIGN],
};

// ─── Estrategia de recovery por estado de TaxDocument ────────────────────────
const TAX_DOC_RECOVERY: Record<TaxDocumentStatus, RecoveryStrategy> = {
    [TaxDocumentStatus.PENDING_SIGN]:   'AUTO_RETRY',     // re-encolar firma
    [TaxDocumentStatus.SIGNED]:         'AUTO_RETRY',     // re-encolar transmisión
    [TaxDocumentStatus.SUBMITTED]:      'AUTO_RETRY',     // re-encolar poll
    [TaxDocumentStatus.RECEIVED]:       'AUTO_RETRY',     // re-encolar poll
    [TaxDocumentStatus.IN_PROCESS]:     'AUTO_RETRY',     // re-encolar poll
    [TaxDocumentStatus.NOT_RECEIVED]:   'AUTO_RETRY',     // re-encolar desde transmisión
    [TaxDocumentStatus.RETRY_QUEUED]:   'AUTO_RETRY',
    [TaxDocumentStatus.REJECTED]:       'MANUAL_REVIEW',  // error de datos — humano decide
    [TaxDocumentStatus.AUTHORIZED]:     'TERMINAL',
    [TaxDocumentStatus.RIDE_GENERATED]: 'TERMINAL',
};

// ─── Máquina de estados para Invoice ─────────────────────────────────────────
export class InvoiceStateMachine {
    static assertCanTransition(from: InvoiceStatus, to: InvoiceStatus): void {
        const allowed = INVOICE_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new BadRequestException(
        `Transición inválida Invoice: ${from} → ${to}. ` +
        `Permitidas desde ${from}: [${allowed.join(', ') || 'ninguna'}]`,
        );
    }
    }

    static canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
        return (INVOICE_TRANSITIONS[from] ?? []).includes(to);
    }

  // Estados finales — no se pueden modificar
    static isTerminal(status: InvoiceStatus): boolean {
        return [InvoiceStatus.AUTHORIZED, InvoiceStatus.CANCELLED].includes(status);
    }

  // Estados que el sistema puede reintentar automáticamente
    static isAutoRetryable(status: InvoiceStatus): boolean {
        return [InvoiceStatus.ERROR].includes(status);
    }

  // Estados que requieren decisión humana antes de reintentar
    static isManualReview(status: InvoiceStatus): boolean {
        return [InvoiceStatus.REJECTED].includes(status);
    }
}

// ─── Máquina de estados para TaxDocument ─────────────────────────────────────
export class TaxDocStateMachine {
    static assertCanTransition(
        from: TaxDocumentStatus,
        to: TaxDocumentStatus,
    ): void {
    const allowed = TAX_DOC_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
        throw new BadRequestException(
            `Transición inválida TaxDocument: ${from} → ${to}. ` +
            `Permitidas desde ${from}: [${allowed.join(', ') || 'ninguna'}]`,
        );
    }
    }

    static canTransition(from: TaxDocumentStatus, to: TaxDocumentStatus): boolean {
        return (TAX_DOC_TRANSITIONS[from] ?? []).includes(to);
    }

    static isTerminal(status: TaxDocumentStatus): boolean {
        return [TaxDocumentStatus.AUTHORIZED, TaxDocumentStatus.RIDE_GENERATED].includes(status);
    }

  // Qué debe hacer el sistema con un documento en este estado
    static getRecoveryStrategy(status: TaxDocumentStatus): RecoveryStrategy {
        return TAX_DOC_RECOVERY[status] ?? 'MANUAL_REVIEW';
    }

  // Estados donde el recovery job debe intervenir
    static needsAutoRecovery(status: TaxDocumentStatus): boolean {
        return TAX_DOC_RECOVERY[status] === 'AUTO_RETRY';
    }

  // Estados que requieren intervención humana
    static needsManualReview(status: TaxDocumentStatus): boolean {
        return TAX_DOC_RECOVERY[status] === 'MANUAL_REVIEW';
    }
}