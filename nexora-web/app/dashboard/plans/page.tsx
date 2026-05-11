'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

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
}

interface StaticPlan {
  readonly code: string;
  readonly name: string;
  readonly price: number;
  readonly desc: string;
  readonly invoices: string;
  readonly cta: string;
  readonly highlight: boolean;
  readonly badge?: string;
  readonly features: readonly string[];
  readonly locked: readonly string[];
}

const PLANS: readonly StaticPlan[] = [
  {
    code: 'FREE', name: 'Gratuito', price: 0, desc: 'Para empezar a facturar',
    invoices: '20 facturas / mes', cta: 'Plan actual', highlight: false,
    features: ['20 facturas por mes', 'Descarga de XML', 'Autorización SRI automática', 'Soporte por email'],
    locked: ['RIDE PDF', 'Notificaciones email', 'Soporte prioritario', 'API REST'],
  },
  {
    code: 'STARTER', name: 'Starter', price: 15, desc: 'Para pequeños negocios',
    invoices: '200 facturas / mes', cta: 'Elegir Starter', highlight: false,
    features: ['200 facturas por mes', 'Descarga XML y RIDE PDF', 'Notificaciones por email', 'Soporte prioritario'],
    locked: ['Múltiples empresas', 'API REST completa', 'Usuarios adicionales'],
  },
  {
    code: 'PROFESSIONAL', name: 'Profesional', price: 35, desc: 'Para negocios en crecimiento',
    invoices: '1.000 facturas / mes', cta: 'Elegir Profesional', highlight: true, badge: 'Más popular',
    features: ['1.000 facturas por mes', 'Descarga XML y RIDE PDF', 'Notificaciones por email', 'Soporte prioritario 24/7', 'Hasta 3 empresas', 'API REST completa', 'Hasta 5 usuarios'],
    locked: [],
  },
  {
    code: 'ENTERPRISE', name: 'Empresarial', price: 89, desc: 'Sin límites para tu negocio',
    invoices: 'Facturas ilimitadas', cta: 'Elegir Empresarial', highlight: false,
    features: ['Facturas ilimitadas', 'Descarga XML y RIDE PDF', 'Notificaciones por email', 'Soporte dedicado 24/7', 'Empresas ilimitadas', 'API REST completa', 'Usuarios ilimitados'],
    locked: [],
  },
] as const;

function CheckIcon({ active }: Readonly<{ active: boolean }>) {
  return active ? (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth={2.5} aria-hidden="true" style={{ flexShrink:0, marginTop:'2px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth={2} aria-hidden="true" style={{ flexShrink:0, marginTop:'2px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-7V7a2 2 0 00-2-2H7a2 2 0 00-2 2v3" />
    </svg>
  );
}

interface PlanCardProps {
  readonly plan: StaticPlan;
  readonly isCurrent: boolean;
  readonly isUpgrade: boolean;
  readonly upgrading: string | null;
  readonly onUpgrade: (code: string) => void;
}

function PlanCard({ plan, isCurrent, isUpgrade, upgrading, onUpgrade }: PlanCardProps) {
  const handleClick = useCallback(() => onUpgrade(plan.code), [plan.code, onUpgrade]);

  // Colores del sistema Nexora — azul/índigo oscuro
  const bg      = plan.highlight ? 'linear-gradient(145deg, #1E3A8A 0%, #312E81 100%)' : 'linear-gradient(145deg, #0F1E3C 0%, #131B35 100%)';
  const border  = plan.highlight ? '2px solid #6366F1' : '1px solid rgba(255,255,255,0.08)';
  const shadow  = plan.highlight ? '0 0 0 1px #6366F1, 0 20px 60px rgba(99,102,241,0.25)' : '0 4px 20px rgba(0,0,0,0.4)';
  const priceC  = plan.highlight ? '#A5B4FC' : '#60A5FA';
  const btnBg   = plan.highlight
    ? 'linear-gradient(135deg, #4F46E5, #6366F1)'
    : isCurrent
      ? 'rgba(255,255,255,0.07)'
      : 'rgba(59,130,246,0.15)';
  const btnTxt  = isCurrent ? 'rgba(255,255,255,0.4)' : '#fff';
  const btnBdr  = isCurrent ? '1px solid rgba(255,255,255,0.1)' : plan.highlight ? 'none' : '1px solid rgba(59,130,246,0.4)';

  return (
    <div style={{ background:bg, border, borderRadius:'20px', padding:'28px 22px 24px', display:'flex', flexDirection:'column', position:'relative', boxShadow:shadow, transition:'transform 0.2s' }}>
      {plan.badge && (
        <div style={{ position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', fontSize:'11px', fontWeight:700, letterSpacing:'0.08em', padding:'5px 16px', borderRadius:'20px', whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(99,102,241,0.5)' }}>
          ⭐ {plan.badge}
        </div>
      )}

      {/* Plan name + price */}
      <div style={{ marginBottom:'20px' }}>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'11px', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 10px' }}>{plan.name}</p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:'4px', marginBottom:'6px' }}>
          {plan.price === 0 ? (
            <span style={{ color:'#fff', fontSize:'38px', fontWeight:800, lineHeight:1 }}>Gratis</span>
          ) : (
            <>
              <span style={{ color:priceC, fontSize:'38px', fontWeight:800, lineHeight:1 }}>${plan.price}</span>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'13px', paddingBottom:'6px' }}>USD/mes</span>
            </>
          )}
        </div>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'13px', margin:0 }}>{plan.desc}</p>
      </div>

      {/* CTA */}
      <button type="button" onClick={isCurrent ? undefined : handleClick}
        disabled={isCurrent || upgrading !== null}
        style={{ width:'100%', padding:'12px', background:btnBg, color:btnTxt, border:btnBdr, borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor: isCurrent||upgrading?'not-allowed':'pointer', fontFamily:'inherit', marginBottom:'22px', transition:'all 0.15s', opacity: upgrading&&upgrading!==plan.code ? 0.5 : 1, boxShadow: plan.highlight?'0 4px 16px rgba(99,102,241,0.4)':'none' }}>
        {upgrading === plan.code ? 'Procesando...' : isCurrent ? 'Tu plan actual ✓' : plan.cta}
      </button>

      {/* Divider */}
      <div style={{ height:'1px', background:'rgba(255,255,255,0.07)', marginBottom:'18px' }} />

      {/* Invoices */}
      <p style={{ color:'#fff', fontSize:'13px', fontWeight:600, margin:'0 0 14px', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: plan.highlight?'#818CF8':'#3B82F6', display:'inline-block', flexShrink:0, boxShadow: plan.highlight?'0 0 8px #818CF8':'none' }} />
        {plan.invoices}
      </p>

      {/* Features incluidas */}
      <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:'9px', flex:1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', color:'rgba(255,255,255,0.85)', fontSize:'13px' }}>
            <CheckIcon active />
            {f}
          </li>
        ))}
        {/* Features bloqueadas — muestran qué se desbloquea al subir */}
        {plan.locked.map(f => (
          <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', color:'rgba(255,255,255,0.22)', fontSize:'13px' }}>
            <CheckIcon active={false} />
            <span style={{ textDecoration:'line-through', textDecorationColor:'rgba(255,255,255,0.15)' }}>{f}</span>
          </li>
        ))}
      </ul>

      {/* Upgrade hint */}
      {isUpgrade && !isCurrent && (
        <div style={{ marginTop:'16px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'10px', padding:'8px 12px', color:'#A5B4FC', fontSize:'11.5px', textAlign:'center' }}>
          🔓 Desbloquea más funciones al actualizar
        </div>
      )}
    </div>
  );
}

export default function PlansPage() {
  const [current,    setCurrent]    = useState<CurrentPlan | null>(null);
  const [backendIds, setBackendIds] = useState<Record<string, string>>({});
  const [upgrading,  setUpgrading]  = useState<string | null>(null);
  const [message,    setMessage]    = useState('');
  const [msgOk,      setMsgOk]      = useState(true);

  useEffect(() => {
    api.get('/subscriptions/me')
      .then(res => {
        const data = res.data;
        if (data?.current) setCurrent(data.current);
        if (Array.isArray(data?.availablePlans)) {
          const map: Record<string, string> = {};
          (data.availablePlans as BackendPlan[]).forEach(p => { map[p.code] = p.id; });
          setBackendIds(map);
        }
      })
      .catch(() => console.log('[Plans] sin módulo de suscripciones — modo visual'));
  }, []);

  const handleUpgrade = useCallback(async (code: string) => {
    const planId = backendIds[code];
    if (!planId) {
      setMessage(`Para cambiar al plan ${code}, escríbenos a fabricio@nexora.ec`);
      setMsgOk(true);
      return;
    }
    setUpgrading(code);
    setMessage('');
    try {
      await api.post('/subscriptions/upgrade', { planId });
      setMessage('¡Plan actualizado correctamente!');
      setMsgOk(true);
      const res = await api.get('/subscriptions/me');
      if (res.data?.current) setCurrent(res.data.current);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setMessage(ax.response?.data?.message ?? 'Error al cambiar de plan.');
      setMsgOk(false);
    } finally { setUpgrading(null); }
  }, [backendIds]);

  const currentCode  = current?.planCode ?? 'FREE';
  const currentIndex = PLANS.findIndex(p => p.code === currentCode);
  const usedPct = current && !current.isUnlimited && current.invoicesLimit > 0
    ? Math.min(100, Math.round((current.invoicesUsed / current.invoicesLimit) * 100))
    : 0;
  const barColor = usedPct >= 90 ? '#EF4444' : usedPct >= 70 ? '#F59E0B' : '#6366F1';

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(170deg, #060C1F 0%, #0A1128 50%, #060C1F 100%)', fontFamily:'system-ui,-apple-system,sans-serif', padding:'44px 32px 64px' }}>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:'50px' }}>
        <p style={{ color:'#818CF8', fontSize:'11px', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:'14px' }}>PLANES Y PRECIOS</p>
        <h1 style={{ color:'#fff', fontSize:'clamp(28px,4vw,40px)', fontWeight:800, margin:'0 0 14px', letterSpacing:'-0.02em', lineHeight:1.1 }}>
          Elige tu plan de facturación
        </h1>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'15px', maxWidth:'480px', margin:'0 auto', lineHeight:1.6 }}>
          Emite facturas electrónicas autorizadas por el SRI Ecuador.<br />Sin permanencia. Cancela cuando quieras.
        </p>
      </div>

      {/* Current plan status */}
      {current && (
        <div style={{ maxWidth:'920px', margin:'0 auto 40px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'20px 24px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
            <div>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'11px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 4px' }}>Plan activo</p>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ color:'#fff', fontSize:'17px', fontWeight:700 }}>{current.planName}</span>
                <span style={{ background:'rgba(99,102,241,0.2)', color:'#A5B4FC', fontSize:'11px', fontWeight:600, padding:'3px 10px', borderRadius:'20px', border:'1px solid rgba(99,102,241,0.3)' }}>
                  {current.status === 'TRIAL' ? 'Prueba gratuita' : current.status === 'ACTIVE' ? 'Activo' : 'Expirado'}
                </span>
              </div>
              {current.daysUntilExpiry <= 30 && (
                <p style={{ color:'#F59E0B', fontSize:'12px', margin:'4px 0 0' }}>⚠ Vence en {current.daysUntilExpiry} días</p>
              )}
            </div>
            <div style={{ minWidth:'220px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px' }}>Uso mensual</span>
                <span style={{ color:'#fff', fontSize:'12px', fontWeight:600 }}>
                  {current.invoicesUsed} / {current.isUnlimited ? '∞' : current.invoicesLimit} facturas
                </span>
              </div>
              <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${current.isUnlimited ? 100 : usedPct}%`, background: current.isUnlimited ? 'linear-gradient(90deg,#4F46E5,#818CF8)' : barColor, borderRadius:'99px', transition:'width 0.6s' }} />
              </div>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'11px', margin:'4px 0 0' }}>
                {current.isUnlimited ? 'Sin límite de facturas' : `${current.invoicesRemaining} facturas restantes este mes`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div style={{ maxWidth:'920px', margin:'0 auto 28px', background: msgOk?'rgba(99,102,241,0.12)':'rgba(239,68,68,0.12)', border:`1px solid ${msgOk?'rgba(99,102,241,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:'12px', padding:'12px 20px', color: msgOk?'#A5B4FC':'#FCA5A5', fontSize:'14px', textAlign:'center' }}>
          {message}
        </div>
      )}

      {/* Plans grid */}
      <div style={{ maxWidth:'1000px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'20px', alignItems:'start' }}>
        {PLANS.map((plan, i) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            isCurrent={currentCode === plan.code}
            isUpgrade={i > currentIndex}
            upgrading={upgrading}
            onUpgrade={handleUpgrade}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign:'center', marginTop:'48px' }}>
        <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'12px', margin:'0 0 8px' }}>
          Todos los planes incluyen autorización automática SRI · Datos seguros · Sin contratos
        </p>
        <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'12px', margin:0 }}>
          ¿Necesitas algo personalizado?{' '}
          <a href="mailto:fabricio@nexora.ec" style={{ color:'#818CF8', textDecoration:'none' }}>Contáctanos</a>
        </p>
      </div>
    </div>
  );
}