import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionQuotaGuard } from './guards/subscription-quota.guard';
import { Subscription } from './entities/subscription.entity';
import { Plan } from './entities/plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Plan]),
  ],
  controllers: [SubscriptionsController],
  providers:   [SubscriptionsService, SubscriptionQuotaGuard],
  exports:     [SubscriptionsService, SubscriptionQuotaGuard],
})
export class SubscriptionsModule implements OnApplicationBootstrap {
  constructor(private readonly svc: SubscriptionsService) {}

  // Crea los 4 planes por defecto al arrancar si no existen
  async onApplicationBootstrap(): Promise<void> {
    await this.svc.seedPlans();
  }
}