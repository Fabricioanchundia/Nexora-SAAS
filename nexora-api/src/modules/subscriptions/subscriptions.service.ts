import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Plan, PlanCode } from './entities/plan.entity';

export interface QuotaStatus {
  allowed: boolean;
  planName: string;
  invoicesUsed: number;
  invoicesLimit: number;
  invoicesRemaining: number;
  isUnlimited: boolean;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: Date;
  daysUntilExpiry: number;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  // ── Seed plans on first boot ───────────────────────────────────────────────
  async seedPlans(): Promise<void> {
    const count = await this.planRepo.count();
    if (count > 0) return;

    const plans = [
      {
        code: PlanCode.FREE,
        name: 'Gratuito',
        description: 'Para probar Nexora',
        monthlyPrice: 0,
        invoicesPerMonth: 20,
        maxUsers: 1,
        maxCompanies: 1,
        features: { xmlDownload: true, rideDownload: false, emailNotifications: false },
      },
      {
        code: PlanCode.STARTER,
        name: 'Starter',
        description: 'Para pequeños negocios',
        monthlyPrice: 15,
        invoicesPerMonth: 200,
        maxUsers: 2,
        maxCompanies: 1,
        features: { xmlDownload: true, rideDownload: true, emailNotifications: true },
      },
      {
        code: PlanCode.PROFESSIONAL,
        name: 'Profesional',
        description: 'Para negocios en crecimiento',
        monthlyPrice: 35,
        invoicesPerMonth: 1000,
        maxUsers: 5,
        maxCompanies: 3,
        features: { xmlDownload: true, rideDownload: true, emailNotifications: true, prioritySupport: true },
      },
      {
        code: PlanCode.ENTERPRISE,
        name: 'Empresarial',
        description: 'Sin límites para grandes empresas',
        monthlyPrice: 89,
        invoicesPerMonth: -1,
        maxUsers: -1,
        maxCompanies: -1,
        features: { xmlDownload: true, rideDownload: true, emailNotifications: true, prioritySupport: true, api: true },
      },
    ];

    for (const p of plans) {
      await this.planRepo.save(this.planRepo.create(p));
    }
    this.logger.log('Default plans seeded successfully');
  }

  // ── Get or create subscription for a company ───────────────────────────────
  async getOrCreateForCompany(companyId: string): Promise<Subscription> {
    let sub = await this.subscriptionRepo.findOne({
      where: { companyId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (!sub) {
      const freePlan = await this.planRepo.findOne({ where: { code: PlanCode.FREE } });
      if (!freePlan) throw new NotFoundException('Plan FREE no encontrado');

      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 30);

      sub = this.subscriptionRepo.create({
        companyId,
        plan:     freePlan,
        planId:   freePlan.id,
        status:   SubscriptionStatus.TRIAL,
        startsAt: now,
        expiresAt: trialEnd,
        invoicesUsedThisMonth: 0,
        lastResetAt: now,
      });
      await this.subscriptionRepo.save(sub);
      this.logger.log(`Created TRIAL subscription for company ${companyId}`);
    }

    return sub;
  }

  // ── Check invoice quota ────────────────────────────────────────────────────
  async checkInvoiceQuota(companyId: string): Promise<QuotaStatus> {
    const sub = await this.getOrCreateForCompany(companyId);
    await this.resetMonthlyCounterIfNeeded(sub);

    const isUnlimited   = sub.plan.invoicesPerMonth === -1;
    const limit         = sub.plan.invoicesPerMonth;
    const used          = sub.invoicesUsedThisMonth;
    const remaining     = isUnlimited ? Infinity : Math.max(0, limit - used);
    const now           = new Date();
    const daysUntil     = Math.max(0, Math.ceil((sub.expiresAt.getTime() - now.getTime()) / 86_400_000));

    return {
      allowed:            sub.isValid && (isUnlimited || remaining > 0),
      planName:           sub.plan.name,
      invoicesUsed:       used,
      invoicesLimit:      limit,
      invoicesRemaining:  isUnlimited ? -1 : remaining,
      isUnlimited,
      subscriptionStatus: sub.status,
      expiresAt:          sub.expiresAt,
      daysUntilExpiry:    daysUntil,
    };
  }

  // ── Increment counter after invoice created ────────────────────────────────
  async incrementInvoiceCounter(companyId: string): Promise<void> {
    await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ invoicesUsedThisMonth: () => 'invoices_used_this_month + 1' })
      .where('company_id = :companyId', { companyId })
      .execute();
  }

  // ── Reset monthly counter if 30 days passed ────────────────────────────────
  private async resetMonthlyCounterIfNeeded(sub: Subscription): Promise<void> {
    const now       = new Date();
    const lastReset = new Date(sub.lastResetAt ?? sub.startsAt);
    const daysDiff  = (now.getTime() - lastReset.getTime()) / 86_400_000;

    if (daysDiff >= 30) {
      await this.subscriptionRepo.update(sub.id, {
        invoicesUsedThisMonth: 0,
        lastResetAt: now,
      });
      sub.invoicesUsedThisMonth = 0;
    }
  }

  // ── Daily cron: expire subscriptions ──────────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions(): Promise<void> {
    const result = await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('expires_at < :now', { now: new Date() })
      .andWhere('status IN (:...statuses)', {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      })
      .execute();

    if (result?.affected && result.affected > 0) {
      this.logger.warn(`Expired ${result.affected} subscriptions`);
    }
  }

  // ── Get subscription details for frontend ─────────────────────────────────
  async getSubscriptionDetails(companyId: string) {
    const sub   = await this.getOrCreateForCompany(companyId);
    const quota = await this.checkInvoiceQuota(companyId);
    const plans = await this.planRepo.find({
      where: { isActive: true },
      order: { monthlyPrice: 'ASC' },
    });

    return {
      current: {
        id:               sub.id,
        planCode:         sub.plan.code,
        planName:         sub.plan.name,
        status:           sub.status,
        startsAt:         sub.startsAt,
        expiresAt:        sub.expiresAt,
        daysUntilExpiry:  quota.daysUntilExpiry,
        invoicesUsed:     quota.invoicesUsed,
        invoicesLimit:    quota.invoicesLimit,
        invoicesRemaining: quota.invoicesRemaining,
        isUnlimited:      quota.isUnlimited,
        monthlyPrice:     sub.plan.monthlyPrice,
        features:         sub.plan.features,
      },
      availablePlans: plans.map(p => ({
        id:               p.id,
        code:             p.code,
        name:             p.name,
        description:      p.description,
        monthlyPrice:     p.monthlyPrice,
        invoicesPerMonth: p.invoicesPerMonth,
        maxUsers:         p.maxUsers,
        features:         p.features,
        isCurrent:        p.id === sub.planId,
      })),
    };
  }

  // ── Change plan ───────────────────────────────────────────────────────────
  async upgradePlan(companyId: string, planId: string): Promise<void> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const sub = await this.getOrCreateForCompany(companyId);

    const now = new Date();
    const newExpiry = new Date(now);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    await this.subscriptionRepo.update(sub.id, {
      planId:   plan.id,
      status:   SubscriptionStatus.ACTIVE,
      startsAt: now,
      expiresAt: newExpiry,
    });
  }

  async getAllPlans() {
    return this.planRepo.find({ where: { isActive: true }, order: { monthlyPrice: 'ASC' } });
  }
}