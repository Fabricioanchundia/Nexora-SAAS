'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  readonly code: string;
  readonly name: string;
  readonly price: number;
  readonly desc: string;
  readonly invoices: string;
  readonly highlight: boolean;
  readonly badge?: string;
  readonly features: readonly string[];
  readonly locked: readonly string[];
  readonly cta: string;
  readonly ctaHref?: string;
}

const PLANS: readonly Plan[] = [
  {
    code: 'FREE', name: 'Gratuito', price: 0,
    desc: 'Para comenzar a facturar electrónicamente',
    invoices: '20 facturas / mes',
    highlight: false,
    cta: 'Tu plan actual',
    features: [
      '20 facturas electrónicas al mes',
      'Autorización automática SRI',
      'Descarga de XML',
      '1 empresa',
      '1 usuario',
      'Soporte por email',
    ],
    locked: ['Descarga RIDE PDF', 'Notificaciones email', 'API REST', 'Soporte prioritario'],
  },
  {
    code: 'STARTER', name: 'Starter', price: 15,
    desc: 'Para pequeños negocios y emprendedores',
    invoices: '200 facturas / mes',
    highlight: false,
    cta: 'Contratar Starter',
    ctaHref: 'mailto:fabricio@nexora.ec?subject=Quiero el plan Starter',
    features: [
      '200 facturas electrónicas al mes',
      'Autorización automática SRI',
      'Descarga XML y RIDE PDF',
      'Notificaciones por email',
      '1 empresa',
      'Hasta 2 usuarios',
      'Soporte prioritario',
    ],
    locked: ['API REST', 'Múltiples empresas'],
  },
  {
    code: 'PROFESSIONAL', name: 'Profesional', price: 35,
    desc: 'Para negocios en crecimiento',
    invoices: '1.000 facturas / mes',
    highlight: true, badge: 'Más popular',
    cta: 'Contratar Profesional',
    ctaHref: 'mailto:fabricio@nexora.ec?subject=Quiero el plan Profesional',
    features: [
      '1.000 facturas electrónicas al mes',
      'Autorización automática SRI',
      'Descarga XML y RIDE PDF',
      'Notificaciones por email',
      'Hasta 3 empresas',
      'Hasta 5 usuarios',
      'Soporte prioritario 24/7',
      'Acceso API REST',
    ],
    locked: [],
  },
  {
    code: 'ENTERPRISE', name: 'Empresarial', price: 89,
    desc: 'Para grandes operaciones sin límites',
    invoices: 'Facturas ilimitadas',
    highlight: false,
    cta: 'Contratar Empresarial',
    ctaHref: 'mailto:fabricio@nexora.ec?subject=Quiero el plan Empresarial',
    features: [
      'Facturas ilimitadas',
      'Autorización automática SRI',
      'Descarga XML y RIDE PDF',
      'Notificaciones por email',
      'Empresas ilimitadas',
      'Usuarios ilimitados',
      'Soporte dedicado 24/7',
      'API REST completa',
      'Integración personalizada',
    ],
    locked: [],
  },
] as const;

function CheckIcon({ active }: Readonly<{ active: boolean }>) {
  return active ? (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={2.5} aria-hidden="true" style={{ flexShrink:0, marginTop:'2px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
    </svg>
  ) : (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#CBD5E1" strokeWidth={2} aria-hidden="true" style={{ flexShrink:0, marginTop:'2px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  );
}

interface PlanCardProps {
  readonly plan: Plan;
  readonly isCurrent: boolean;
}

function PlanCard({ plan, isCurrent }: PlanCardProps) {
  const handleCta = useCallback(() => {
    if (plan.ctaHref) globalThis.window.location.href = plan.ctaHref;
  }, [plan.ctaHref]);

  const border  = plan.highlight ? '2px solid #2563EB' : '1px solid #E2E8F0';
  const shadow  = plan.highlight ? '0 8px 32px rgba(37,99,235,0.15)' : '0 2px 8px rgba(0,0,0,0.04)';
  const btnBg   = isCurrent ? '#F1F5F9' : plan.highlight ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#0F172A';
  const btnTxt  = isCurrent ? '#94A3B8' : '#fff';

  return (
    <div style={{ background:'#fff', border, borderRadius:'20px', padding:'28px 24px 24px', display:'flex', flexDirection:'column', position:'relative', boxShadow:shadow, transition:'transform 0.15s' }}>
      {plan.badge && (
        <div style={{ position:'absolute', top:'-13px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'#fff', fontSize:'11px', fontWeight:700, letterSpacing:'0.06em', padding:'4px 16px', borderRadius:'20px', whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(37,99,235,0.3)' }}>
          ⭐ {plan.badge}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:'20px' }}>
        <p style={{ color:'#64748B', fontSize:'11px', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 10px' }}>{plan.name}</p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:'4px', marginBottom:'6px' }}>
          {plan.price === 0 ? (
            <span style={{ color:'#0F172A', fontSize:'36px', fontWeight:800, lineHeight:1 }}>Gratis</span>
          ) : (
            <>
              <span style={{ color: plan.highlight ? '#2563EB' : '#0F172A', fontSize:'36px', fontWeight:800, lineHeight:1 }}>${plan.price}</span>
              <span style={{ color:'#94A3B8', fontSize:'13px', paddingBottom:'6px' }}>USD/mes</span>
            </>
          )}
        </div>
        <p style={{ color:'#64748B', fontSize:'13px', margin:0, lineHeight:1.5 }}>{plan.desc}</p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={isCurrent ? undefined : handleCta}
        disabled={isCurrent}
        style={{ width:'100%', padding:'12px', background:btnBg, color:btnTxt, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor: isCurrent ? 'not-allowed' : 'pointer', fontFamily:'inherit', marginBottom:'20px', transition:'all 0.15s', boxShadow: plan.highlight && !isCurrent ? '0 4px 14px rgba(37,99,235,0.3)' : 'none' }}>
        {isCurrent ? 'Tu plan actual ✓' : plan.cta}
      </button>

      {/* Divider */}
      <div style={{ height:'1px', background:'#F1F5F9', marginBottom:'16px' }}/>

      {/* Invoices */}
      <p style={{ color:'#0F172A', fontSize:'13px', fontWeight:700, margin:'0 0 14px', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: plan.highlight ? '#2563EB' : '#0F172A', display:'inline-block', flexShrink:0 }}/>
        {plan.invoices}
      </p>

      {/* Features */}
      <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:'9px', flex:1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', color:'#374151', fontSize:'13px' }}>
            <CheckIcon active/>
            {f}
          </li>
        ))}
        {plan.locked.map(f => (
          <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', color:'#CBD5E1', fontSize:'13px' }}>
            <CheckIcon active={false}/>
            <span style={{ textDecoration:'line-through', textDecorationColor:'#E2E8F0' }}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PlansPage() {
  const router = useRouter();
  const handleBack = useCallback(() => router.push('/dashboard'), [router]);

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', fontFamily:'system-ui,-apple-system,sans-serif', padding:'40px 32px 64px' }}>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:'48px' }}>
        <p style={{ color:'#2563EB', fontSize:'12px', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:'12px' }}>PLANES Y PRECIOS</p>
        <h1 style={{ color:'#0F172A', fontSize:'clamp(26px,4vw,38px)', fontWeight:800, margin:'0 0 12px', letterSpacing:'-0.02em', lineHeight:1.15 }}>
          Elige tu plan de facturación
        </h1>
        <p style={{ color:'#64748B', fontSize:'15px', maxWidth:'480px', margin:'0 auto', lineHeight:1.6 }}>
          Emite facturas electrónicas autorizadas por el SRI Ecuador.<br/>Sin permanencia. Cancela cuando quieras.
        </p>
      </div>

      {/* Plans grid */}
      <div style={{ maxWidth:'1040px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:'20px', alignItems:'start' }}>
        {PLANS.map(plan => (
          <PlanCard key={plan.code} plan={plan} isCurrent={plan.code === 'FREE'} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign:'center', marginTop:'48px' }}>
        <p style={{ color:'#94A3B8', fontSize:'13px', marginBottom:'16px' }}>
          Todos los planes incluyen autorización automática SRI · Sin contratos · Soporte en español
        </p>
        <p style={{ color:'#64748B', fontSize:'13px', margin:'0 0 16px' }}>
          ¿Tienes dudas? Escríbenos a{' '}
          <a href="mailto:fabricio@nexora.ec" style={{ color:'#2563EB', textDecoration:'none', fontWeight:600 }}>fabricio@nexora.ec</a>
        </p>
        <button type="button" onClick={handleBack}
          style={{ background:'transparent', border:'1px solid #E2E8F0', borderRadius:'10px', padding:'9px 20px', fontSize:'13px', color:'#64748B', cursor:'pointer', fontFamily:'inherit' }}>
          ← Volver al dashboard
        </button>
      </div>
    </div>
  );
}