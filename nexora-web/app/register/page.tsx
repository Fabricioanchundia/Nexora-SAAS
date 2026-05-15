'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

function NexoraLogoMark({ size = 44 }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="rg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C8FF"/><stop offset="100%" stopColor="#1D4ED8"/>
        </linearGradient>
        <linearGradient id="rg2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#93C5FD"/>
        </linearGradient>
      </defs>
      <polygon points="28,168 28,32 68,32 68,100 132,32 172,32 172,168 132,168 132,100 68,168" fill="url(#rg1)"/>
      <polygon points="68,32 108,32 68,82" fill="url(#rg2)" opacity="0.55"/>
      <polygon points="132,168 92,168 132,118" fill="url(#rg2)" opacity="0.55"/>
      <g transform="translate(158,36)">
        <polygon points="0,-10 2.4,-2.4 10,0 2.4,2.4 0,10 -2.4,2.4 -10,0 -2.4,-2.4" fill="#BAE6FD"/>
      </g>
    </svg>
  );
}

function Spinner() {
  return <div style={{ width: '15px', height: '15px', flexShrink: 0, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'nxspin 0.7s linear infinite' }} />;
}

// ── Estilos inline garantizados ───────────────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #E2E8F0', borderRadius: '10px',
  padding: '11px 14px', fontSize: '14px',
  color: '#0F172A', background: '#F8FAFC',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: '#374151', marginBottom: '6px',
};

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly type?: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
  readonly required?: boolean;
}

function Field({ id, label, type = 'text', value, onChange, placeholder, required }: FieldProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label htmlFor={id} style={LABEL_STYLE}>{label}{required === true && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={INPUT_STYLE}
      />
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const baseId = useId();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [ruc,      setRuc]      = useState('');
  const [company,  setCompany]  = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const goLogin = useCallback(() => router.push('/login'), [router]);
  const goHome  = useCallback(() => router.push('/'), [router]);

  const handleRegister = useCallback(async () => {
    setError('');

    // Validaciones
    if (name === '' || email === '' || password === '' || ruc === '' || company === '') {
      setError('Completa todos los campos obligatorios');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (ruc.length !== 13) {
      setError('El RUC debe tener 13 dígitos');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear usuario
      await api.post('/auth/register', { name, email, password });

      // 2. Login automático para obtener token
      const loginRes = await api.post('/auth/login', { email, password });
      const token = loginRes.data?.token ?? loginRes.data?.access_token;
      if (token !== undefined) {
        globalThis.localStorage.setItem('nexora_token', token);
        globalThis.localStorage.setItem('nexora_user_name', name);
      }

      // 3. Crear empresa
      if (token !== undefined) {
        await api.post('/companies', {
          ruc,
          businessName: company,
          tradeName: company,
          address: 'Ecuador',
          phone: '',
          email,
          sriEnvironment: '2',
        });

        // 4. Obtener company_id
        const companiesRes = await api.get('/companies');
        const d = companiesRes.data?.data;
        const companies = Array.isArray(d) ? d : [d];
        if (companies[0]?.id !== undefined) {
          globalThis.localStorage.setItem('nexora_company_id', companies[0].id);
        }
      }

      setSuccess('¡Cuenta creada! Redirigiendo al dashboard...');
      setTimeout(() => router.push('/dashboard'), 1500);

    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [name, email, password, confirm, ruc, company, router]);

  const ids = {
    name:    `${baseId}-name`,
    email:   `${baseId}-email`,
    pass:    `${baseId}-pass`,
    confirm: `${baseId}-confirm`,
    ruc:     `${baseId}-ruc`,
    company: `${baseId}-company`,
  } as const;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0F172A 0%,#1E3A8A 60%,#1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`@keyframes nxspin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo + título */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <button type="button" onClick={goHome} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <NexoraLogoMark size={52} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.02em' }}>Nexora</span>
          </button>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '8px 0 0' }}>
            Facturación electrónica · SRI Ecuador
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '36px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            Crear cuenta gratis
          </h1>
          <p style={{ color: '#64748B', fontSize: '13.5px', margin: '0 0 28px' }}>
            Empieza a emitir facturas electrónicas hoy
          </p>

          {error !== '' && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', borderRadius: '10px', padding: '11px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              {error}
            </div>
          )}
          {success !== '' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '13px', borderRadius: '10px', padding: '11px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              {success}
            </div>
          )}

          {/* Sección datos personales */}
          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px 18px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Datos personales</p>
            <Field id={ids.name}    label="Nombre completo"   value={name}     onChange={setName}     placeholder="Ej: Juan Pérez" required />
            <Field id={ids.email}   label="Correo electrónico" type="email" value={email}    onChange={setEmail}    placeholder="tu@empresa.ec" required />
            <Field id={ids.pass}    label="Contraseña"        type="password"  value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" required />
            <div style={{ marginBottom: 0 }}>
              <Field id={ids.confirm} label="Confirmar contraseña" type="password" value={confirm} onChange={setConfirm} placeholder="Repite tu contraseña" required />
            </div>
          </div>

          {/* Sección datos empresa */}
          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px 18px', marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Datos de tu empresa</p>
            <Field id={ids.ruc}     label="RUC"               value={ruc}      onChange={setRuc}      placeholder="1234567890001" required />
            <div style={{ marginBottom: 0 }}>
              <Field id={ids.company} label="Razón social"    value={company}  onChange={setCompany}  placeholder="Mi Empresa S.A." required />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#E2E8F0' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
              color: loading ? '#94A3B8' : '#fff',
              border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(29,78,216,0.35)',
              marginBottom: '16px',
            }}
          >
            {loading ? <><Spinner />Creando cuenta...</> : 'Crear cuenta gratis →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', margin: 0 }}>
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={goLogin}
              style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>
              Iniciar sesión
            </button>
          </p>
        </div>

        {/* SRI badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Autorizado por el SRI Ecuador · Ambiente Producción</span>
        </div>
      </div>
    </div>
  );
}