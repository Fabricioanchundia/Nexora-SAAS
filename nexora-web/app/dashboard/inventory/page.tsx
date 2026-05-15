'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDark } from '@/lib/useDark';

export default function InventoryPage() {
  const router = useRouter();
  const dark   = useDark();

  const C = {
    bg:     dark ? '#060e25' : '#F1F5F9',
    card:   dark ? '#0d1b35' : '#ffffff',
    border: dark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
    shadow: dark ? '0 2px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
    tx1:    dark ? 'rgba(255,255,255,0.92)' : '#0F172A',
    tx2:    dark ? 'rgba(255,255,255,0.50)' : '#64748B',
    tx3:    dark ? 'rgba(255,255,255,0.28)' : '#94A3B8',
    badge:  dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
  };

  const goBack = useCallback(() => router.push('/dashboard'), [router]);

  const FEATURES = [
    { icon: '📊', title: 'Stock en tiempo real', desc: 'Monitorea el inventario de todos tus productos al instante.' },
    { icon: '⚠️', title: 'Alertas de stock mínimo', desc: 'Recibe avisos cuando un producto esté por agotarse.' },
    { icon: '🏭', title: 'Múltiples bodegas', desc: 'Gestiona varias bodegas o sucursales desde un solo panel.' },
    { icon: '📋', title: 'Historial de movimientos', desc: 'Rastrea cada entrada y salida de inventario con trazabilidad completa.' },
    { icon: '🤝', title: 'Gestión de proveedores', desc: 'Administra tus proveedores y órdenes de compra.' },
    { icon: '📈', title: 'Reportes de inventario', desc: 'Genera reportes de rotación, valorización y más.' },
  ] as const;

  return (
    <div style={{ padding: '48px 36px', background: C.bg, minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', transition: 'background 0.3s' }}>

      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>

        {/* Badge próximamente */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '28px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
          <span style={{ color: '#10B981', fontSize: '13px', fontWeight: 700 }}>Módulo en desarrollo · Próximamente</span>
        </div>

        {/* Icono */}
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg,#065F46,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px', boxShadow: '0 8px 32px rgba(5,150,105,0.4)' }}>
          📦
        </div>

        <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, color: C.tx1, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
          Control de Inventario
        </h1>
        <p style={{ color: C.tx2, fontSize: '17px', lineHeight: 1.7, margin: '0 0 48px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          Administra tus productos, stock y proveedores en tiempo real desde cualquier dispositivo. Integrado directamente con tu facturación.
        </p>

        {/* CTA notificación */}
        <div style={{ background: C.card, borderRadius: '18px', padding: '28px', border: `1px solid ${C.border}`, boxShadow: C.shadow, marginBottom: '48px' }}>
          <p style={{ color: C.tx1, fontWeight: 700, fontSize: '16px', margin: '0 0 8px' }}>¿Quieres acceso anticipado?</p>
          <p style={{ color: C.tx2, fontSize: '14px', margin: '0 0 20px', lineHeight: 1.6 }}>
            Escríbenos y te notificamos en cuanto el módulo esté disponible para tu cuenta.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="mailto:fabricio@nexora.ec?subject=Acceso anticipado Control de Inventario"
              style={{ background: 'linear-gradient(135deg,#065F46,#059669)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block', boxShadow: '0 4px 14px rgba(5,150,105,0.4)' }}>
              Solicitar acceso anticipado
            </a>
            <button type="button" onClick={goBack}
              style={{ background: C.badge, color: C.tx2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Volver al dashboard
            </button>
          </div>
        </div>

        {/* Features grid */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: C.tx1, margin: '0 0 24px', textAlign: 'left' }}>
          ¿Qué incluirá este módulo?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', textAlign: 'left' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: C.card, borderRadius: '16px', padding: '20px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{f.icon}</div>
              <p style={{ color: C.tx1, fontWeight: 700, fontSize: '14px', margin: '0 0 6px' }}>{f.title}</p>
              <p style={{ color: C.tx2, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}