'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

interface Customer {
  readonly id: string;
  readonly identification: string;
  readonly identificationType: string;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
}

const schema = z.object({
  identificationType: z.enum(['04', '05', '06', '07', '08']),
  identification: z.string().min(1, 'Requerido'),
  fullName:       z.string().min(2, 'Requerido'),
  email:          z.string().email('Email inválido').optional().or(z.literal('')),
  phone:          z.string().optional(),
  address:        z.string().optional(),
});

type CustomerForm = z.infer<typeof schema>;

const ID_TYPE_LABELS: Readonly<Record<string, string>> = {
  '04': 'Cédula', '05': 'Pasaporte', '06': 'RUC',
  '07': 'Consumidor Final', '08': 'Id. exterior',
};

// ── Estilos inline garantizados — funcionan sin Tailwind compilado ────────────
const FIELD_STYLE: React.CSSProperties = { marginBottom: '14px' };

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: '#374151', marginBottom: '6px',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #E2E8F0', borderRadius: '10px',
  padding: '10px 14px', fontSize: '14px',
  color: '#0F172A',               // ← texto siempre visible
  background: '#F8FAFC',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
  appearance: 'auto',             // ← muestra la flecha nativa del browser
  WebkitAppearance: 'auto',
};

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null;
  return <p style={{ color:'#EF4444', fontSize:'12px', marginTop:'4px' }}>{message}</p>;
}

export default function CustomersPage() {
  const baseId = useId();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: { identificationType: '04' },
  });

  const ids = {
    idType:  `${baseId}-id-type`,
    idNum:   `${baseId}-id-num`,
    name:    `${baseId}-name`,
    email:   `${baseId}-email`,
    phone:   `${baseId}-phone`,
    address: `${baseId}-address`,
  };

  const loadCustomers = useCallback(() => {
    api.get('/customers')
      .then(res => {
        const data = res.data.data as Customer[] | { customers: Customer[] };
        setCustomers(Array.isArray(data) ? data : data.customers ?? []);
      })
      .catch((err: unknown) => console.error('[CustomersPage]', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleToggleForm = useCallback(() => {
    setShowForm(prev => !prev);
    setError('');
    reset();
  }, [reset]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    reset();
    setError('');
  }, [reset]);

  const onSubmit = useCallback(async (data: CustomerForm) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/customers', data);
      reset();
      setShowForm(false);
      loadCustomers();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m  = ax.response?.data?.message;
      setError(Array.isArray(m) ? m[0] : m ?? 'Error al guardar cliente');
    } finally { setSaving(false); }
  }, [reset, loadCustomers]);

  // ── Table body ────────────────────────────────────────────────────────────
  let tableBody: React.ReactNode;
  if (loading) {
    tableBody = <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#94A3B8', fontSize:'13px' }}>Cargando clientes...</td></tr>;
  } else if (customers.length === 0) {
    tableBody = (
      <tr><td colSpan={5} style={{ padding:'48px 20px', textAlign:'center' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'44px', height:'44px', background:'#F1F5F9', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p style={{ color:'#475569', fontWeight:600, fontSize:'14px', margin:0 }}>Sin clientes</p>
          <p style={{ color:'#94A3B8', fontSize:'12.5px', margin:0 }}>Agrega tu primer cliente para comenzar a facturar</p>
        </div>
      </td></tr>
    );
  } else {
    const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
      '04': { bg:'#F5F3FF', text:'#7C3AED', border:'#DDD6FE' },
      '05': { bg:'#FFF7ED', text:'#C2410C', border:'#FED7AA' },
      '06': { bg:'#EFF6FF', text:'#1D4ED8', border:'#BFDBFE' },
      '07': { bg:'#F0FDF4', text:'#15803D', border:'#BBF7D0' },
      '08': { bg:'#FFF1F2', text:'#BE123C', border:'#FECDD3' },
    };
    tableBody = customers.map(c => {
      const tc = TYPE_COLORS[c.identificationType] ?? { bg:'#F8FAFC', text:'#475569', border:'#E2E8F0' };
      return (
        <tr key={c.id} style={{ borderBottom:'1px solid #F8FAFC', transition:'background 0.1s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background='#F8FAFC'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background='transparent'; }}>
          <td style={{ padding:'12px 16px' }}>
            <span style={{ display:'inline-flex', alignItems:'center', background:tc.bg, color:tc.text, border:`1px solid ${tc.border}`, borderRadius:'20px', fontSize:'11.5px', fontWeight:600, padding:'3px 10px' }}>
              {ID_TYPE_LABELS[c.identificationType] ?? c.identificationType}
            </span>
          </td>
          <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:'13px', color:'#475569' }}>{c.identification}</td>
          <td style={{ padding:'12px 16px', fontSize:'13.5px', fontWeight:600, color:'#0F172A' }}>{c.fullName}</td>
          <td style={{ padding:'12px 16px', fontSize:'13px', color:'#64748B' }}>{c.email ?? '—'}</td>
          <td style={{ padding:'12px 16px', fontSize:'13px', color:'#64748B' }}>{c.phone ?? '—'}</td>
        </tr>
      );
    });
  }

  return (
    <div style={{ padding:'32px 36px', background:'#F1F5F9', minHeight:'100vh', fontFamily:'system-ui,-apple-system,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:800, color:'#0F172A', margin:'0 0 4px', letterSpacing:'-0.01em' }}>Clientes</h1>
          <p style={{ fontSize:'13px', color:'#64748B', margin:0 }}>Gestiona tu cartera de clientes</p>
        </div>
        <button type="button" onClick={handleToggleForm}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 18px', background: showForm ? '#F1F5F9' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: showForm ? '#374151' : '#fff', border: showForm ? '1px solid #E2E8F0' : 'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: showForm ? 'none' : '0 4px 14px rgba(29,78,216,0.3)', transition:'all 0.15s' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
          </svg>
          {showForm ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid #E2E8F0', padding:'24px', marginBottom:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize:'16px', fontWeight:700, color:'#0F172A', margin:'0 0 20px' }}>Nuevo cliente</h2>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

              <div style={FIELD_STYLE}>
                <label htmlFor={ids.idType} style={LABEL_STYLE}>Tipo identificación</label>
                <select id={ids.idType} {...register('identificationType')} style={SELECT_STYLE}>
                  <option value="04">Cédula</option>
                  <option value="05">Pasaporte</option>
                  <option value="06">RUC</option>
                  <option value="07">Consumidor Final</option>
                  <option value="08">Id. exterior</option>
                </select>
              </div>

              <div style={FIELD_STYLE}>
                <label htmlFor={ids.idNum} style={LABEL_STYLE}>Identificación</label>
                <input id={ids.idNum} {...register('identification')} placeholder="Ej: 1350135958" style={INPUT_STYLE} />
                <FieldError message={errors.identification?.message} />
              </div>

              <div style={{ ...FIELD_STYLE, gridColumn:'1 / -1' }}>
                <label htmlFor={ids.name} style={LABEL_STYLE}>Nombre completo / Razón social</label>
                <input id={ids.name} {...register('fullName')} placeholder="Ej: Juan Pérez" style={INPUT_STYLE} />
                <FieldError message={errors.fullName?.message} />
              </div>

              <div style={FIELD_STYLE}>
                <label htmlFor={ids.email} style={LABEL_STYLE}>Correo electrónico</label>
                <input id={ids.email} {...register('email')} type="email" placeholder="correo@ejemplo.com" style={INPUT_STYLE} />
                <FieldError message={errors.email?.message} />
              </div>

              <div style={FIELD_STYLE}>
                <label htmlFor={ids.phone} style={LABEL_STYLE}>Teléfono</label>
                <input id={ids.phone} {...register('phone')} placeholder="0999999999" style={INPUT_STYLE} />
              </div>

              <div style={{ ...FIELD_STYLE, gridColumn:'1 / -1' }}>
                <label htmlFor={ids.address} style={LABEL_STYLE}>Dirección</label>
                <input id={ids.address} {...register('address')} placeholder="Ej: Av. Principal 123, Manta" style={INPUT_STYLE} />
              </div>
            </div>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'13px', borderRadius:'10px', padding:'10px 14px', marginBottom:'16px', display:'flex', gap:'8px', alignItems:'center' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" style={{ flexShrink:0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', paddingTop:'8px', borderTop:'1px solid #F1F5F9' }}>
              <button type="button" onClick={handleCancel}
                style={{ padding:'10px 18px', background:'#F8FAFC', color:'#374151', border:'1px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                style={{ padding:'10px 22px', background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor: saving?'not-allowed':'pointer', fontFamily:'inherit', opacity: saving?0.7:1, boxShadow:'0 4px 14px rgba(29,78,216,0.3)' }}>
                {saving ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid #E2E8F0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
            <thead>
              <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                {['Tipo','Identificación','Nombre','Correo','Teléfono'].map(h => (
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{tableBody}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}