import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

// ── IMPORTANTE: usa la misma ruta que usan tus otros controllers ──────────────
// Opción A (más común en este proyecto — igual que invoices.controller.ts):
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// ── Para el company actual, usamos el Request directamente
// para evitar depender del decorador @CurrentCompany que puede tener ruta distinta
// Si tu proyecto tiene @CurrentCompany funcionando en otros módulos,
// puedes reemplazar @Request() req por @CurrentCompany() company: Company

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  /**
   * GET /api/v1/subscriptions/me
   * Devuelve el plan actual y los planes disponibles
   */
  @Get('me')
  getMySubscription(@Request() req: { company?: { id: string }; user?: { companyId?: string } }) {
    // Soporta tanto req.company.id como req.user.companyId según tu AuthGuard
    const companyId = req.company?.id ?? req.user?.companyId ?? '';
    return this.svc.getSubscriptionDetails(companyId);
  }

  /**
   * GET /api/v1/subscriptions/plans
   * Lista todos los planes activos
   */
  @Get('plans')
  getPlans() {
    return this.svc.getAllPlans();
  }

  /**
   * GET /api/v1/subscriptions/quota
   * Cuota de facturas del mes actual
   */
  @Get('quota')
  getQuota(@Request() req: { company?: { id: string }; user?: { companyId?: string } }) {
    const companyId = req.company?.id ?? req.user?.companyId ?? '';
    return this.svc.checkInvoiceQuota(companyId);
  }

  /**
   * POST /api/v1/subscriptions/upgrade
   * Cambia de plan { planId: string }
   */
  @Post('upgrade')
  upgrade(
    @Request() req: { company?: { id: string }; user?: { companyId?: string } },
    @Body('planId') planId: string,
  ) {
    const companyId = req.company?.id ?? req.user?.companyId ?? '';
    return this.svc.upgradePlan(companyId, planId);
  }
}