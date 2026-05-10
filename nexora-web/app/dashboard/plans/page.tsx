'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CurrentPlan {
  readonly planCode: string;
  readonly planName: string;
  readonly status: string;
  readonly expiresAt: string;
  readonly daysUntilExpiry: number;
  readonly invoicesUsed: number;
  readonly invoicesLimit: number;
  readonly invoicesRemaining: number;
  readonly isUnlimited: boolean;
}

interface BackendPlan {
  readonly id: string;
  readonly code: string;
  readonly monthlyPrice: number;
  readonly invoicesPerMonth: number;
  readonly features?: Record<string, boolean>;
  readonly isCurrent?: boolean;
}

// ── Planes locales (siempre visibles aunque el backend falle) ─────────────────

interface StaticPlan {
  readonly code: string;
  readonly name: string;
  readonly price: number;
  readonly priceLabel: string;
  readonly desc: string;
  readonly invoices: string;
  readonly highlight: boolean;
  readonly badge?: string;
  readonly features: readonly string[];
  readonly cta: string;
  readonly color: 'gray' | 'blue' | 'indigo' | 'dark';
}

const STATIC_PLANS: readonly StaticPlan[] = [
  {
    code: 'FREE', name: 'Gratuito', price: 0, priceLabel: '$0', desc: 'Para conocer Nexora',
    invoices: '20 facturas / mes',
    highlight: false, color: 'gray',
    cta: 'Plan actual',
    features: ['20 facturas por mes', 'Descarga XML', 'Autorización SRI automática', 'Soporte por email'],
  },
  {
    code: 'STARTER', name: 'Starter', price: 15, priceLabel: '$15', desc: 'Para pequeños negocios',
    invoices: '200 facturas / mes',
    highlight: false, color: 'blue',
    cta: 'Cambiar a Starter',
    features: ['200 facturas por mes', 'Descarga XML y RIDE PDF', 'Notificaciones por email', 'Soporte prioritario'],
  },
  {
    code: 'PROFESSIONAL', name: 'Profesional', price: 35, priceLabel: '$35', desc: 'Para negocios en crecimiento',
    invoices: '1.000 facturas / mes',
    highlight: true, badge: 'MÁS POPULAR', color: 'indigo',
    cta: 'Cambiar a Profesional',
    features: ['1.000 facturas por mes', 'Descarga XML y RIDE PDF', 'Notificaciones por email', 'Soporte prioritario 24/7', 'Múltiples empresas (hasta 3)', 'Acceso API REST'],
  },
  {
    code: 'ENTERPRISE', name: 'Empresarial', price: 89, priceLabel: '$89', desc: 'Para grandes operaciones',
    invoices: 'Facturas ilimitadas',
    highlight: false, color: 'dark',
    cta: 'Cambiar a Empresarial',
    features: ['Facturas ilimitadas', 'Descarga XML y RIDE PDF', 'Notificaciones por email', 'Soporte dedicado 24/7', 'Empresas ilimitadas', 'Acceso API REST completo', 'Usuarios ilimitados'],
  },
] as const;

// ── Colores por plan ──────────────────────────────────────────────────────────

const COLORS = {
  gray:   { card:'#1C1C1C', border:'#333', badge:'#2A2A2A', text:'#fff', sub:'rgba(255,255,255,0.55)', price:'#fff', feat:'rgba(255,255,255,0.75)', btn:'#fff', btnText:'#0F172A', btnHover:'#F1F5F9', dot:'#6B7280' },
  blue:   { card:'#1C1C1C', border:'#334155', badge:'#1E3A5F', text:'#fff', sub:'rgba(255,255,255,0.55)', price:'#fff', feat:'rgba(255,255,255,0.75)', btn:'#2563EB', btnText:'#fff', btnHover:'#1D4ED8', dot:'#3B82F6' },
  indigo: { card:'#4338CA', border:'#4338CA', badge:'rgba(255,255,255,0.15)', text:'#fff', sub:'rgba(255,255,255,0.65)', price:'#fff', feat:'rgba(255,255,255,0.85)', btn:'#fff', btnText:'#4338CA', btnHover:'#EEF2FF', dot:'#C7D2FE' },
  dark:   { card:'#0F172A', border:'#1E293B', badge:'rgba(255,255,255,0.08)', text:'#fff', sub:'rgba(255,255,255,0.5)', price:'#fff', feat:'rgba(255,255,255,0.7)', btn:'rgba(255,255,255,0.1)', btnText:'#fff', btnHover:'rgba(255,255,255,0.2)', dot:'#475569' },
} as const;

// ── Check icon ────────────────────────────────────────────────────────────────

function Check({ color }: Readonly<{ color: string }>) {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5} aria-hidden="true" style={{ flexShrink:0, marginTop:'1px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  readonly plan: StaticPlan;
  readonly isCurrent: boolean;
  readonly upgrading: string | null;
  readonly onUpgrade: (code: string) => void;
}

function PlanCard({ plan, isCurrent, upgrading, onUpgrade }: PlanCardProps) {
  const c = COLORS[plan.color];
  const handleClick = useCallback(() => onUpgrade(plan.code), [plan.code, onUpgrade]);

  return (
    <div style={{
      background: c.card,
      border: `1.5px solid ${plan.highlight ? 'transparent' : c.border}`,
      borderRadius:'20px',
      padding:'28px 24px 24px',
      display:'flex', flexDirection:'column',
      position:'relative',
      boxShadow: plan.highlight
        ? '0 0 0 2px #6366F1, 0 20px 60px rgba(99,102,241,0.3)'
        : '0 4px 24px rgba(0,0,0,0.3)',
      transition:'transform 0.2s',
    }}>
      {plan.badge && (
        <div style={{ position:'absolute', top:'-13px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', fontSize:'10px', fontWeight:700, letterSpacing:'0.1em', padding:'4px 14px', borderRadius:'20px', whiteSpace:'nowrap' }}>
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:'20px' }}>
        <p style={{ color: c.sub, fontSize:'12px', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', margin:'0 0 8px' }}>{plan.name}</p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:'4px', marginBottom:'6px' }}>
          <span style={{ color:c.price, fontSize:'42px', fontWeight:800, lineHeight:1 }}>{plan.priceLabel}</span>
          {plan.price > 0 && <span style={{ color:c.sub, fontSize:'14px', marginBottom:'6px' }}>USD /mes</span>}
        </div>
        <p style={{ color:c.sub, fontSize:'13px', margin:0 }}>{plan.desc}</p>
      </div>

      {/* CTA */}
      {isCurrent ? (
        <div style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:'12px', fontSize:'14px', fontWeight:600, textAlign:'center', marginBottom:'20px' }}>
          Tu plan actual ✓
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={upgrading !== null}
          style={{ width:'100%', padding:'12px', background:c.btn, color:c.btnText, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor: upgrading ? 'not-allowed' : 'pointer', fontFamily:'inherit', marginBottom:'20px', transition:'all 0.15s', opacity: upgrading ? 0.6 : 1 }}
        >
          {upgrading === plan.code ? 'Procesando...' : plan.cta}
        </button>
      )}

      {/* Divider */}
      <div style={{ height:'1px', background:'rgba(255,255,255,0.08)', marginBottom:'20px' }} />

      {/* Invoices highlight */}
      <p style={{ color:c.text, fontSize:'13.5px', fontWeight:600, margin:'0 0 14px', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:c.dot, display:'inline-block', flexShrink:0 }} />
        {plan.invoices}
      </p>

      {/* Features */}
      <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:'10px', flex:1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', color:c.feat, fontSize:'13px' }}>
            <Check color={plan.highlight ? '#A5B4FC' : c.dot} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PlansPage() {
  const [current,   setCurrent]   = useState<CurrentPlan | null>(null);
  const [backendIds, setBackendIds] = useState<Record<string, string>>({});
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message,   setMessage]   = useState('');
  const [msgType,   setMsgType]   = useState<'ok' | 'err'>('ok');

  useEffect(() => {
    // Cargar suscripción actual del backend (si existe)
    api.get('/subscriptions/me')
      .then(res => {
        const data = res.data;
        if (data?.current) setCurrent(data.current);
        // Mapear códigos a IDs del backend para poder hacer upgrade
        if (Array.isArray(data?.availablePlans)) {
          const map: Record<string, string> = {};
          (data.availablePlans as BackendPlan[]).forEach(p => { map[p.code] = p.id; });
          setBackendIds(map);
        }
      })
      .catch(() => {
        // Backend sin módulo de suscripciones — modo solo visual
        console.log('[Plans] Backend sin módulo de suscripciones — mostrando planes estáticos');
      });
  }, []);

  const handleUpgrade = useCallback(async (code: string) => {
    const planId = backendIds[code];
    if (!planId) {
      setMessage('Contacta a soporte para cambiar de plan: fabricio@nexora.ec');
      setMsgType('ok');
      return;
    }
    setUpgrading(code);
    setMessage('');
    try {
      await api.post('/subscriptions/upgrade', { planId });
      setMessage('¡Plan actualizado correctamente!');
      setMsgType('ok');
      // Recargar suscripción
      const res  = await api.get('/subscriptions/me');
      if (res.data?.current) setCurrent(res.data.current);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setMessage(ax.response?.data?.message ?? 'Error al cambiar de plan.');
      setMsgType('err');
    } finally {
      setUpgrading(null);
    }
  }, [backendIds]);

  const currentCode = current?.planCode ?? 'FREE';
  const usedPct = current && !current.isUnlimited && current.invoicesLimit > 0
    ? Math.min(100, Math.round((current.invoicesUsed / current.invoicesLimit) * 100))
    : 0;
  const barColor = usedPct >= 90 ? '#EF4444' : usedPct >= 70 ? '#F59E0B' : '#6366F1';

  return (
    <div style={{ minHeight:'100vh', background:'#111', fontFamily:'system-ui,-apple-system,sans-serif', padding:'40px 32px 60px' }}>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:'48px' }}>
        <p style={{ color:'#A78BFA', fontSize:'12px', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:'12px' }}>PLANES Y PRECIOS</p>
        <h1 style={{ color:'#fff', fontSize:'36px', fontWeight:800, margin:'0 0 12px', letterSpacing:'-0.02em' }}>
          Elige tu plan de facturación
        </h1>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'15px', maxWidth:'480px', margin:'0 auto' }}>
          Emite facturas electrónicas autorizadas por el SRI Ecuador. Cancela cuando quieras.
        </p>
      </div>

      {/* Current plan bar */}
      {current && (
        <div style={{ maxWidth:'900px', margin:'0 auto 40px', background:'#1C1C1C', border:'1px solid #2D2D2D', borderRadius:'16px', padding:'20px 24px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
            <div>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'11px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 4px' }}>Plan actual</p>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <p style={{ color:'#fff', fontSize:'18px', fontWeight:700, margin:0 }}>{current.planName}</p>
                <span style={{ background: current.status === 'ACTIVE' || current.status === 'TRIAL' ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)', color: current.status === 'ACTIVE' || current.status === 'TRIAL' ? '#A5B4FC' : '#FCA5A5', fontSize:'11px', fontWeight:600, padding:'3px 10px', borderRadius:'20px' }}>
                  {current.status === 'TRIAL' ? 'Prueba gratuita' : current.status === 'ACTIVE' ? 'Activo' : 'Expirado'}
                </span>
              </div>
              {current.daysUntilExpiry <= 30 && (
                <p style={{ color:'#F59E0B', fontSize:'12px', margin:'4px 0 0' }}>⚠ Vence en {current.daysUntilExpiry} días</p>
              )}
            </div>
            <div style={{ minWidth:'220px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ color:'rgba(255,255,255,0.45)', fontSize:'12px' }}>Facturas este mes</span>
                <span style={{ color:'#fff', fontSize:'12px', fontWeight:600 }}>
                  {current.invoicesUsed} / {current.isUnlimited ? '∞' : current.invoicesLimit}
                </span>
              </div>
              <div style={{ height:'6px', background:'rgba(255,255,255,0.08)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${current.isUnlimited ? 100 : usedPct}%`, background: current.isUnlimited ? '#6366F1' : barColor, borderRadius:'99px', transition:'width 0.5s' }} />
              </div>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'11px', margin:'4px 0 0' }}>
                {current.isUnlimited ? 'Sin límite' : `${current.invoicesRemaining} restantes`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div style={{ maxWidth:'900px', margin:'0 auto 24px', background: msgType==='ok' ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)', border:`1px solid ${msgType==='ok'?'rgba(99,102,241,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:'12px', padding:'12px 20px', color: msgType==='ok'?'#A5B4FC':'#FCA5A5', fontSize:'14px' }}>
          {message}
        </div>
      )}

      {/* Plans grid */}
      <div style={{ maxWidth:'1000px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'20px' }}>
        {STATIC_PLANS.map(plan => (
          <PlanCard
            key={plan.code}
            plan={plan}
            isCurrent={currentCode === plan.code}
            upgrading={upgrading}
            onUpgrade={handleUpgrade}
          />
        ))}
      </div>

      {/* Footer note */}
      <p style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:'12px', marginTop:'48px' }}>
        ¿Necesitas un plan personalizado?{' '}
        <a href="mailto:fabricio@nexora.ec" style={{ color:'rgba(99,102,241,0.8)', textDecoration:'none' }}>Contáctanos</a>
        {' '}· Todos los planes incluyen autorización automática SRI Ecuador
      </p>
    </div>
  );
}