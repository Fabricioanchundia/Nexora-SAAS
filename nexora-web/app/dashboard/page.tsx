'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Invoice {
  readonly id: string;
  readonly sequential: string;
  readonly total: number;
  readonly status: string;
  readonly customer: { readonly fullName: string };
  readonly issueDate?: string;
}

interface CurrentPlan {
  readonly planName: string;
  readonly invoicesUsed: number;
  readonly invoicesLimit: number;
  readonly invoicesRemaining: number;
  readonly isUnlimited: boolean;
  readonly status: string;
}

const STATUS_MAP: Readonly<Record<string, { label: string; bg: string; dot: string; text: string }>> = {
  AUTHORIZED:   { label: 'Autorizada',  bg: '#F0FDF4', dot: '#22C55E', text: '#15803D' },
  REJECTED:     { label: 'Rechazada',   bg: '#FEF2F2', dot: '#EF4444', text: '#B91C1C' },
  ERROR:        { label: 'Error',       bg: '#FEF2F2', dot: '#EF4444', text: '#B91C1C' },
  PROCESSING:   { label: 'Procesando',  bg: '#EFF6FF', dot: '#3B82F6', text: '#1D4ED8' },
  SUBMITTED:    { label: 'Enviada SRI', bg: '#EFF6FF', dot: '#3B82F6', text: '#1D4ED8' },
  PENDING_SIGN: { label: 'Pendiente',   bg: '#FFFBEB', dot: '#F59E0B', text: '#B45309' },
  DRAFT:        { label: 'Borrador',    bg: '#F8FAFC', dot: '#94A3B8', text: '#475569' },
};

function getStatusStyle(status: string) {
  return STATUS_MAP[status] ?? { label: status, bg: '#F8FAFC', dot: '#94A3B8', text: '#475569' };
}

function StatusPill({ status }: Readonly<{ status: string }>) {
  const s = getStatusStyle(status);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: s.bg, color: s.text, fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly loading: boolean;
  readonly color: string;
  readonly icon: React.ReactNode;
  readonly sub?: string;
}

function StatCard({ label, value, loading, color, icon, sub }: StatCardProps) {
  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', lineHeight: 1 }}>
        {loading ? <span style={{ color: '#E2E8F0' }}>—</span> : value}
      </p>
      {sub !== undefined && <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: 0 }}>{sub}</p>}
    </div>
  );
}

interface InvRowProps {
  readonly inv: Invoice;
  readonly onNav: (id: string) => void;
}

function InvRow({ inv, onNav }: InvRowProps) {
  const handleClick    = useCallback(() => onNav(inv.id), [inv.id, onNav]);
  const handleMouseIn  = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = '#F8FAFC'; }, []);
  const handleMouseOut = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = 'transparent'; }, []);
  return (
    <tr onClick={handleClick} style={{ cursor: 'pointer', borderBottom: '1px solid #F8FAFC', transition: 'background 0.12s' }}
      onMouseEnter={handleMouseIn} onMouseLeave={handleMouseOut}>
      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>{inv.sequential}</td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{inv.customer?.fullName ?? '-'}</td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}>${Number(inv.total).toFixed(2)}</td>
      <td style={{ padding: '12px 16px' }}><StatusPill status={inv.status} /></td>
    </tr>
  );
}

interface InvoiceTableBodyProps {
  readonly loading: boolean;
  readonly recent: Invoice[];
  readonly onNav: (id: string) => void;
}

function InvoiceTableBody({ loading, recent, onNav }: InvoiceTableBodyProps) {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>Cargando...</div>;
  }
  if (recent.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: '#F1F5F9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <p style={{ color: '#475569', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Sin facturas aún</p>
        <p style={{ color: '#94A3B8', fontSize: '12.5px', margin: 0 }}>Crea tu primera factura electrónica</p>
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#F8FAFC' }}>
          {['Secuencial', 'Cliente', 'Total', 'Estado'].map(h => (
            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {recent.map(inv => <InvRow key={inv.id} inv={inv} onNav={onNav} />)}
      </tbody>
    </table>
  );
}

interface QuickBtnProps {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly href: string;
  readonly primary?: boolean;
  readonly onNav: (href: string) => void;
}

function QuickBtn({ label, icon, href, primary, onNav }: QuickBtnProps) {
  const handleClick = useCallback(() => onNav(href), [href, onNav]);
  return (
    <button type="button" onClick={handleClick} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '13px 18px', borderRadius: '12px',
      background: primary === true ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#fff',
      color: primary === true ? '#fff' : '#334155',
      fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      boxShadow: primary === true ? '0 4px 14px rgba(29,78,216,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
      border: primary === true ? 'none' : '1px solid #E2E8F0',
      transition: 'all 0.15s', flex: 1, justifyContent: 'center',
    }}>
      {icon}{label}
    </button>
  );
}

function calcUsagePct(planData: CurrentPlan | null): number {
  if (planData === null) return 0;
  if (planData.isUnlimited) return 100;
  if (planData.invoicesLimit <= 0) return 0;
  return Math.min(100, Math.round((planData.invoicesUsed / planData.invoicesLimit) * 100));
}

function getProgressColor(pct: number): string {
  return pct >= 90 ? '#EF4444' : 'linear-gradient(90deg,#6366F1,#818CF8)';
}

function parseInvoices(data: unknown): Invoice[] {
  if (Array.isArray(data)) return data as Invoice[];
  const d = data as Record<string, unknown> | null;
  if (d !== null && Array.isArray(d?.data))     return d.data as Invoice[];
  if (d !== null && Array.isArray(d?.invoices)) return d.invoices as Invoice[];
  return [];
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getPlanSub(planData: CurrentPlan | null): string | undefined {
  if (planData === null) return undefined;
  const limit = planData.isUnlimited ? '∞' : String(planData.invoicesLimit);
  return `${planData.invoicesUsed}/${limit} usadas este mes`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [planData]              = useState<CurrentPlan | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [userName, setUserName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const invRes = await api.get('/invoices?page=1&limit=100').catch(() => null);
      if (invRes !== null) setInvoices(parseInvoices(invRes.data?.data));
      // /subscriptions/me se activa cuando esté instalado en backend
    } catch (err: unknown) {
      console.error('[Dashboard]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = globalThis.localStorage.getItem('nexora_token');
    if (token === null) { router.push('/login'); return; }
    setUserName(globalThis.localStorage.getItem('nexora_user_name') ?? '');
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [router, loadData]);

  const handleNav    = useCallback((href: string) => router.push(href), [router]);
  const handleInvNav = useCallback((id: string)   => router.push(`/dashboard/invoices/${id}`), [router]);

  const authorized = invoices.filter(i => i.status === 'AUTHORIZED');
  const pending    = invoices.filter(i => ['PROCESSING', 'PENDING_SIGN', 'SUBMITTED'].includes(i.status));
  const errors     = invoices.filter(i => ['ERROR', 'REJECTED'].includes(i.status));
  const totalAmt   = authorized.reduce((acc, i) => acc + Number(i.total ?? 0), 0);
  const recent     = invoices.slice(0, 6);

  const usedPct       = calcUsagePct(planData);
  const quotaWarning  = planData !== null && !planData.isUnlimited && usedPct >= 80;
  const progressColor = getProgressColor(usedPct);
  const greeting      = getGreeting(new Date().getHours());
  const firstName     = userName.split(' ')[0] ?? 'Fabricio';

  return (
    <div style={{ padding: '32px 36px 48px', background: '#F1F5F9', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 4px' }}>{greeting}, {firstName} 👋</p>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>Dashboard</h1>
      </div>

      {quotaWarning && planData !== null && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '1px solid #F59E0B', borderRadius: '14px', padding: '14px 20px', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, color: '#92400E', margin: '0 0 2px', fontSize: '14px' }}>Casi alcanzas tu límite</p>
              <p style={{ color: '#A16207', fontSize: '12.5px', margin: 0 }}>Has usado {planData.invoicesUsed} de {planData.invoicesLimit} facturas este mes ({usedPct}%)</p>
            </div>
          </div>
          <button type="button" onClick={() => handleNav('/dashboard/plans')}
            style={{ background: '#B45309', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            Actualizar plan →
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total facturas" value={invoices.length} loading={loading} color="#6366F1"
          sub={getPlanSub(planData)}
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
        />
        <StatCard label="Autorizadas" value={authorized.length} loading={loading} color="#22C55E"
          sub={`$${totalAmt.toFixed(2)} total autorizado`}
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="En proceso" value={pending.length} loading={loading} color="#3B82F6"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="Con error" value={errors.length} loading={loading} color="#EF4444"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Facturas recientes</h2>
            <button type="button" onClick={() => handleNav('/dashboard/invoices')}
              style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: '8px' }}>
              Ver todas →
            </button>
          </div>
          <InvoiceTableBody loading={loading} recent={recent} onNav={handleInvNav} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 18px 20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Acciones rápidas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <QuickBtn label="Nueva factura" primary href="/dashboard/invoices/new" onNav={handleNav}
                icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>} />
              <QuickBtn label="Nuevo cliente" href="/dashboard/customers" onNav={handleNav}
                icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>} />
              <QuickBtn label="Nuevo producto" href="/dashboard/products" onNav={handleNav}
                icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>} />
            </div>
          </div>

          <div style={{ background: 'linear-gradient(145deg,#1E3A8A,#1E1B4B)', borderRadius: '18px', padding: '20px', color: '#fff', boxShadow: '0 4px 24px rgba(30,58,138,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Mi plan</p>
                <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>{planData?.planName ?? 'Gratuito'}</p>
              </div>
              <button type="button" onClick={() => handleNav('/dashboard/plans')}
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Ver planes
              </button>
            </div>
            {planData === null
              ? <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '8px 0 0' }}>Módulo de suscripciones próximamente</p>
              : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Facturas usadas</span>
                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                      {planData.invoicesUsed}/{planData.isUnlimited ? '∞' : planData.invoicesLimit}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${planData.isUnlimited ? 100 : usedPct}%`, background: progressColor, borderRadius: '99px', transition: 'width 0.6s' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: 0 }}>
                    {planData.isUnlimited ? 'Sin límite' : `${planData.invoicesRemaining} facturas restantes`}
                  </p>
                </div>
              )
            }
          </div>

          <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #F1F5F9', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.5)', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', margin: '0 0 2px' }}>SRI Ecuador</p>
              <p style={{ color: '#22C55E', fontSize: '12px', fontWeight: 600, margin: 0 }}>Producción · Operando</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}