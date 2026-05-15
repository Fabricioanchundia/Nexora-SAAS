'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Logo SVG (mismo que login) ─────────────────────────────────────────────────
function NexoraLogoMark({ size = 36 }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ll1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C8FF"/><stop offset="100%" stopColor="#1D4ED8"/>
        </linearGradient>
        <linearGradient id="ll2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#93C5FD"/>
        </linearGradient>
      </defs>
      <polygon points="28,168 28,32 68,32 68,100 132,32 172,32 172,168 132,168 132,100 68,168" fill="url(#ll1)"/>
      <polygon points="68,32 108,32 68,82" fill="url(#ll2)" opacity="0.55"/>
      <polygon points="132,168 92,168 132,118" fill="url(#ll2)" opacity="0.55"/>
      <g transform="translate(158,36)">
        <polygon points="0,-10 2.4,-2.4 10,0 2.4,2.4 0,10 -2.4,2.4 -10,0 -2.4,-2.4" fill="#BAE6FD"/>
      </g>
    </svg>
  );
}

// ── Check icon ─────────────────────────────────────────────────────────────────
function Check({ color = '#3B82F6' }: Readonly<{ color?: string }>) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ── Datos de planes ────────────────────────────────────────────────────────────
interface Plan {
  readonly name: string;
  readonly price: number;
  readonly desc: string;
  readonly features: readonly string[];
  readonly highlight: boolean;
  readonly cta: string;
}

const PLANS: readonly Plan[] = [
  {
    name: 'Gratuito', price: 0, desc: 'Para empezar a facturar',
    highlight: false, cta: 'Empezar gratis',
    features: ['20 facturas / mes', 'Autorización automática SRI', 'Descarga XML', '1 empresa · 1 usuario', 'Soporte por email'],
  },
  {
    name: 'Starter', price: 15, desc: 'Para pequeños negocios',
    highlight: true, cta: 'Elegir Starter',
    features: ['200 facturas / mes', 'Autorización automática SRI', 'Descarga XML y RIDE PDF', 'Notificaciones por email', '1 empresa · 2 usuarios', 'Soporte prioritario'],
  },
  {
    name: 'Profesional', price: 35, desc: 'Para negocios en crecimiento',
    highlight: false, cta: 'Elegir Profesional',
    features: ['1.000 facturas / mes', 'Autorización automática SRI', 'Descarga XML y RIDE PDF', 'Hasta 3 empresas · 5 usuarios', 'Soporte 24/7', 'Acceso API REST'],
  },
] as const;

// ── Features ───────────────────────────────────────────────────────────────────
interface Feature {
  readonly icon: string;
  readonly title: string;
  readonly desc: string;
}

const FEATURES: readonly Feature[] = [
  { icon: '⚡', title: 'Autorización instantánea', desc: 'Tus facturas se autorizan en el SRI en segundos. Sin esperas, sin errores manuales.' },
  { icon: '🔐', title: 'Firma XAdES-BES', desc: 'Firma digital con tu certificado del BCE. Cumplimiento total con la normativa del SRI Ecuador.' },
  { icon: '📄', title: 'XML y RIDE PDF', desc: 'Descarga el XML autorizado y el RIDE en PDF listo para enviar a tus clientes.' },
  { icon: '🏢', title: 'Multi-empresa', desc: 'Gestiona varias empresas desde una sola cuenta. Ideal para contadores y grupos empresariales.' },
  { icon: '📊', title: 'Dashboard completo', desc: 'Visualiza todas tus facturas, clientes y productos en un panel moderno e intuitivo.' },
  { icon: '🔔', title: 'Notificaciones', desc: 'Recibe alertas por email cuando tus facturas sean autorizadas o rechazadas por el SRI.' },
] as const;

// ── Testimonios ────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Carlos Mendoza', role: 'Dueño de ferretería', text: 'Antes tardaba 30 minutos en facturar. Ahora lo hago en 2 minutos desde el celular.' },
  { name: 'María Vera', role: 'Contadora independiente', text: 'Manejo 5 empresas en Nexora. La interfaz es clarísima y el soporte responde rápido.' },
  { name: 'Juan Intriago', role: 'Consultor de TI', text: 'La integración con el SRI es impecable. Cero facturas rechazadas en 6 meses.' },
] as const;

// ── Componentes ────────────────────────────────────────────────────────────────
function NavBar({ onLogin, onRegister }: Readonly<{ onLogin: () => void; onRegister: () => void }>) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', padding: '0 5%' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <NexoraLogoMark size={32} />
          <span style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.02em' }}>Nexora</span>
          <span style={{ fontSize: '11px', color: '#3B82F6', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '2px 7px', fontWeight: 700 }}>Ecuador</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button type="button" onClick={onLogin}
            style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', padding: '8px 16px', borderRadius: '8px' }}>
            Iniciar sesión
          </button>
          <button type="button" onClick={onRegister}
            style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(29,78,216,0.3)' }}>
            Empezar gratis
          </button>
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ onRegister }: Readonly<{ onRegister: () => void }>) {
  return (
    <section style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%)', padding: '100px 5% 120px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Círculos decorativos */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(59,130,246,0.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(29,78,216,0.15)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '20px', padding: '6px 16px', marginBottom: '28px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.7)', flexShrink: 0 }} />
          <span style={{ color: '#BAE6FD', fontSize: '13px', fontWeight: 600 }}>Autorizado por el SRI Ecuador · Producción</span>
        </div>

        <h1 style={{ color: '#fff', fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          Facturación electrónica<br />
          <span style={{ background: 'linear-gradient(90deg,#60A5FA,#BAE6FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            simple y autorizada
          </span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(16px,2vw,20px)', lineHeight: 1.7, margin: '0 auto 40px', maxWidth: '580px' }}>
          Emite facturas electrónicas autorizadas por el SRI en segundos. Sin complicaciones, sin papeles. Cumple con la normativa ecuatoriana desde cualquier dispositivo.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
          <button type="button" onClick={onRegister}
            style={{ background: 'linear-gradient(135deg,#fff,#E0F2FE)', color: '#1D4ED8', border: 'none', borderRadius: '14px', padding: '16px 36px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(255,255,255,0.2)', letterSpacing: '-0.01em' }}>
            Empezar gratis →
          </button>
          <a href="#features"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '16px 32px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Ver características
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { n: '100%', label: 'Cumplimiento SRI' },
            { n: '< 5s', label: 'Tiempo de autorización' },
            { n: 'Gratis', label: 'Para empezar' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ color: '#60A5FA', fontSize: '28px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{s.n}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '96px 5%', background: '#F8FAFC' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>Características</p>
          <h2 style={{ color: '#0F172A', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Todo lo que necesitas para facturar
          </h2>
          <p style={{ color: '#64748B', fontSize: '17px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
            Nexora integra todo el flujo de facturación electrónica del SRI en una plataforma moderna y fácil de usar.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#fff', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.15s, box-shadow 0.15s' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '16px' }}>
                {f.icon}
              </div>
              <h3 style={{ color: '#0F172A', fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onRegister }: Readonly<{ onRegister: () => void }>) {
  return (
    <section id="pricing" style={{ padding: '96px 5%', background: '#fff' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>Precios</p>
          <h2 style={{ color: '#0F172A', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Sin letra pequeña
          </h2>
          <p style={{ color: '#64748B', fontSize: '17px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            Empieza gratis. Crece cuando lo necesites. Sin permanencia ni contratos.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px', alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              borderRadius: '22px', padding: '32px 28px',
              background: plan.highlight ? 'linear-gradient(160deg,#0F2456,#1E40AF,#1D4ED8)' : '#fff',
              border: plan.highlight ? '2px solid #3B82F6' : '1px solid #E2E8F0',
              boxShadow: plan.highlight ? '0 16px 48px rgba(29,78,216,0.35)' : '0 2px 8px rgba(0,0,0,0.04)',
              position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#F59E0B,#FCD34D)', color: '#78350F', fontSize: '11px', fontWeight: 800, padding: '4px 18px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  ⭐ Más popular
                </div>
              )}

              <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#94A3B8', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>{plan.name}</p>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '6px' }}>
                {plan.price === 0
                  ? <span style={{ color: plan.highlight ? '#fff' : '#0F172A', fontSize: '42px', fontWeight: 900, lineHeight: 1 }}>Gratis</span>
                  : <>
                    <span style={{ color: plan.highlight ? '#93C5FD' : '#1D4ED8', fontSize: '42px', fontWeight: 900, lineHeight: 1 }}>${plan.price}</span>
                    <span style={{ color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#94A3B8', fontSize: '14px', paddingBottom: '8px' }}>USD/mes</span>
                  </>
                }
              </div>

              <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#64748B', fontSize: '14px', margin: '0 0 24px' }}>{plan.desc}</p>

              <button type="button" onClick={onRegister}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px',
                  background: plan.highlight ? 'linear-gradient(135deg,#fff,#E0F2FE)' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
                  color: plan.highlight ? '#1D4ED8' : '#fff',
                  border: 'none',
                  boxShadow: plan.highlight ? '0 4px 16px rgba(255,255,255,0.2)' : '0 4px 14px rgba(29,78,216,0.3)',
                }}>
                {plan.cta}
              </button>

              <div style={{ height: '1px', background: plan.highlight ? 'rgba(255,255,255,0.1)' : '#F1F5F9', marginBottom: '20px' }} />

              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: plan.highlight ? 'rgba(255,255,255,0.8)' : '#374151', fontSize: '14px' }}>
                    <Check color={plan.highlight ? '#60A5FA' : '#3B82F6'} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section style={{ padding: '96px 5%', background: '#F8FAFC' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>Testimonios</p>
          <h2 style={{ color: '#0F172A', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Lo que dicen nuestros clientes
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: '#fff', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {[1,2,3,4,5].map(i => <span key={i} style={{ color: '#F59E0B', fontSize: '16px' }}>★</span>)}
              </div>
              <p style={{ color: '#374151', fontSize: '15px', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A8A,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
                  {t.name[0]}
                </div>
                <div>
                  <p style={{ color: '#0F172A', fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{t.name}</p>
                  <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ onRegister }: Readonly<{ onRegister: () => void }>) {
  return (
    <section style={{ padding: '100px 5%', background: 'linear-gradient(160deg,#0F172A 0%,#1E3A8A 50%,#1D4ED8 100%)', textAlign: 'center' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ color: '#fff', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Empieza a facturar hoy mismo
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '17px', margin: '0 0 40px', lineHeight: 1.6 }}>
          Crea tu cuenta gratis en menos de 2 minutos. Sin tarjeta de crédito. Sin permanencia.
        </p>
        <button type="button" onClick={onRegister}
          style={{ background: 'linear-gradient(135deg,#fff,#E0F2FE)', color: '#1D4ED8', border: 'none', borderRadius: '14px', padding: '18px 48px', fontSize: '17px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(255,255,255,0.2)', letterSpacing: '-0.01em' }}>
          Crear cuenta gratis →
        </button>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '20px 0 0' }}>
          Plan gratuito incluye 20 facturas / mes · Sin vencimiento
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: '#0F172A', padding: '48px 5% 32px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NexoraLogoMark size={28} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}>Nexora</span>
          </div>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {['Características', 'Precios', 'Soporte'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>{l}</a>
            ))}
          </div>
        </div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '24px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>
            © {new Date().getFullYear()} Nexora Labs. Facturación electrónica para Ecuador.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>SRI Ecuador · Producción</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Page principal ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const goLogin    = useCallback(() => router.push('/login'), [router]);
  const goRegister = useCallback(() => router.push('/register'), [router]);

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', margin: 0, padding: 0 }}>
      <style>{`* { box-sizing: border-box; } html { scroll-behavior: smooth; }`}</style>
      <NavBar onLogin={goLogin} onRegister={goRegister} />
      <HeroSection onRegister={goRegister} />
      <FeaturesSection />
      <PricingSection onRegister={goRegister} />
      <TestimonialsSection />
      <CtaSection onRegister={goRegister} />
      <Footer />
    </div>
  );
}