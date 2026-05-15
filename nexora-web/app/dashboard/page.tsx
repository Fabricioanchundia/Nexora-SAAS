'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDark } from '@/lib/useDark';
import api from '@/lib/api';

interface Invoice {
  readonly id: string;
  readonly sequential: string;
  readonly total: number;
  readonly status: string;
  readonly customer: { readonly fullName: string };
}

const STATUS_MAP: Readonly<Record<string, { label: string; bg: string; dot: string; text: string; darkBg: string; darkText: string }>> = {
  AUTHORIZED:   { label: 'Autorizada',  bg: '#F0FDF4', dot: '#22C55E', text: '#15803D', darkBg: 'rgba(34,197,94,0.15)',  darkText: '#4ADE80' },
  REJECTED:     { label: 'Rechazada',   bg: '#FEF2F2', dot: '#EF4444', text: '#B91C1C', darkBg: 'rgba(239,68,68,0.15)',   darkText: '#F87171' },
  ERROR:        { label: 'Error',       bg: '#FEF2F2', dot: '#EF4444', text: '#B91C1C', darkBg: 'rgba(239,68,68,0.15)',   darkText: '#F87171' },
  PROCESSING:   { label: 'Procesando',  bg: '#EFF6FF', dot: '#3B82F6', text: '#1D4ED8', darkBg: 'rgba(59,130,246,0.15)',  darkText: '#60A5FA' },
  SUBMITTED:    { label: 'Enviada SRI', bg: '#EFF6FF', dot: '#3B82F6', text: '#1D4ED8', darkBg: 'rgba(59,130,246,0.15)',  darkText: '#60A5FA' },
  PENDING_SIGN: { label: 'Pendiente',   bg: '#FFFBEB', dot: '#F59E0B', text: '#B45309', darkBg: 'rgba(245,158,11,0.15)',  darkText: '#FCD34D' },
  DRAFT:        { label: 'Borrador',    bg: '#F8FAFC', dot: '#94A3B8', text: '#475569', darkBg: 'rgba(148,163,184,0.1)',  darkText: '#94A3B8' },
};

function parseInvoices(data: unknown): Invoice[] {
  if (Array.isArray(data)) return data as Invoice[];
  const d = data as Record<string, unknown> | null;
  if (d !== null && Array.isArray(d?.data))     return d.data as Invoice[];
  if (d !== null && Array.isArray(d?.invoices)) return d.invoices as Invoice[];
  return [];
}

function getGreeting(h: number): string {
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function DashboardPage() {
  const router = useRouter();
  const dark   = useDark();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [userName, setUserName] = useState('');

  // ── Paleta según tema ───────────────────────────────────────
  const C = {
    bg:      dark ? '#060e25'                   : '#F1F5F9',
    card:    dark ? '#0d1b35'                   : '#ffffff',
    border:  dark ? 'rgba(255,255,255,0.07)'    : '#F1F5F9',
    shadow:  dark ? '0 2px 16px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.05)',
    tx1:     dark ? 'rgba(255,255,255,0.92)'    : '#0F172A',
    tx2:     dark ? 'rgba(255,255,255,0.50)'    : '#64748B',
    tx3:     dark ? 'rgba(255,255,255,0.28)'    : '#94A3B8',
    divider: dark ? 'rgba(255,255,255,0.06)'    : '#F8FAFC',
    tblHead: dark ? 'rgba(255,255,255,0.03)'    : '#F8FAFC',
    hover:   dark ? 'rgba(255,255,255,0.04)'    : '#F8FAFC',
    badge:   dark ? 'rgba(255,255,255,0.06)'    : '#F8FAFC',
    progBg:  dark ? 'rgba(255,255,255,0.08)'    : '#E2E8F0',
  };

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/invoices?page=1&limit=100').catch(() => null);
      if (res !== null) setInvoices(parseInvoices(res.data?.data));
    } catch (e: unknown) { console.error('[Dashboard]', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const token = globalThis.localStorage.getItem('nexora_token');
    if (!token) { router.push('/login'); return; }
    setUserName(globalThis.localStorage.getItem('nexora_user_name') ?? '');
    loadData();
    const t = setInterval(loadData, 30_000);
    return () => clearInterval(t);
  }, [router, loadData]);

  const goTo     = useCallback((href: string) => router.push(href), [router]);
  const goInv    = useCallback((id: string) => router.push(`/dashboard/invoices/${id}`), [router]);

  const authorized = invoices.filter(i => i.status === 'AUTHORIZED');
  const pending    = invoices.filter(i => ['PROCESSING','PENDING_SIGN','SUBMITTED'].includes(i.status));
  const errors     = invoices.filter(i => ['ERROR','REJECTED'].includes(i.status));
  const rejected   = invoices.filter(i => i.status === 'REJECTED');
  const totalAmt   = authorized.reduce((a, i) => a + Number(i.total ?? 0), 0);
  const avgTicket  = authorized.length > 0 ? totalAmt / authorized.length : 0;
  const authRate   = invoices.length > 0 ? Math.round((authorized.length / invoices.length) * 100) : 0;
  const quotaPct   = Math.min(100, (invoices.length / 20) * 100);
  const recent     = invoices.slice(0, 8);
  const greeting   = getGreeting(new Date().getHours());
  const firstName  = userName.split(' ')[0] ?? 'Usuario';

  function StatusPill({ status }: Readonly<{ status: string }>) {
    const s = STATUS_MAP[status] ?? { label: status, bg: '#F8FAFC', dot: '#94A3B8', text: '#475569', darkBg: 'rgba(148,163,184,0.1)', darkText: '#94A3B8' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: dark ? s.darkBg : s.bg, color: dark ? s.darkText : s.text, fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        {s.label}
      </span>
    );
  }

  function StatCard({ label, value, sub, color, icon }: Readonly<{ label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode }>) {
    return (
      <div style={{ background: C.card, borderRadius: '16px', padding: '20px', border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: C.tx3, margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        </div>
        <p style={{ fontSize: '30px', fontWeight: 900, color: loading ? C.tx3 : C.tx1, margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {loading ? '—' : value}
        </p>
        {sub !== undefined && <p style={{ fontSize: '11.5px', color: C.tx3, margin: 0 }}>{sub}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 36px 48px', background: C.bg, minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', transition: 'background 0.3s' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: C.tx2, margin: '0 0 4px' }}>{greeting}, {firstName} 👋</p>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: C.tx1, margin: 0, letterSpacing: '-0.01em' }}>Dashboard</h1>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '16px' }}>
        <StatCard label="Total facturas" value={invoices.length} sub="Este período" color="#6366F1"
          icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
        <StatCard label="Autorizadas" value={authorized.length} sub={`${authRate}% tasa aprobación`} color="#22C55E"
          icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard label="Total facturado" value={`$${totalAmt.toFixed(2)}`} sub={`Prom. $${avgTicket.toFixed(2)}`} color="#3B82F6"
          icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard label="En proceso" value={pending.length} sub="Pendientes SRI" color="#F59E0B"
          icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard label="Con error" value={errors.length} sub="Requieren atención" color="#EF4444"
          icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>} />
        <StatCard label="Rechazadas" value={rejected.length} sub="Por el SRI" color="#8B5CF6"
          icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>} />
      </div>

      {/* Cuota plan */}
      <div style={{ background: C.card, borderRadius: '16px', padding: '18px 20px', border: `1px solid ${C.border}`, marginBottom: '20px', boxShadow: C.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <p style={{ fontWeight: 700, color: C.tx1, fontSize: '14px', margin: '0 0 2px' }}>Cuota del plan gratuito</p>
            <p style={{ color: C.tx3, fontSize: '12px', margin: 0 }}>20 facturas / mes incluidas</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 800, color: quotaPct >= 90 ? '#EF4444' : '#3B82F6', fontSize: '16px' }}>{invoices.length}/20</span>
            <button type="button" onClick={() => goTo('/dashboard/plans')}
              style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Mejorar plan
            </button>
          </div>
        </div>
        <div style={{ height: '8px', background: C.progBg, borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${quotaPct}%`, background: quotaPct >= 90 ? '#EF4444' : 'linear-gradient(90deg,#3B82F6,#6366F1)', borderRadius: '99px', transition: 'width 0.6s' }} />
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '20px', alignItems: 'start' }}>

        {/* Tabla */}
        <div style={{ background: C.card, borderRadius: '18px', border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.tx1, margin: 0 }}>Facturas recientes</h2>
            <button type="button" onClick={() => goTo('/dashboard/invoices')}
              style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Ver todas →</button>
          </div>
          {loading
            ? <div style={{ padding: '40px', textAlign: 'center', color: C.tx3 }}>Cargando...</div>
            : recent.length === 0
              ? <div style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: C.tx2, fontWeight: 600, margin: 0 }}>Sin facturas aún</p></div>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.tblHead }}>
                      {['Secuencial','Cliente','Total','Estado'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10.5px', fontWeight: 700, color: C.tx3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(inv => (
                      <tr key={inv.id} onClick={() => goInv(inv.id)}
                        style={{ cursor: 'pointer', borderBottom: `1px solid ${C.divider}` }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.hover; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: C.tx3 }}>{inv.sequential}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: C.tx1, fontWeight: 500 }}>{inv.customer?.fullName ?? '-'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: C.tx1, fontWeight: 600 }}>${Number(inv.total).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px' }}><StatusPill status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>

        {/* Sidebar derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Acciones */}
          <div style={{ background: C.card, borderRadius: '18px', border: `1px solid ${C.border}`, padding: '18px', boxShadow: C.shadow }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.tx1, margin: '0 0 12px' }}>Acciones rápidas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button type="button" onClick={() => goTo('/dashboard/invoices/new')}
                style={{ padding: '11px 16px', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(29,78,216,0.35)' }}>
                + Nueva factura
              </button>
              {[{ label: '+ Nuevo cliente', href: '/dashboard/customers' }, { label: '+ Nuevo producto', href: '/dashboard/products' }].map(a => (
                <button key={a.href} type="button" onClick={() => goTo(a.href)}
                  style={{ padding: '10px 16px', background: C.badge, color: C.tx1, border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumen numérico */}
          <div style={{ background: C.card, borderRadius: '18px', border: `1px solid ${C.border}`, padding: '18px', boxShadow: C.shadow }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.tx1, margin: '0 0 12px' }}>Resumen</h2>
            {[
              { label: 'Tasa autorización', value: `${authRate}%`,           color: '#22C55E' },
              { label: 'Ticket promedio',   value: `$${avgTicket.toFixed(2)}`, color: '#3B82F6' },
              { label: 'Total facturado',   value: `$${totalAmt.toFixed(2)}`, color: '#6366F1' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.divider}` }}>
                <span style={{ fontSize: '13px', color: C.tx2 }}>{s.label}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: s.color }}>{loading ? '—' : s.value}</span>
              </div>
            ))}
          </div>

          {/* Plan */}
          <div style={{ background: 'linear-gradient(145deg,#1E3A8A,#1E1B4B)', borderRadius: '18px', padding: '18px', boxShadow: '0 4px 20px rgba(30,58,138,0.3)' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Mi plan</p>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: '0 0 10px' }}>Gratuito</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '0 0 12px' }}>Módulo de suscripciones próximamente</p>
            <button type="button" onClick={() => goTo('/dashboard/plans')}
              style={{ width: '100%', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver planes →
            </button>
          </div>

          {/* SRI */}
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.6)', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, color: C.tx1, fontSize: '13px', margin: '0 0 1px' }}>SRI Ecuador</p>
              <p style={{ color: '#22C55E', fontSize: '11.5px', fontWeight: 600, margin: 0 }}>Producción · Operando</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}