'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import api from '@/lib/api';

interface Company {
  id: string;
  ruc: string;
  businessName: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  sriEnvironment: string;
  isActive: boolean;
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #E2E8F0', borderRadius: '10px',
  padding: '10px 14px', fontSize: '14px',
  color: '#0F172A', background: '#F8FAFC',
  outline: 'none', fontFamily: 'inherit',
};

const INPUT_DISABLED: React.CSSProperties = {
  ...INPUT_STYLE, color: '#94A3B8', background: '#F1F5F9', cursor: 'not-allowed',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE, cursor: 'pointer', appearance: 'auto',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px',
};

interface DataFieldProps {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly mono?: boolean;
}

function DataField({ label, value, icon, mono = false }: DataFieldProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>{label}</p>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0, fontFamily: mono ? 'monospace' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value === '' ? '—' : value}
        </p>
      </div>
    </div>
  );
}

interface EnvBadgeProps { readonly isProd: boolean; }
function EnvBadge({ isProd }: EnvBadgeProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
      background: isProd ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
      color: isProd ? '#4ADE80' : '#FCD34D',
      border: `1px solid ${isProd ? 'rgba(74,222,128,0.3)' : 'rgba(252,211,77,0.3)'}`,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isProd ? '#4ADE80' : '#FCD34D', flexShrink: 0 }} />
      {isProd ? 'Producción' : 'Pruebas'}
    </span>
  );
}

interface CompanyViewProps {
  readonly company: Company;
  readonly onEdit: (c: Company) => void;
}

function CompanyView({ company, onEdit }: CompanyViewProps) {
  const isProd   = company.sriEnvironment === '2';
  const initials = (company.businessName ?? 'N').slice(0, 2).toUpperCase();
  const handleEdit = useCallback(() => onEdit(company), [company, onEdit]);

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#0F2456 0%,#1E40AF 100%)', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: 800 }}>{initials}</span>
          </div>
          <div>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '0 0 3px' }}>{company.businessName}</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: 0 }}>{company.tradeName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <EnvBadge isProd={isProd} />
          <button type="button" onClick={handleEdit}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <DataField label="RUC"       value={company.ruc}     icon="🪪" mono />
          <DataField label="Email"     value={company.email}   icon="✉️" />
          <DataField label="Teléfono"  value={company.phone}   icon="📞" mono />
          <DataField label="Dirección" value={company.address} icon="📍" />
        </div>
        <div style={{ marginTop: '20px', padding: '14px 18px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isProd ? '#22C55E' : '#F59E0B', boxShadow: `0 0 6px ${isProd ? 'rgba(34,197,94,0.5)' : 'rgba(245,158,11,0.5)'}` }} />
            <p style={{ color: '#374151', fontSize: '13px', fontWeight: 600, margin: 0 }}>SRI Ecuador · Ambiente {isProd ? 'Producción' : 'Pruebas'}</p>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>{company.isActive ? '✓ Empresa activa' : '⚠ Empresa inactiva'}</p>
        </div>
      </div>
    </div>
  );
}

interface CompanyEditProps {
  readonly editing: Company;
  readonly saving: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly onChange: (key: keyof Company, value: string) => void;
  readonly ids: Readonly<Record<string, string>>;
}

function CompanyEdit({ editing, saving, onSave, onCancel, onChange, ids }: CompanyEditProps) {
  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Editar empresa</h3>
        <button type="button" onClick={onCancel} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#64748B', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Cancelar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div><label htmlFor={ids.ruc} style={LABEL_STYLE}>RUC</label><input id={ids.ruc} type="text" disabled value={editing.ruc} style={INPUT_DISABLED} /></div>
        <div><label htmlFor={ids.biz} style={LABEL_STYLE}>Razón social</label><input id={ids.biz} type="text" value={editing.businessName} onChange={e => onChange('businessName', e.target.value)} style={INPUT_STYLE} /></div>
        <div><label htmlFor={ids.trade} style={LABEL_STYLE}>Nombre comercial</label><input id={ids.trade} type="text" value={editing.tradeName} onChange={e => onChange('tradeName', e.target.value)} style={INPUT_STYLE} /></div>
        <div><label htmlFor={ids.phone} style={LABEL_STYLE}>Teléfono</label><input id={ids.phone} type="text" value={editing.phone} onChange={e => onChange('phone', e.target.value)} style={INPUT_STYLE} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label htmlFor={ids.addr} style={LABEL_STYLE}>Dirección</label><input id={ids.addr} type="text" value={editing.address} onChange={e => onChange('address', e.target.value)} style={INPUT_STYLE} /></div>
        <div><label htmlFor={ids.email} style={LABEL_STYLE}>Email</label><input id={ids.email} type="email" value={editing.email} onChange={e => onChange('email', e.target.value)} style={INPUT_STYLE} /></div>
        <div>
          <label htmlFor={ids.env} style={LABEL_STYLE}>Ambiente SRI</label>
          <select id={ids.env} value={editing.sriEnvironment} onChange={e => onChange('sriEnvironment', e.target.value)} style={SELECT_STYLE}>
            <option value="1">Pruebas</option>
            <option value="2">Producción</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F1F5F9', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '10px 18px', background: '#F8FAFC', color: '#374151', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        <button type="button" onClick={onSave} disabled={saving} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(29,78,216,0.3)' }}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const baseId = useId();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [editing,  setEditing]    = useState<Company | null>(null);
  const [saving,   setSaving]     = useState(false);
  const [success,  setSuccess]    = useState('');
  const [error,    setError]      = useState('');

  useEffect(() => {
    api.get('/companies')
      .then(res => { const d = res.data.data; setCompanies(Array.isArray(d) ? d : [d]); })
      .catch((err: unknown) => console.error('[CompaniesPage]', err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = useCallback((key: keyof Company, value: string) => {
    setEditing(prev => prev === null ? null : { ...prev, [key]: value });
  }, []);

  const handleSave = useCallback(async () => {
    if (editing === null) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put(`/companies/${editing.id}`, editing);
      setSuccess('Empresa actualizada correctamente');
      setCompanies(prev => prev.map(c => c.id === editing.id ? editing : c));
      setEditing(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al guardar');
    } finally { setSaving(false); }
  }, [editing]);

  const handleCancelEdit = useCallback(() => setEditing(null), []);

  const ids = {
    ruc: `${baseId}-ruc`, biz: `${baseId}-biz`, trade: `${baseId}-trade`,
    addr: `${baseId}-addr`, phone: `${baseId}-phone`, email: `${baseId}-email`, env: `${baseId}-env`,
  } as const;

  if (loading) {
    return (
      <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>Cargando empresa...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: '860px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Empresas</h1>
        <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>Gestiona los datos de tu empresa emisora en el SRI</p>
      </div>
      {success !== '' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '13px', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      {error !== '' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}
      {companies.map(company => (
        <div key={company.id} style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
          {editing?.id === company.id && editing !== null
            ? <CompanyEdit editing={editing} saving={saving} onSave={handleSave} onCancel={handleCancelEdit} onChange={handleChange} ids={ids} />
            : <CompanyView company={company} onEdit={setEditing} />
          }
        </div>
      ))}
    </div>
  );
}