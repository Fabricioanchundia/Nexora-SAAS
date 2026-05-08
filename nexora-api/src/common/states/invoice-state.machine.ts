import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { SriStatus, PostStatus } from '../enums/tax-document-status.enum';

export type RecoveryStrategy =
  | 'AUTO_RETRY'
  | 'MANUAL_REVIEW'
  | 'TERMINAL';

export const SRI_MAX_RETRIES: Record<SriStatus, number> = {
  [SriStatus.PENDING_SIGN]:  3,
  [SriStatus.SIGNED]:        5,
  [SriStatus.SUBMITTED]:     10,
  [SriStatus.RECEIVED]:      10,
  [SriStatus.IN_PROCESS]:    10,
  [SriStatus.AUTHORIZED]:    0,
  [SriStatus.REJECTED]:      0,
  [SriStatus.NOT_RECEIVED]:  3,
};

export const POST_MAX_RETRIES: Record<PostStatus, number> = {
  [PostStatus.PENDING_RIDE]:    3,
  [PostStatus.RIDE_DONE]:       3,
  [PostStatus.DELIVERED]:       0,
  [PostStatus.RIDE_FAILED]:     3,
  [PostStatus.DELIVERY_FAILED]: 3,
};

const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]:       [InvoiceStatus.PENDING],
  [InvoiceStatus.PENDING]:     [InvoiceStatus.PROCESSING, InvoiceStatus.ERROR],
  [InvoiceStatus.PROCESSING]:  [InvoiceStatus.SUBMITTED, InvoiceStatus.REJECTED, InvoiceStatus.ERROR],
  [InvoiceStatus.SUBMITTED]:   [InvoiceStatus.AUTHORIZED, InvoiceStatus.REJECTED, InvoiceStatus.ERROR],
  [InvoiceStatus.AUTHORIZED]:  [],
  [InvoiceStatus.REJECTED]:    [InvoiceStatus.PENDING],
  [InvoiceStatus.ERROR]:       [InvoiceStatus.PENDING],
  [InvoiceStatus.CANCELLED]:   [],
};

const SRI_TRANSITIONS: Record<SriStatus, SriStatus[]> = {
  [SriStatus.PENDING_SIGN]:  [SriStatus.SIGNED, SriStatus.NOT_RECEIVED],
  [SriStatus.SIGNED]:        [SriStatus.SUBMITTED, SriStatus.NOT_RECEIVED, SriStatus.RECEIVED, SriStatus.AUTHORIZED],
  [SriStatus.SUBMITTED]:     [SriStatus.RECEIVED, SriStatus.REJECTED, SriStatus.NOT_RECEIVED, SriStatus.AUTHORIZED],
  [SriStatus.RECEIVED]:      [SriStatus.IN_PROCESS, SriStatus.AUTHORIZED, SriStatus.REJECTED],
  [SriStatus.IN_PROCESS]:    [SriStatus.IN_PROCESS, SriStatus.AUTHORIZED, SriStatus.REJECTED],
  [SriStatus.AUTHORIZED]:    [],
  [SriStatus.REJECTED]:      [SriStatus.PENDING_SIGN],
  [SriStatus.NOT_RECEIVED]:  [SriStatus.PENDING_SIGN],
};

const POST_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  [PostStatus.PENDING_RIDE]:     [PostStatus.RIDE_DONE, PostStatus.RIDE_FAILED],
  [PostStatus.RIDE_DONE]:        [PostStatus.DELIVERED, PostStatus.DELIVERY_FAILED],
  [PostStatus.DELIVERED]:        [],
  [PostStatus.RIDE_FAILED]:      [PostStatus.PENDING_RIDE],
  [PostStatus.DELIVERY_FAILED]:  [PostStatus.RIDE_DONE],
};

const SRI_RECOVERY: Record<SriStatus, RecoveryStrategy> = {
  [SriStatus.PENDING_SIGN]:  'AUTO_RETRY',
  [SriStatus.SIGNED]:        'AUTO_RETRY',
  [SriStatus.SUBMITTED]:     'AUTO_RETRY',
  [SriStatus.RECEIVED]:      'AUTO_RETRY',
  [SriStatus.IN_PROCESS]:    'AUTO_RETRY',
  [SriStatus.NOT_RECEIVED]:  'AUTO_RETRY',
  [SriStatus.REJECTED]:      'MANUAL_REVIEW',
  [SriStatus.AUTHORIZED]:    'TERMINAL',
};

const POST_RECOVERY: Record<PostStatus, RecoveryStrategy> = {
  [PostStatus.PENDING_RIDE]:     'AUTO_RETRY',
  [PostStatus.RIDE_DONE]:        'AUTO_RETRY',
  [PostStatus.RIDE_FAILED]:      'AUTO_RETRY',
  [PostStatus.DELIVERY_FAILED]:  'AUTO_RETRY',
  [PostStatus.DELIVERED]:        'TERMINAL',
};

export class InvoiceStateMachine {
  static assertCanTransition(from: InvoiceStatus, to: InvoiceStatus): void {
    const allowed = INVOICE_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Transición inválida Invoice: ${from} → ${to}. ` +
        `Permitidas desde ${from}: [${allowed.join(', ') || 'ninguna — estado terminal'}]`,
      );
    }
  }

  static canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
    return (INVOICE_TRANSITIONS[from] ?? []).includes(to);
  }

  static isTerminal(status: InvoiceStatus): boolean {
    return [InvoiceStatus.AUTHORIZED, InvoiceStatus.CANCELLED].includes(status);
  }
}

export class SriStateMachine {
  static assertCanTransition(from: SriStatus, to: SriStatus): void {
    const allowed = SRI_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Transición inválida sriStatus: ${from} → ${to}. ` +
        `Permitidas desde ${from}: [${allowed.join(', ') || 'ninguna — estado terminal fiscal'}]`,
      );
    }
  }

  static canTransition(from: SriStatus, to: SriStatus): boolean {
    return (SRI_TRANSITIONS[from] ?? []).includes(to);
  }

  static isTerminalFiscal(status: SriStatus): boolean {
    return status === SriStatus.AUTHORIZED;
  }

  static getRecovery(status: SriStatus): RecoveryStrategy {
    return SRI_RECOVERY[status] ?? 'MANUAL_REVIEW';
  }

  static getMaxRetries(status: SriStatus): number {
    return SRI_MAX_RETRIES[status] ?? 3;
  }

  static needsAutoRecovery(status: SriStatus, retryCount: number): boolean {
    return (
      SRI_RECOVERY[status] === 'AUTO_RETRY' &&
      retryCount < (SRI_MAX_RETRIES[status] ?? 3)
    );
  }

  static needsManualReview(status: SriStatus, retryCount: number): boolean {
    return (
      SRI_RECOVERY[status] === 'MANUAL_REVIEW' ||
      (SRI_RECOVERY[status] === 'AUTO_RETRY' &&
        retryCount >= (SRI_MAX_RETRIES[status] ?? 3))
    );
  }
}

export class PostStateMachine {
  static assertCanTransition(from: PostStatus, to: PostStatus): void {
    const allowed = POST_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Transición inválida postStatus: ${from} → ${to}. ` +
        `Permitidas desde ${from}: [${allowed.join(', ') || 'ninguna'}]`,
      );
    }
  }

  static canTransition(from: PostStatus, to: PostStatus): boolean {
    return (POST_TRANSITIONS[from] ?? []).includes(to);
  }

  static isTerminal(status: PostStatus): boolean {
    return status === PostStatus.DELIVERED;
  }

  static getRecovery(status: PostStatus): RecoveryStrategy {
    return POST_RECOVERY[status] ?? 'AUTO_RETRY';
  }

  static getMaxRetries(status: PostStatus): number {
    return POST_MAX_RETRIES[status] ?? 3;
  }

  static needsAutoRecovery(status: PostStatus, retryCount: number): boolean {
    return (
      POST_RECOVERY[status] === 'AUTO_RETRY' &&
      retryCount < (POST_MAX_RETRIES[status] ?? 3)
    );
  }
}

export const TaxDocStateMachine = SriStateMachine;