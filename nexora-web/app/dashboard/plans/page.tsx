'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

interface Plan {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly monthlyPrice: number;
  readonly invoicesPerMonth: number;
  readonly maxUsers: number;
  readonly features: Record<string, boolean>;
  readonly isCurrent: boolean;
}

interface SubscriptionData {
  readonly current: {
    readonly planCode: string;
    readonly planName: string;
    readonly status: string;
    readonly expiresAt: string;
    readonly daysUntilExpiry: number;
    readonly invoicesUsed: number;
    readonly invoicesLimit: number;
    readonly invoicesRemaining: number;
    readonly isUnlimited: boolean;
    readonly monthlyPrice: number;
  };
  readonly availablePlans: Plan[];
}

const PLAN_FEATURES: Readonly<Record<string, string>> = {
  xmlDownload:         'Descarga de XML',
  rideDownload:        'Descarga de RIDE (PDF)',
  emailNotifications:  'Notificaciones por email',
  prioritySupport:     'Soporte prioritario',
  api:                 'Acceso a API REST',
};

const PLAN_COLORS: Readonly<Record<string, { bg: string; border: string; badge: string; btn: string }>> = {
  FREE:         { bg: 'bg-slate-50',   border: 'border-slate-200',  badge: 'bg-slate-100 text-slate-600',          btn: 'bg-slate-800 hover:bg-slate-900 text-white' },
  STARTER:      { bg: 'bg-white',      border: 'border-slate-200',  badge: 'bg-blue-50 text-blue-700',             btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  PROFESSIONAL: { bg: 'bg-blue-600',   border: 'border-blue-600',   badge: 'bg-white/20 text-white',               btn: 'bg-white text-blue-700 hover:bg-blue-50' },
  ENTERPRISE:   { bg: 'bg-slate-900',  border: 'border-slate-800',  badge: 'bg-white/10 text-white',               btn: 'bg-white text-slate-900 hover:bg-slate-100' },
};

function CheckIcon({ colored }: Readonly<{ colored?: boolean }>) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${colored ? 'text-white' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ colored }: Readonly<{ colored?: boolean }>) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${colored ? 'text-white/40' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface PlanCardProps {
  readonly plan: Plan;
  readonly onUpgrade: (planId: string) => void;
  readonly upgrading: string | null;
}

interface PlanCardColors {
  readonly isDark: boolean;
  readonly textMain: string;
  readonly textSub: string;
  readonly textFeat: string;
  readonly divider: string;
  readonly colors: typeof PLAN_COLORS[keyof typeof PLAN_COLORS];
}

function getPlanCardColors(plan: Plan): PlanCardColors {
  const colors = PLAN_COLORS[plan.code] ?? PLAN_COLORS.STARTER;
  const isDark = plan.code === 'PROFESSIONAL' || plan.code === 'ENTERPRISE';
  return {
    colors,
    isDark,
    textMain: isDark ? 'text-white' : 'text-slate-900',
    textSub: isDark ? 'text-white/70' : 'text-slate-500',
    textFeat: isDark ? 'text-white/90' : 'text-slate-700',
    divider: isDark ? 'border-white/10' : 'border-slate-100',
  };
}

function PlanHeader({ plan, colors: { textMain, textSub } }: Readonly<{ plan: Plan; colors: PlanCardColors }>) {
  return (
    <div className="mb-5">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[plan.code].badge ?? PLAN_COLORS.STARTER.badge}`}>
        {plan.name}
      </span>
      <div className="mt-4 flex items-end gap-1">
        {plan.monthlyPrice === 0 ? (
          <span className={`text-4xl font-bold ${textMain}`}>Gratis</span>
        ) : (
          <>
            <span className={`text-4xl font-bold ${textMain}`}>${plan.monthlyPrice}</span>
            <span className={`text-sm ${textSub} mb-1`}>/mes</span>
          </>
        )}
      </div>
      <p className={`text-xs ${textSub} mt-2`}>{plan.description}</p>
    </div>
  );
}

function PlanLimits({ plan, colors: { textMain, textSub, divider } }: Readonly<{ plan: Plan; colors: PlanCardColors }>) {
  const invoicesLabel = plan.invoicesPerMonth === -1 ? '∞ Facturas ilimitadas' : `${plan.invoicesPerMonth} facturas / mes`;
  let usersLabel: string;
  if (plan.maxUsers === -1) {
    usersLabel = 'Usuarios ilimitados';
  } else {
    const userWord = plan.maxUsers === 1 ? 'usuario' : 'usuarios';
    usersLabel = `Hasta ${plan.maxUsers} ${userWord}`;
  }

  return (
    <div className={`border-t ${divider} pt-4 mb-4`}>
      <p className={`text-sm font-medium ${textMain}`}>{invoicesLabel}</p>
      <p className={`text-xs ${textSub} mt-0.5`}>{usersLabel}</p>
    </div>
  );
}

function PlanFeatures({ plan, colors: { isDark, textFeat } }: Readonly<{ plan: Plan; colors: PlanCardColors }>) {
  return (
    <ul className="space-y-2.5 flex-1 mb-6">
      {Object.entries(PLAN_FEATURES).map(([key, label]) => {
        const enabled = plan.features?.[key] === true;
        const disabledClass = isDark ? 'text-white/30' : 'text-slate-300';
        const textClass = enabled ? textFeat : disabledClass;
        return (
          <li key={key} className={`flex items-center gap-2.5 text-xs ${textClass}`}>
            {enabled ? <CheckIcon colored={isDark} /> : <XIcon colored={isDark} />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function PlanCTA({ plan, colors: { isDark }, onUpgrade, upgrading }: Readonly<{ plan: Plan; colors: PlanCardColors; onUpgrade: (id: string) => void; upgrading: string | null }>) {
  const handleClick = useCallback(() => onUpgrade(plan.id), [plan.id, onUpgrade]);

  if (plan.isCurrent) {
    return (
      <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Plan actual
      </div>
    );
  }

  const btnClass = PLAN_COLORS[plan.code]?.btn ?? PLAN_COLORS.STARTER.btn;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={upgrading !== null}
      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm disabled:opacity-60 ${btnClass}`}
    >
      {(() => {
        if (upgrading === plan.id) return 'Procesando...';
        if (plan.monthlyPrice === 0) return 'Seleccionar';
        return 'Actualizar plan';
      })()}
    </button>
  );
}

function PlanCard({ plan, onUpgrade, upgrading }: PlanCardProps) {
  const colors = getPlanCardColors(plan);
  const isPro = plan.code === 'PROFESSIONAL';

  return (
    <div className={`relative rounded-2xl border-2 ${colors.colors.bg} ${colors.colors.border} p-6 flex flex-col ${isPro ? 'shadow-xl shadow-blue-600/25 scale-[1.02]' : 'shadow-sm'}`}>
      {isPro && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">
            ⭐ Más popular
          </span>
        </div>
      )}
      <PlanHeader plan={plan} colors={colors} />
      <PlanLimits plan={plan} colors={colors} />
      <PlanFeatures plan={plan} colors={colors} />
      <PlanCTA plan={plan} colors={colors} onUpgrade={onUpgrade} upgrading={upgrading} />
    </div>
  );
}

export default function PlansPage() {
  const [data, setData]         = useState<SubscriptionData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage]   = useState('');

  const loadSubscription = useCallback(async () => {
    try {
      const res = await api.get('/subscriptions/me');
      setData(res.data);
    } catch (err: unknown) {
      console.error('[PlansPage]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const handleUpgrade = useCallback(async (planId: string) => {
    setUpgrading(planId);
    setMessage('');
    try {
      await api.post('/subscriptions/upgrade', { planId });
      setMessage('Plan actualizado correctamente');
      loadSubscription();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      setMessage(axErr.response?.data?.message ?? 'Error al cambiar de plan');
    } finally {
      setUpgrading(null);
    }
  }, [loadSubscription]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando planes...</p>
        </div>
      </div>
    );
  }

  const current = data?.current;
  const plans   = data?.availablePlans ?? [];
  const usedPct = current && !current.isUnlimited
    ? Math.min(100, Math.round((current.invoicesUsed / current.invoicesLimit) * 100))
    : 0;
  let progressBarClass = 'bg-blue-600';
  if (usedPct >= 90) {
    progressBarClass = 'bg-red-500';
  } else if (usedPct >= 70) {
    progressBarClass = 'bg-amber-500';
  }
  
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'TRIAL':
        return 'Prueba gratuita';
      case 'ACTIVE':
        return 'Activo';
      default:
        return 'Expirado';
    }
  };

  const currentStatusLabel = current ? getStatusLabel(current.status) : '';

  const statusBadgeClass = current && (current.status === 'ACTIVE' || current.status === 'TRIAL')
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Planes y suscripción</h1>
        <p className="mt-1 text-sm text-slate-500">Gestiona tu plan y revisa el uso de tu cuenta</p>
      </div>

      {/* Current plan summary */}
      {current && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Plan actual</p>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">{current.planName}</h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadgeClass}`}>
                  {currentStatusLabel}
                </span>
              </div>
              {current.daysUntilExpiry <= 30 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ Vence en {current.daysUntilExpiry} días — {new Date(current.expiresAt).toLocaleDateString('es-EC')}
                </p>
              )}
            </div>

            {/* Quota bar */}
            <div className="md:w-72">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Facturas este mes</span>
                <span className="font-medium text-slate-700">
                  {current.invoicesUsed} / {current.isUnlimited ? '∞' : current.invoicesLimit}
                </span>
              </div>
              {!current.isUnlimited && (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressBarClass}`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              )}
              {current.isUnlimited && (
                <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1.5">
                {current.isUnlimited
                  ? 'Sin límite de facturas'
                  : `${current.invoicesRemaining} facturas restantes`}
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl px-4 py-3 mb-6">
          {message}
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onUpgrade={handleUpgrade}
            upgrading={upgrading}
          />
        ))}
      </div>

      {/* Contact note */}
      <p className="text-center text-xs text-slate-400 mt-8">
        ¿Necesitas un plan personalizado?{' '}
        <a href="mailto:fabricio@nexora.ec" className="text-blue-600 hover:underline">Contáctanos</a>
      </p>
    </div>
  );
}