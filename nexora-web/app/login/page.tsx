'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import api from '@/lib/api';

type Mode = 'login' | 'register';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://177.7.58.244/api/v1';

function Spinner() {
  return <div style={{ width: '15px', height: '15px', flexShrink: 0, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'nxspin 0.7s linear infinite' }} />;
}

function ErrBox({ msg }: Readonly<{ msg: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {msg}
    </div>
  );
}

function OkBox({ msg }: Readonly<{ msg: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '13px', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {msg}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #E2E8F0', borderRadius: '10px',
  padding: '11px 14px', fontSize: '14px',
  color: '#0F172A', background: '#F8FAFC',
  outline: 'none', fontFamily: 'inherit',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: '#374151', marginBottom: '6px',
};

export default function LoginPage() {
  const router = useRouter();
  const baseId = useId();
  const [mode, setMode] = useState<Mode>('login');

  const [lEmail, setLEmail] = useState('');
  const [lPass,  setLPass]  = useState('');
  const [lErr,   setLErr]   = useState('');
  const [lLoad,  setLLoad]  = useState(false);

  const [rName,    setRName]    = useState('');
  const [rEmail,   setREmail]   = useState('');
  const [rPass,    setRPass]    = useState('');
  const [rConf,    setRConf]    = useState('');
  const [rRuc,     setRRuc]     = useState('');
  const [rCompany, setRCompany] = useState('');
  const [rErr,     setRErr]     = useState('');
  const [rOk,      setROk]      = useState('');
  const [rLoad,    setRLoad]    = useState(false);

  const ids = {
    lEmail: `${baseId}-le`, lPass: `${baseId}-lp`,
    rName: `${baseId}-rn`, rEmail: `${baseId}-re`,
    rPass: `${baseId}-rp`, rConf: `${baseId}-rc`,
    rRuc: `${baseId}-rr`, rCompany: `${baseId}-rco`,
  } as const;

  const doLogin = useCallback(async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLErr('');
    if (lEmail === '' || lPass === '') { setLErr('Completa todos los campos'); return; }
    setLLoad(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email: lEmail, password: lPass });
      const token = res.data?.token ?? res.data?.access_token;
      if (token === undefined) { setLErr('Respuesta inválida del servidor'); return; }
      globalThis.localStorage.setItem('nexora_token', token);
      globalThis.localStorage.setItem('nexora_user_name', res.data?.user?.name ?? lEmail);
      const comp = await api.get('/companies', { headers: { Authorization: `Bearer ${token}` } });
      const d = comp.data?.data;
      const list = Array.isArray(d) ? d : [d];
      if (list[0]?.id !== undefined) globalThis.localStorage.setItem('nexora_company_id', list[0].id);
      router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string | string[] } } };
      if (e.response?.status === 401) { setLErr('Correo o contraseña incorrectos'); return; }
      if (e.response?.status === 404) { setLErr('No existe una cuenta con ese correo'); return; }
      const msg = e.response?.data?.message;
      setLErr(Array.isArray(msg) ? msg[0] : msg ?? 'Error al iniciar sesión');
    } finally { setLLoad(false); }
  }, [lEmail, lPass, router]);

  const doRegister = useCallback(async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRErr(''); setROk('');

    if ([rName, rEmail, rPass, rConf, rRuc, rCompany].includes('')) {
      setRErr('Completa todos los campos'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail)) {
      setRErr('El correo electrónico no es válido'); return;
    }
    if (rPass !== rConf) {
      setRErr('Las contraseñas no coinciden'); return;
    }
    if (rPass.length < 8) {
      setRErr('La contraseña debe tener al menos 8 caracteres'); return;
    }
    if (rRuc.length !== 13 || !/^\d+$/.test(rRuc)) {
      setRErr('El RUC debe tener exactamente 13 dígitos numéricos'); return;
    }

    setRLoad(true);
    try {
      await axios.post(`${API_URL}/auth/register`, { name: rName, email: rEmail, password: rPass });

      const loginRes = await axios.post(`${API_URL}/auth/login`, { email: rEmail, password: rPass });
      const token = loginRes.data?.token ?? loginRes.data?.access_token;

      if (token !== undefined) {
        globalThis.localStorage.setItem('nexora_token', token);
        globalThis.localStorage.setItem('nexora_user_name', rName);

        await api.post('/companies', {
          ruc: rRuc, businessName: rCompany, tradeName: rCompany,
          address: 'Ecuador', phone: '', email: rEmail, sriEnvironment: '2',
        }, { headers: { Authorization: `Bearer ${token}` } });

        const compRes = await api.get('/companies', { headers: { Authorization: `Bearer ${token}` } });
        const d = compRes.data?.data;
        const list = Array.isArray(d) ? d : [d];
        if (list[0]?.id !== undefined) globalThis.localStorage.setItem('nexora_company_id', list[0].id);
      }

      setROk('¡Cuenta creada exitosamente! Redirigiendo...');
      setTimeout(() => router.push('/dashboard'), 1500);

    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string | string[] } } };
      if (e.response?.status === 409) {
        setRErr('Ya existe una cuenta con ese correo. ¿Quieres iniciar sesión?'); return;
      }
      const msg = e.response?.data?.message;
      setRErr(Array.isArray(msg) ? msg[0] : msg ?? 'Error al crear la cuenta');
    } finally { setRLoad(false); }
  }, [rName, rEmail, rPass, rConf, rRuc, rCompany, router]);

  const switchToRegister = useCallback(() => { setMode('register'); setLErr(''); }, []);
  const switchToLogin    = useCallback(() => { setMode('login'); setRErr(''); setROk(''); }, []);

  const passMatch = rConf !== '' && rPass !== rConf;
  const rucWrong  = rRuc !== '' && rRuc.length !== 13;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0F172A 0%,#1E3A8A 55%,#1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: 'system-ui,-apple-system,sans-serif', position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes nxspin { to { transform: rotate(360deg); } }`}</style>

      {/* Decoración */}
      <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(59,130,246,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(29,78,216,0.1)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Image
            src="/nexora-logo.png"
            alt="Nexora Labs"
            width={200}
            height={112}
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 24px rgba(59,130,246,0.45))', maxWidth: '200px' }}
            priority
          />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12.5px', margin: '6px 0 0' }}>
            Facturación electrónica · SRI Ecuador
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} type="button"
                onClick={m === 'login' ? switchToLogin : switchToRegister}
                style={{ flex: 1, padding: '9px', fontSize: '14px', fontWeight: 700, borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0F172A' : '#94A3B8', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={doLogin} noValidate>
              {lErr !== '' && <ErrBox msg={lErr} />}
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor={ids.lEmail} style={LABEL_STYLE}>Correo electrónico</label>
                <input id={ids.lEmail} type="email" value={lEmail} onChange={e => setLEmail(e.target.value)} placeholder="tu@empresa.ec" style={INPUT_STYLE} />
              </div>
              <div style={{ marginBottom: '22px' }}>
                <label htmlFor={ids.lPass} style={LABEL_STYLE}>Contraseña</label>
                <input id={ids.lPass} type="password" value={lPass} onChange={e => setLPass(e.target.value)} placeholder="Tu contraseña" style={INPUT_STYLE} />
              </div>
              <button type="submit" disabled={lLoad}
                style={{ width: '100%', padding: '13px', background: lLoad ? '#E2E8F0' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: lLoad ? '#94A3B8' : '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: lLoad ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: lLoad ? 'none' : '0 4px 14px rgba(29,78,216,0.35)' }}>
                {lLoad ? <><Spinner />Ingresando...</> : 'Iniciar sesión →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', margin: '14px 0 0' }}>
                ¿No tienes cuenta?{' '}
                <button type="button" onClick={switchToRegister} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Regístrate gratis</button>
              </p>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <form onSubmit={doRegister} noValidate>
              {rErr !== '' && <ErrBox msg={rErr} />}
              {rOk  !== '' && <OkBox  msg={rOk}  />}

              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Datos personales</p>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.rName} style={LABEL_STYLE}>Nombre completo <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rName} type="text" value={rName} onChange={e => setRName(e.target.value)} placeholder="Juan Pérez" style={INPUT_STYLE} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.rEmail} style={LABEL_STYLE}>Correo electrónico <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rEmail} type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="tu@empresa.ec" style={INPUT_STYLE} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.rPass} style={LABEL_STYLE}>Contraseña <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rPass} type="password" value={rPass} onChange={e => setRPass(e.target.value)} placeholder="Mínimo 8 caracteres" style={INPUT_STYLE} />
                </div>
                <div>
                  <label htmlFor={ids.rConf} style={LABEL_STYLE}>Confirmar contraseña <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rConf} type="password" value={rConf} onChange={e => setRConf(e.target.value)} placeholder="Repite tu contraseña"
                    style={{ ...INPUT_STYLE, borderColor: passMatch ? '#EF4444' : '#E2E8F0' }} />
                  {passMatch && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0' }}>Las contraseñas no coinciden</p>}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Tu empresa</p>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.rRuc} style={LABEL_STYLE}>RUC <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rRuc} type="text" value={rRuc}
                    onChange={e => setRRuc(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    placeholder="1234567890001"
                    style={{ ...INPUT_STYLE, borderColor: rucWrong ? '#EF4444' : '#E2E8F0' }} />
                  {rucWrong && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0' }}>{rRuc.length}/13 dígitos</p>}
                </div>
                <div>
                  <label htmlFor={ids.rCompany} style={LABEL_STYLE}>Razón social <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rCompany} type="text" value={rCompany} onChange={e => setRCompany(e.target.value)} placeholder="Mi Empresa S.A." style={INPUT_STYLE} />
                </div>
              </div>

              <button type="submit" disabled={rLoad}
                style={{ width: '100%', padding: '13px', background: rLoad ? '#E2E8F0' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: rLoad ? '#94A3B8' : '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: rLoad ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: rLoad ? 'none' : '0 4px 14px rgba(29,78,216,0.35)', marginBottom: '12px' }}>
                {rLoad ? <><Spinner />Creando cuenta...</> : 'Crear cuenta gratis →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', margin: 0 }}>
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={switchToLogin} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Iniciar sesión</button>
              </p>
            </form>
          )}
        </div>

        {/* Badge SRI */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '18px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Autorizado SRI Ecuador · Producción</span>
        </div>
      </div>
    </div>
  );
}