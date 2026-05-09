import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { SubscriptionStatus } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionQuotaGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionQuotaGuard.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const company = request.company;

    if (!company?.id) {
      throw new ForbiddenException('Empresa no identificada');
    }

    const quota = await this.subscriptionsService.checkInvoiceQuota(company.id);

    if (!quota.allowed) {
      if (quota.subscriptionStatus === SubscriptionStatus.EXPIRED) {
        throw new ForbiddenException({
          code:    'SUBSCRIPTION_EXPIRED',
          message: 'Tu suscripción ha expirado. Renueva tu plan para continuar facturando.',
          quota,
        });
      }

      throw new ForbiddenException({
        code:    'QUOTA_EXCEEDED',
        message: `Has alcanzado el límite de ${quota.invoicesLimit} facturas de tu plan ${quota.planName}.`,
        quota,
      });
    }

    if (!quota.isUnlimited && quota.invoicesUsed / quota.invoicesLimit >= 0.8) {
      this.logger.warn(`Company ${company.id} at ${Math.round(quota.invoicesUsed / quota.invoicesLimit * 100)}% quota`);
    }

    request.quota = quota;
    return true;
  }
}