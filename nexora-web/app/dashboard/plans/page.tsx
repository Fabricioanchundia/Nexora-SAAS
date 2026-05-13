'use client';

import { useCallback, useState } from 'react';
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
}

const PLANS: readonly Plan[] = [
  {
    code: 'FREE', name: 'Gratuito', price: 0,
    desc: 'Para comenzar a facturar',
    invoices: '20 facturas / mes',
    highlight: false,
    cta: 'Tu plan actual',
    features: [
      '20 facturas al mes',
      'Autorización automática SRI',
      'Descarga de XML',
      '1 empresa · 1 usuario',
      'Soporte por email',
    ],
    locked: ['Descarga RIDE PDF', 'Notificaciones email', 'API REST', 'Soporte prioritario'],
  },
  {
    code: 'STARTER', name: 'Starter', price: 15,
    desc: 'Para pequeños negocios',
    invoices: '200 facturas / mes',
    highlight: false,
    cta: 'Elegir Starter',
    features: [
      '200 facturas al mes',
      'Autorización automática SRI',
      'Descarga XML y RIDE PDF',
      'Notificaciones por email',
      '1 empresa · 2 usuarios',
      'Soporte prioritario',
    ],
    locked: ['API REST', 'Múltiples empresas'],
  },
  {
    code: 'PROFESSIONAL', name: 'Profesional', price: 35,
    desc: 'Para negocios en crecimiento',
    invoices: '1.000 facturas / mes',
    highlight: true, badge: 'Más popular',
    cta: 'Elegir Profesional',
    features: [
      '1.000 facturas al mes',
      'Autorización automática SRI',
      'Descarga XML y RIDE PDF',
      'Notificaciones por email',
      'Hasta 3 empresas · 5 usuarios',
      'Soporte prioritario 24/7',
      'Acceso API REST',
    ],
    locked: [],
  },
  {
    code: 'ENTERPRISE', name: 'Empresarial', price: 89,
    desc: 'Para grandes operaciones',
    invoices: 'Facturas ilimitadas',
    highlight: false,
    cta: 'Elegir Empresarial',
    features: [
      'Facturas ilimitadas',
      'Autorización automática SRI',
      'Descarga XML y RIDE PDF',
      'Notificaciones por email',
      'Empresas y usuarios ilimitados',
      'Soporte dedicado 24/7',
      'API REST completa',
      'Integración personalizada',
    ],
    locked: [],
  },
] as const;

// ── Modal de contacto / pago ──────────────────────────────────────────────────
interface ContactModalProps {
  plan: Plan;
  onClose: () => void;
}

function ContactModal({ plan, onClose }: ContactModalProps) {
  const [copied, setCopied] = useState(false);
  const email = 'fabricio@nexora.ec';
  const subject = `Quiero el plan ${plan.name} — $${plan.price}/mes`;
  const whatsappMsg = encodeURIComponent(`Hola, quiero contratar el plan ${plan.name} de Nexora ($${plan.price}/mes). ¿Cómo procedo con el pago?`);

  const handleCopyEmail = useCallback(() => {
    globalThis.navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleEmail = useCallback(() => {
    globalThis.window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  }, [subject]);

  const handleWhatsApp = useCallback(() => {
    globalThis.window.open(`https://wa.me/593999999999?text=${whatsappMsg}`, '_blank');
  }, [whatsappMsg]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '24px', padding: '32px',
        maxWidth: '440px', width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        animation: 'modalIn 0.2s ease',
      }}>
        <style>{`@keyframes modalIn { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:none; } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p id="modal-title" style={{ fontWeight: 800, color: '#0F172A', fontSize: '16px', margin: 0 }}>Contratar plan {plan.name}</p>
                <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>${plan.price} USD / mes</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info box */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#374151', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
            Para activar tu plan <strong>{plan.name}</strong>, contáctanos por cualquiera de estos medios. Te confirmaremos el pago y activaremos tu cuenta de inmediato.
          </p>
        </div>

        {/* Contact options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>

          {/* WhatsApp */}
          <button type="button" onClick={handleWhatsApp}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%', textAlign: 'left' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#15803D', fontSize: '14px', margin: '0 0 2px' }}>WhatsApp</p>
              <p style={{ color: '#64748B', fontSize: '12.5px', margin: 0 }}>Respuesta inmediata · más rápido</p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={2} style={{ marginLeft: 'auto', flexShrink: 0 }} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Email */}
          <button type="button" onClick={handleEmail}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%', textAlign: 'left' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#1D4ED8', fontSize: '14px', margin: '0 0 2px' }}>Correo electrónico</p>
              <p style={{ color: '#64748B', fontSize: '12.5px', margin: 0 }}>{email}</p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={2} style={{ marginLeft: 'auto', flexShrink: 0 }} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Copy email */}
          <button type="button" onClick={handleCopyEmail}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', background: copied ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${copied ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', width: '100%', justifyContent: 'center' }}>
            {copied ? (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span style={{ color: '#15803D', fontSize: '13px', fontWeight: 600 }}>Email copiado</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748B" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 500 }}>Copiar email</span>
              </>
            )}
          </button>
        </div>

        <p style={{ color: '#94A3B8', fontSize: '12px', textAlign: 'center', margin: 0 }}>
          Aceptamos transferencia bancaria · Payphone · Paypal
        </p>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
interface PlanCardProps {
  readonly plan: Plan;
  readonly isCurrent: boolean;
  readonly onSelect: (plan: Plan) => void;
}

function CheckIcon({ active }: Readonly<{ active: boolean }>) {
  return active ? (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#60A5FA" strokeWidth={2.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlanCard({ plan, isCurrent, onSelect }: PlanCardProps) {
  const handleClick = useCallback(() => {
    if (!isCurrent) onSelect(plan);
  }, [isCurrent, onSelect, plan]);

  // ── Paleta navy por plan ──────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = plan.highlight
    ? { background: 'linear-gradient(160deg, #1E3A8A 0%, #1E40AF 50%, #1D4ED8 100%)', border: '2px solid #3B82F6', boxShadow: '0 12px 40px rgba(29,78,216,0.4)' }
    : { background: 'linear-gradient(160deg, #0F2456 0%, #0F172A 60%, #162040 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' };

  const priceColor = plan.highlight ? '#93C5FD' : '#60A5FA';
  const btnBg = isCurrent
    ? 'rgba(255,255,255,0.08)'
    : plan.highlight
      ? 'linear-gradient(135deg,#FFFFFF,#E0F2FE)'
      : 'linear-gradient(135deg,#3B82F6,#1D4ED8)';
  const btnColor = isCurrent ? 'rgba(255,255,255,0.35)' : plan.highlight ? '#1D4ED8' : '#fff';
  const btnShadow = !isCurrent && plan.highlight ? '0 4px 16px rgba(255,255,255,0.25)' : !isCurrent ? '0 4px 14px rgba(59,130,246,0.4)' : 'none';

  return (
    <div style={{ ...cardStyle, borderRadius: '22px', padding: '26px 22px 22px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.15s' }}>

      {plan.badge && (
        <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#F59E0B,#FCD34D)', color: '#78350F', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', padding: '4px 16px', borderRadius: '20px', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
          ⭐ {plan.badge}
        </div>
      )}

      {/* Plan name */}
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>{plan.name}</p>

      {/* Price */}
      <div style={{ marginBottom: '6px' }}>
        {plan.price === 0 ? (
          <span style={{ color: '#fff', fontSize: '38px', fontWeight: 800, lineHeight: 1 }}>Gratis</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ color: priceColor, fontSize: '38px', fontWeight: 800, lineHeight: 1 }}>${plan.price}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', paddingBottom: '7px' }}>USD/mes</span>
          </div>
        )}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 20px', lineHeight: 1.5 }}>{plan.desc}</p>

      {/* CTA */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isCurrent}
        style={{ width: '100%', padding: '12px', background: btnBg, color: btnColor, border: isCurrent ? '1px solid rgba(255,255,255,0.1)' : 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: isCurrent ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: '20px', transition: 'all 0.15s', boxShadow: btnShadow }}
      >
        {isCurrent ? 'Tu plan actual ✓' : plan.cta}
      </button>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />

      {/* Invoices highlight */}
      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: priceColor, display: 'inline-block', flexShrink: 0 }} />
        {plan.invoices}
      </p>

      {/* Features */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '9px', flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
            <CheckIcon active />
            {f}
          </li>
        ))}
        {plan.locked.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
            <CheckIcon active={false} />
            <span style={{ textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.1)' }}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const handleBack = useCallback(() => router.push('/dashboard'), [router]);
  const handleClose = useCallback(() => setSelectedPlan(null), []);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '40px 32px 64px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '52px' }}>
        <p style={{ color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>PLANES Y PRECIOS</p>
        <h1 style={{ color: '#0F172A', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Elige tu plan de facturación
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          Emite facturas electrónicas autorizadas por el SRI Ecuador.<br />Sin permanencia. Cancela cuando quieras.
        </p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(235px,1fr))', gap: '20px', alignItems: 'start' }}>
        {PLANS.map(plan => (
          <PlanCard
            key={plan.code}
            plan={plan}
            isCurrent={plan.code === 'FREE'}
            onSelect={setSelectedPlan}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '16px' }}>
          Todos los planes incluyen autorización automática SRI · Sin contratos · Soporte en español
        </p>
        <button type="button" onClick={handleBack}
          style={{ background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Volver al dashboard
        </button>
      </div>

      {/* Modal */}
      {selectedPlan && (
        <ContactModal plan={selectedPlan} onClose={handleClose} />
      )}
    </div>
  );
}
