'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import api from '@/lib/api';

type Mode = 'login' | 'register';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://177.7.58.244/api/v1';

function Spinner() {
  return <div className="nx-spinner" style={{ width: '15px', height: '15px', flexShrink: 0, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />;
}

function ErrBox({ msg }: Readonly<{ msg: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', lineHeight: 1.5 }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {msg}
    </div>
  );
}

function OkBox({ msg }: Readonly<{ msg: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '13px', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {msg}
    </div>
  );
}

const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid #E2E8F0',
  borderRadius: '10px', padding: '11px 14px', fontSize: '14px',
  color: '#0F172A', background: '#F8FAFC', outline: 'none', fontFamily: 'inherit',
};
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px',
};
const SECTION_TITLE: React.CSSProperties = {
  fontSize: '10.5px', fontWeight: 700, color: '#94A3B8',
  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px',
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
    le: `${baseId}-le`, lp: `${baseId}-lp`,
    rn: `${baseId}-rn`, re: `${baseId}-re`,
    rp: `${baseId}-rp`, rc: `${baseId}-rc`,
    rr: `${baseId}-rr`, rco: `${baseId}-rco`,
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
    if ([rName, rEmail, rPass, rConf, rRuc, rCompany].includes('')) { setRErr('Completa todos los campos'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail)) { setRErr('El correo electrónico no es válido'); return; }
    if (rPass !== rConf) { setRErr('Las contraseñas no coinciden'); return; }
    if (rPass.length < 8) { setRErr('La contraseña debe tener al menos 8 caracteres'); return; }
    if (rRuc.length !== 13 || !/^\d+$/.test(rRuc)) { setRErr('El RUC debe tener exactamente 13 dígitos'); return; }
    setRLoad(true);
    try {
      await axios.post(`${API_URL}/auth/register`, { name: rName, email: rEmail, password: rPass });
      const loginRes = await axios.post(`${API_URL}/auth/login`, { email: rEmail, password: rPass });
      const token = loginRes.data?.token ?? loginRes.data?.access_token;
      if (token !== undefined) {
        globalThis.localStorage.setItem('nexora_token', token);
        globalThis.localStorage.setItem('nexora_user_name', rName);
        await api.post('/companies', { ruc: rRuc, businessName: rCompany, tradeName: rCompany, address: 'Ecuador', phone: '', email: rEmail, sriEnvironment: '2' }, { headers: { Authorization: `Bearer ${token}` } });
        const compRes = await api.get('/companies', { headers: { Authorization: `Bearer ${token}` } });
        const d = compRes.data?.data;
        const list = Array.isArray(d) ? d : [d];
        if (list[0]?.id !== undefined) globalThis.localStorage.setItem('nexora_company_id', list[0].id);
      }
      setROk('¡Cuenta creada! Redirigiendo...');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string | string[] } } };
      if (e.response?.status === 409) { setRErr('Ya existe una cuenta con ese correo. ¿Quieres iniciar sesión?'); return; }
      const msg = e.response?.data?.message;
      setRErr(Array.isArray(msg) ? msg[0] : msg ?? 'Error al crear la cuenta');
    } finally { setRLoad(false); }
  }, [rName, rEmail, rPass, rConf, rRuc, rCompany, router]);

  const toRegister = useCallback(() => { setMode('register'); setLErr(''); }, []);
  const toLogin    = useCallback(() => { setMode('login'); setRErr(''); setROk(''); }, []);

  const passErr = rConf !== '' && rPass !== rConf;
  const rucErr  = rRuc  !== '' && rRuc.length !== 13;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: 'system-ui,-apple-system,sans-serif', position: 'relative', overflow: 'hidden', background: '#060d1f' }}>

      {/* ── Fondo degradado base ── */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #1a3a8f 0%, #0c1d4a 40%, #060d1f 100%)', zIndex: 0 }} />

      {/* ── Blobs animados ── */}
      <div className="nx-blob-1" style={{ position: 'absolute', top: '-150px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(29,78,216,0.1) 40%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-blob-2" style={{ position: 'absolute', bottom: '-180px', left: '-120px', width: '550px', height: '550px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.08) 50%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-blob-3" style={{ position: 'absolute', top: '30%', left: '-80px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 65%)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-blob-4" style={{ position: 'absolute', top: '10%', right: '5%', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(147,197,253,0.1) 0%, transparent 65%)', zIndex: 0, pointerEvents: 'none' }} />

      {/* ── Estrellas/partículas ── */}
      <div className="nx-star-1" style={{ position: 'absolute', top: '12%',  left: '18%',  width: '4px', height: '4px', borderRadius: '50%', background: '#93C5FD', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-star-2" style={{ position: 'absolute', top: '28%',  left: '82%',  width: '6px', height: '6px', borderRadius: '50%', background: '#BFDBFE', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-star-3" style={{ position: 'absolute', top: '65%',  left: '8%',   width: '5px', height: '5px', borderRadius: '50%', background: '#93C5FD', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-star-4" style={{ position: 'absolute', top: '78%',  left: '72%',  width: '4px', height: '4px', borderRadius: '50%', background: '#DBEAFE', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-star-5" style={{ position: 'absolute', top: '45%',  left: '92%',  width: '5px', height: '5px', borderRadius: '50%', background: '#93C5FD', zIndex: 0, pointerEvents: 'none' }} />
      <div className="nx-star-6" style={{ position: 'absolute', top: '88%',  left: '45%',  width: '3px', height: '3px', borderRadius: '50%', background: '#BFDBFE', zIndex: 0, pointerEvents: 'none' }} />

      {/* ── Líneas de cuadrícula sutil ── */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', zIndex: 0, pointerEvents: 'none' }} />

      {/* ── Contenido ── */}
      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>

        {/* Logo flotante — sin caja blanca, con glow azul */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="nx-pulse" style={{ display: 'inline-block', position: 'relative' }}>
            {/* Glow detrás del logo */}
            <div style={{ position: 'absolute', inset: '-20px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <Image
              src="/nexora-logo.png"
              alt="Nexora Labs"
              width={220}
              height={124}
              style={{ objectFit: 'contain', display: 'block', position: 'relative', filter: 'brightness(1.15) drop-shadow(0 0 20px rgba(59,130,246,0.6)) drop-shadow(0 0 40px rgba(29,78,216,0.4))' }}
              priority
            />
          </div>
          <p style={{ color: 'rgba(147,197,253,0.7)', fontSize: '13px', margin: '10px 0 0', letterSpacing: '0.05em' }}>
            Facturación electrónica · SRI Ecuador
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '24px', padding: '28px', boxShadow: '0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} type="button" onClick={m === 'login' ? toLogin : toRegister}
                style={{ flex: 1, padding: '9px', fontSize: '14px', fontWeight: 700, borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0F172A' : '#94A3B8', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={doLogin} noValidate>
              {lErr !== '' && <ErrBox msg={lErr} />}
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor={ids.le} style={LABEL}>Correo electrónico</label>
                <input id={ids.le} type="email" value={lEmail} onChange={e => setLEmail(e.target.value)} placeholder="tu@empresa.ec" style={INPUT} />
              </div>
              <div style={{ marginBottom: '22px' }}>
                <label htmlFor={ids.lp} style={LABEL}>Contraseña</label>
                <input id={ids.lp} type="password" value={lPass} onChange={e => setLPass(e.target.value)} placeholder="Tu contraseña" style={INPUT} />
              </div>
              <button type="submit" disabled={lLoad} style={{ width: '100%', padding: '13px', background: lLoad ? '#E2E8F0' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: lLoad ? '#94A3B8' : '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: lLoad ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: lLoad ? 'none' : '0 4px 18px rgba(29,78,216,0.4)', transition: 'all 0.15s' }}>
                {lLoad ? <><Spinner />Ingresando...</> : 'Iniciar sesión →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', margin: '14px 0 0' }}>
                ¿No tienes cuenta?{' '}
                <button type="button" onClick={toRegister} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Regístrate gratis</button>
              </p>
            </form>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <form onSubmit={doRegister} noValidate>
              {rErr !== '' && <ErrBox msg={rErr} />}
              {rOk  !== '' && <OkBox  msg={rOk}  />}

              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                <p style={SECTION_TITLE}>Datos personales</p>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.rn} style={LABEL}>Nombre completo <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rn} type="text" value={rName} onChange={e => setRName(e.target.value)} placeholder="Juan Pérez" style={INPUT} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.re} style={LABEL}>Correo electrónico <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.re} type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="tu@empresa.ec" style={INPUT} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.rp} style={LABEL}>Contraseña <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rp} type="password" value={rPass} onChange={e => setRPass(e.target.value)} placeholder="Mínimo 8 caracteres" style={INPUT} />
                </div>
                <div>
                  <label htmlFor={ids.rc} style={LABEL}>Confirmar contraseña <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rc} type="password" value={rConf} onChange={e => setRConf(e.target.value)} placeholder="Repite tu contraseña" style={{ ...INPUT, borderColor: passErr ? '#EF4444' : '#E2E8F0' }} />
                  {passErr && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0' }}>⚠ Las contraseñas no coinciden</p>}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
                <p style={SECTION_TITLE}>Tu empresa</p>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor={ids.rr} style={LABEL}>RUC <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rr} type="text" value={rRuc} onChange={e => setRRuc(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="1234567890001" style={{ ...INPUT, borderColor: rucErr ? '#EF4444' : '#E2E8F0' }} />
                  {rucErr && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0' }}>{rRuc.length}/13 dígitos</p>}
                </div>
                <div>
                  <label htmlFor={ids.rco} style={LABEL}>Razón social <span style={{ color: '#EF4444' }}>*</span></label>
                  <input id={ids.rco} type="text" value={rCompany} onChange={e => setRCompany(e.target.value)} placeholder="Mi Empresa S.A." style={INPUT} />
                </div>
              </div>

              <button type="submit" disabled={rLoad} style={{ width: '100%', padding: '13px', background: rLoad ? '#E2E8F0' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: rLoad ? '#94A3B8' : '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: rLoad ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: rLoad ? 'none' : '0 4px 18px rgba(29,78,216,0.4)', marginBottom: '12px' }}>
                {rLoad ? <><Spinner />Creando cuenta...</> : 'Crear cuenta gratis →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', margin: 0 }}>
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={toLogin} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Iniciar sesión</button>
              </p>
            </form>
          )}
        </div>

        {/* Badge SRI */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px rgba(34,197,94,0.8)' }} />
          <span style={{ color: 'rgba(147,197,253,0.5)', fontSize: '12px', letterSpacing: '0.04em' }}>Autorizado SRI Ecuador · Producción</span>
        </div>
      </div>
    </div>
  );
}