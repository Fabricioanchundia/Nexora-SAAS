'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ── Iconos ─────────────────────────────────────────────────────
function IconCheck() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth={2.5} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ── Datos ──────────────────────────────────────────────────────
const MODULES = [
  {
    icon: '🧾',
    color: '#1D4ED8',
    gradient: 'linear-gradient(135deg,#1E3A8A,#1D4ED8)',
    title: 'Facturación Electrónica',
    desc: 'Emite facturas electrónicas autorizadas por el SRI de forma fácil, rápida y segura.',
    features: ['100% Cumplimiento SRI', 'Autorización automática', 'Descarga XML y RIDE PDF', 'Notas de crédito y débito', 'Reportes detallados'],
  },
  {
    icon: '📦',
    color: '#059669',
    gradient: 'linear-gradient(135deg,#065F46,#059669)',
    title: 'Control de Inventario',
    desc: 'Administra tus productos, stock y proveedores en tiempo real desde cualquier dispositivo.',
    features: ['Control de stock en tiempo real', 'Alertas de stock mínimo', 'Múltiples bodegas', 'Historial de movimientos', 'Gestión de proveedores'],
  },
  {
    icon: '🖥️',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg,#4C1D95,#7C3AED)',
    title: 'Punto de Venta',
    desc: 'Vende más rápido con nuestro sistema de ventas ágil e intuitivo para tu negocio.',
    features: ['Ventas rápidas y fáciles', 'Múltiples métodos de pago', 'Impresión de comprobantes', 'Reportes de ventas', 'Integrado con inventario'],
  },
] as const;

const TRUST_BADGES = [
  { icon: '🔒', title: 'Seguro', desc: 'Tu información y la de tu negocio siempre protegida con cifrado de nivel bancario.' },
  { icon: '☁️', title: 'En la nube', desc: 'Accede a tu sistema desde cualquier lugar y dispositivo. Sin instalaciones.' },
  { icon: '🇪🇨', title: 'Soporte local', desc: 'Atención personalizada de nuestro equipo ecuatoriano. Hablamos tu idioma.' },
  { icon: '📈', title: 'Crece sin límites', desc: 'El sistema que crece junto con tu negocio. Desde emprendedores hasta empresas.' },
] as const;

const FAQS = [
  { q: '¿Nexora está autorizado por el SRI?', a: 'Sí. Nexora opera en ambiente de producción real del SRI Ecuador. Todas las facturas son documentos oficiales con respaldo legal completo.' },
  { q: '¿Qué necesito para empezar?', a: 'Solo tu RUC activo y tu certificado digital .p12 del Banco Central del Ecuador. Si no tienes el certificado, te explicamos cómo obtenerlo.' },
  { q: '¿Puedo usarlo desde el celular?', a: 'Sí. Nexora funciona desde cualquier navegador en celular, tablet o computadora. No necesitas instalar ninguna aplicación.' },
  { q: '¿Mis datos están seguros?', a: 'Absolutamente. Tu certificado se almacena cifrado y tenemos backups automáticos diarios. Nunca compartimos tu información con terceros.' },
  { q: '¿Cuánto tiempo tarda la autorización del SRI?', a: 'Menos de 5 segundos. Nexora conecta directamente con el SRI y la factura queda autorizada en tiempo real.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Sin permanencia ni contratos. El plan gratuito no vence. Los planes de pago se cancelan en cualquier momento sin penalidad.' },
] as const;

const PLANS = [
  {
    name: 'Gratuito', price: 0, highlight: false, cta: 'Empezar gratis',
    features: ['20 facturas / mes', 'Autorización SRI automática', 'Descarga XML', '1 empresa · 1 usuario'],
  },
  {
    name: 'Starter', price: 15, highlight: true, badge: 'Más popular', cta: 'Elegir Starter',
    features: ['200 facturas / mes', 'XML y RIDE PDF', 'Control de inventario', '1 empresa · 2 usuarios', 'Soporte prioritario'],
  },
  {
    name: 'Profesional', price: 35, highlight: false, cta: 'Elegir Profesional',
    features: ['1.000 facturas / mes', 'XML, RIDE PDF y API', 'Inventario + POS', 'Hasta 3 empresas · 5 usuarios', 'Soporte 24/7'],
  },
] as const;

// ── NavBar ─────────────────────────────────────────────────────
function NavBar({ onLogin, onRegister }: Readonly<{ onLogin: () => void; onRegister: () => void }>) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,14,37,0.96)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 5%' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '4px 12px', display: 'inline-flex' }}>
          <Image src="/nexora-logo.png" alt="Nexora Labs" width={110} height={42} style={{ objectFit: 'contain' }} priority />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={onLogin}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', padding: '8px 18px', borderRadius: '8px' }}>
            Iniciar sesión
          </button>
          <button type="button" onClick={onRegister}
            style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(29,78,216,0.4)' }}>
            Empezar gratis →
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────
function HeroSection({ onRegister }: Readonly<{ onRegister: () => void }>) {
  return (
    <section style={{ background: 'linear-gradient(160deg,#04091a 0%,#060e25 30%,#0a1a45 60%,#0d2260 100%)', padding: '80px 5% 90px', position: 'relative', overflow: 'hidden' }}>
      {/* Decoración */}
      <div style={{ position: 'absolute', top: '-150px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(29,78,216,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-80px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>

        {/* Texto izquierda */}
        <div>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', padding: '6px 14px', marginBottom: '24px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.8)', flexShrink: 0 }} />
            <span style={{ color: '#86EFAC', fontSize: '12.5px', fontWeight: 600 }}>100% Cumplimiento SRI Ecuador · Producción</span>
          </div>

          <p style={{ color: 'rgba(147,197,253,0.8)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Sistema de gestión para negocios ecuatorianos
          </p>

          <h1 style={{ color: '#fff', fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, margin: '0 0 18px', lineHeight: 1.1, letterSpacing: '-0.025em' }}>
            El software que tu<br />
            <span style={{ background: 'linear-gradient(90deg,#3B82F6,#60A5FA,#BAE6FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              negocio en Ecuador
            </span><br />
            necesita para crecer
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '16px', lineHeight: 1.75, margin: '0 0 32px', maxWidth: '480px' }}>
            Facturación electrónica, control de inventario y punto de venta integrados en una sola plataforma. Autorizado por el SRI, hecho para Ecuador.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
            <button type="button" onClick={onRegister}
              style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(29,78,216,0.45)', letterSpacing: '-0.01em' }}>
              Crear cuenta gratis →
            </button>
            <a href="#modules" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 24px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Ver módulos
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            {[
              { n: '< 5s', label: 'Autorización SRI' },
              { n: '$0', label: 'Para empezar' },
              { n: '24/7', label: 'Disponibilidad' },
              { n: '100%', label: 'Legal Ecuador' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ color: '#60A5FA', fontSize: '24px', fontWeight: 900, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.n}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11.5px', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mockup dashboard derecha */}
        <div style={{ position: 'relative' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            {/* Browser bar */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['#EF4444','#F59E0B','#22C55E'].map(c => <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, opacity: 0.7 }} />)}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', maxWidth: '220px', margin: '0 auto' }}>
                🔒 app.nexora.ec
              </div>
            </div>
            {/* Dashboard */}
            <div style={{ padding: '16px', background: '#0a1628' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Resumen General</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
                {[
                  { label: 'Ventas del mes', value: '$8,456', color: '#3B82F6' },
                  { label: 'Facturas emitidas', value: '156', color: '#22C55E' },
                  { label: 'Productos', value: '1,248', color: '#F59E0B' },
                  { label: 'Clientes', value: '532', color: '#8B5CF6' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                    <p style={{ fontSize: '16px', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {/* Últimas facturas */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimas facturas</p>
                </div>
                {[
                  { seq: '001-001-0000020', client: 'María García', total: '$245.60' },
                  { seq: '001-001-0000019', client: 'Juan Pérez', total: '$1,200.00' },
                  { seq: '001-001-0000018', client: 'Empresa ABC', total: '$89.30' },
                ].map(row => (
                  <div key={row.seq} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 0.8fr', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', margin: 0 }}>{row.seq}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{row.client}</p>
                    <p style={{ fontSize: '10px', color: '#fff', fontWeight: 700, margin: 0 }}>{row.total}</p>
                    <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ADE80', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', display: 'inline-block' }}>✓ OK</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Badge flotante */}
          <div style={{ position: 'absolute', bottom: '-16px', left: '-16px', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', borderRadius: '14px', padding: '12px 18px', boxShadow: '0 8px 24px rgba(29,78,216,0.5)' }}>
            <p style={{ color: '#fff', fontSize: '11px', fontWeight: 800, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✓ Autorizado</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', margin: 0 }}>SRI Ecuador · Producción</p>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ textAlign: 'center', marginTop: '56px' }}>
        <a href="#modules" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Descubre más
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </a>
      </div>
    </section>
  );
}

// ── Módulos ────────────────────────────────────────────────────
function ModulesSection() {
  return (
    <section id="modules" style={{ background: '#060e25', padding: '88px 5%' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>Módulos</p>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            Todo lo que tu negocio necesita
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '16px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            Tres módulos poderosos, completamente integrados, en una sola plataforma.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px' }}>
          {MODULES.map(mod => (
            <div key={mod.title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '22px', padding: '32px', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: mod.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', marginBottom: '20px', boxShadow: `0 8px 24px ${mod.color}40` }}>
                {mod.icon}
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{mod.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.7, margin: '0 0 20px' }}>{mod.desc}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mod.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13.5px' }}>
                    <IconCheck />{f}
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

// ── Cómo funciona ──────────────────────────────────────────────
function HowSection() {
  const steps = [
    { num: '01', color: '#1D4ED8', title: 'Crea tu cuenta gratis', desc: 'Regístrate con tu RUC y datos de empresa. Sin tarjeta de crédito. En menos de 2 minutos estás adentro.' },
    { num: '02', color: '#7C3AED', title: 'Sube tu certificado BCE', desc: 'Sube tu certificado .p12 del Banco Central del Ecuador. Lo guardamos cifrado y lo usamos para firmar automáticamente.' },
    { num: '03', color: '#059669', title: 'Emite tu primera factura', desc: 'Selecciona cliente, agrega productos, clic en "Emitir". En menos de 5 segundos tienes tu factura autorizada por el SRI.' },
  ] as const;

  return (
    <section style={{ background: '#04091a', padding: '88px 5%' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>Proceso</p>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            Empieza en 3 pasos simples
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', maxWidth: '460px', margin: '0 auto', lineHeight: 1.6 }}>
            Sin instalaciones, sin configuraciones complicadas, sin experiencia técnica requerida.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>
          {steps.map(step => (
            <div key={step.num} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: `${step.color}20`, border: `2px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '17px', fontWeight: 900, color: step.color }}>{step.num}</span>
                </div>
                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{step.title}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Trust badges ───────────────────────────────────────────────
function TrustSection() {
  return (
    <section style={{ background: 'linear-gradient(135deg,#060e25,#0a1a45)', padding: '64px 5%' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '24px' }}>
          {TRUST_BADGES.map(b => (
            <div key={b.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {b.icon}
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>{b.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Precios ────────────────────────────────────────────────────
function PricingSection({ onRegister }: Readonly<{ onRegister: () => void }>) {
  return (
    <section id="pricing" style={{ background: '#060e25', padding: '88px 5%' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>Precios justos</p>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            Planes accesibles para todos
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            Sin permanencia, sin contratos. Empieza gratis y crece cuando lo necesites.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px', alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              borderRadius: '22px', padding: '30px 26px', position: 'relative',
              background: plan.highlight ? 'linear-gradient(160deg,#1E3A8A,#1D4ED8)' : 'rgba(255,255,255,0.03)',
              border: plan.highlight ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: plan.highlight ? '0 16px 48px rgba(29,78,216,0.4)' : 'none',
            }}>
              {'badge' in plan && (
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#F59E0B,#FCD34D)', color: '#78350F', fontSize: '11px', fontWeight: 800, padding: '4px 16px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  ⭐ {plan.badge}
                </div>
              )}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>{plan.name}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '20px' }}>
                {plan.price === 0
                  ? <span style={{ color: '#fff', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>Gratis</span>
                  : <><span style={{ color: plan.highlight ? '#BAE6FD' : '#60A5FA', fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>${plan.price}</span><span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', paddingBottom: '7px' }}>USD/mes</span></>
                }
              </div>
              <button type="button" onClick={onRegister}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '20px', border: 'none', background: plan.highlight ? '#fff' : 'rgba(59,130,246,0.2)', color: plan.highlight ? '#1D4ED8' : '#60A5FA' }}>
                {plan.cta}
              </button>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13.5px' }}>
                    <IconCheck />{f}
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

// ── FAQ ────────────────────────────────────────────────────────
function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" style={{ background: '#04091a', padding: '88px 5%' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <p style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>FAQ</p>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            Preguntas frecuentes
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((faq, i) => (
            <div key={faq.q} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: `1px solid ${open === i ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', gap: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: open === i ? '#60A5FA' : 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{faq.q}</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={open === i ? '#3B82F6' : 'rgba(255,255,255,0.3)'} strokeWidth={2} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(180deg)' : 'none' }} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 18px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14.5px', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Final ──────────────────────────────────────────────────
function CtaSection({ onRegister, onLogin }: Readonly<{ onRegister: () => void; onLogin: () => void }>) {
  return (
    <section style={{ background: 'linear-gradient(135deg,#060e25 0%,#0a1a45 50%,#1D4ED8 100%)', padding: '88px 5%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 100%,rgba(59,130,246,0.2),transparent)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', padding: '6px 14px', marginBottom: '24px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.8)', flexShrink: 0 }} />
          <span style={{ color: '#86EFAC', fontSize: '12.5px', fontWeight: 600 }}>Más control · Más ventas · Más crecimiento</span>
        </div>
        <h2 style={{ color: '#fff', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          Digitaliza tu negocio hoy mismo
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '16px', margin: '0 0 36px', lineHeight: 1.6 }}>
          Únete a cientos de negocios ecuatorianos que ya confían en Nexora. Crea tu cuenta gratis en menos de 2 minutos.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={onRegister}
            style={{ background: 'linear-gradient(135deg,#fff,#E0F2FE)', color: '#1D4ED8', border: 'none', borderRadius: '14px', padding: '16px 40px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(255,255,255,0.15)' }}>
            Crear cuenta gratis →
          </button>
          <button type="button" onClick={onLogin}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '16px 28px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ya tengo cuenta
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', margin: '20px 0 0' }}>
          Sin tarjeta de crédito · Plan gratuito sin vencimiento · Hecho para Ecuador 🇪🇨
        </p>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#02050f', padding: '48px 5% 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px', marginBottom: '40px' }}>
          <div style={{ maxWidth: '280px' }}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '5px 12px', display: 'inline-block', marginBottom: '14px' }}>
              <Image src="/nexora-logo.png" alt="Nexora Labs" width={110} height={40} style={{ objectFit: 'contain', display: 'block' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', lineHeight: 1.65, margin: '0 0 14px' }}>
              Sistema de gestión para negocios ecuatorianos. Facturación electrónica, inventario y punto de venta integrados.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>SRI Ecuador · Producción</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Producto</p>
              {['#modules','#pricing','#faq'].map((h, i) => (
                <a key={h} href={h} style={{ display: 'block', color: 'rgba(255,255,255,0.25)', fontSize: '13.5px', textDecoration: 'none', marginBottom: '10px' }}>
                  {['Módulos','Precios','FAQ'][i]}
                </a>
              ))}
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Contacto</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13.5px', margin: '0 0 8px' }}>fabricio@nexora.ec</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13.5px', margin: '0 0 8px' }}>WhatsApp disponible</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13.5px', margin: 0 }}>Manta, Ecuador 🇪🇨</p>
            </div>
          </div>
        </div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '20px' }} />
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12.5px', margin: 0, textAlign: 'center' }}>
          © {new Date().getFullYear()} Nexora Labs. Todos los derechos reservados. Hecho con ❤️ en Ecuador.
        </p>
      </div>
    </footer>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function LandingPage() {
  const router     = useRouter();
  const goLogin    = useCallback(() => router.push('/login'), [router]);
  const goRegister = useCallback(() => router.push('/register'), [router]);

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', margin: 0, padding: 0 }}>
      <style>{`* { box-sizing: border-box; } html { scroll-behavior: smooth; }`}</style>
      <NavBar onLogin={goLogin} onRegister={goRegister} />
      <HeroSection onRegister={goRegister} />
      <ModulesSection />
      <HowSection />
      <TrustSection />
      <PricingSection onRegister={goRegister} />
      <FaqSection />
      <CtaSection onRegister={goRegister} onLogin={goLogin} />
      <Footer />
    </div>
  );
}