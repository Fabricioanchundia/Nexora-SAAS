'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type Mode = 'login' | 'register';

function NexoraLogo({ size = 56 }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Nexora Labs logo">
      <defs>
        <linearGradient id="ng1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B4FF" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="ng2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <polygon points="28,164 28,36 66,36 134,122 134,36 172,36 172,164 134,164 66,78 66,164" fill="url(#ng1)" />
      <polygon points="66,36 104,36 134,78 96,78" fill="url(#ng2)" opacity="0.65" />
      <g transform="translate(154,40)">
        <polygon points="0,-9 2.2,-2.2 9,0 2.2,2.2 0,9 -2.2,2.2 -9,0 -2.2,-2.2" fill="#BAE6FD" />
      </g>
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{
      width: '15px', height: '15px', flexShrink: 0,
      border: '2.5px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'nxspin 0.7s linear infinite',
    }} />
  );
}

function ErrorBox({ message }: Readonly<{ message: string }>) {
  return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {message}
    </div>
  );
}

function SuccessBox({ message }: Readonly<{ message: string }>) {
  return (
    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '13px', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const baseId = useId();
  const [mode, setMode] = useState<Mode>('login');

  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError,    setLoginError]    = useState('');
  const [loginLoading,  setLoginLoading]  = useState(false);

  const [regName,     setRegName]     = useState('');
  const [regEmail,    setRegEmail]    = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm,  setRegConfirm]  = useState('');
  const [regError,    setRegError]    = useState('');
  const [regSuccess,  setRegSuccess]  = useState('');
  const [regLoading,  setRegLoading]  = useState(false);

  const ids = {
    le: `${baseId}-le`, lp: `${baseId}-lp`,
    rn: `${baseId}-rn`, re: `${baseId}-re`,
    rp: `${baseId}-rp`, rc: `${baseId}-rc`,
  };

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #E2E8F0', borderRadius: '12px',
    padding: '11px 14px', fontSize: '14px', color: '#0F172A',
    background: '#F8FAFC', outline: 'none', transition: 'all 0.15s',
    fontFamily: 'inherit',
  };
  const iFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#3B82F6';
    e.target.style.background  = '#fff';
    e.target.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.12)';
  };
  const iBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#E2E8F0';
    e.target.style.background  = '#F8FAFC';
    e.target.style.boxShadow   = 'none';
  };

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
    color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(29,78,216,0.35)',
    transition: 'all 0.2s', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#374151', marginBottom: '6px',
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '15px' };

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { setLoginError('Ingresa tu correo y contraseña'); return; }
    setLoginLoading(true); setLoginError('');
    try {
      const res = await api.post('/auth/login', { email: loginEmail, password: loginPassword });
      const { token, user, company } = res.data.data ?? res.data;
      globalThis.localStorage.setItem('nexora_token',      token);
      globalThis.localStorage.setItem('nexora_user_name',  user?.name ?? user?.email ?? '');
      globalThis.localStorage.setItem('nexora_company_id', company?.id ?? '');
      router.push('/dashboard');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m  = ax.response?.data?.message;
      setLoginError(Array.isArray(m) ? m[0] : m ?? 'Error al iniciar sesión. Intente nuevamente.');
    } finally { setLoginLoading(false); }
  }, [loginEmail, loginPassword, router]);

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) { setRegError('Completa todos los campos'); return; }
    if (regPassword !== regConfirm) { setRegError('Las contraseñas no coinciden'); return; }
    if (regPassword.length < 8) { setRegError('La contraseña debe tener al menos 8 caracteres'); return; }
    setRegLoading(true); setRegError(''); setRegSuccess('');
    try {
      await api.post('/auth/register', { name: regName, email: regEmail, password: regPassword });
      setRegSuccess('¡Cuenta creada! Redirigiendo al login...');
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegConfirm('');
      setTimeout(() => { setMode('login'); setRegSuccess(''); }, 2000);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m  = ax.response?.data?.message;
      setRegError(Array.isArray(m) ? m[0] : m ?? 'Error al crear la cuenta.');
    } finally { setRegLoading(false); }
  }, [regName, regEmail, regPassword, regConfirm]);

  const toLogin    = useCallback(() => { setMode('login');    setRegError(''); setRegSuccess(''); }, []);
  const toRegister = useCallback(() => { setMode('register'); setLoginError(''); }, []);

  return (
    <>
      <style>{`
        @keyframes nxspin   { to { transform: rotate(360deg); } }
        @keyframes nxfadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .nx-card { animation: nxfadeIn 0.35s ease; }
        .nx-submit:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(29,78,216,0.42) !important; }
        .nx-submit:active:not(:disabled) { transform: translateY(0); }
        .nx-submit:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(150deg, #EEF2FF 0%, #DBEAFE 60%, #E0F2FE 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position:'fixed', top:'-120px', right:'-120px', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'fixed', bottom:'-100px', left:'-100px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 65%)', pointerEvents:'none' }} />

        <div className="nx-card" style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(255,255,255,0.93)',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          padding: '40px 40px 32px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.9) inset',
          border: '1px solid rgba(255,255,255,0.75)',
        }}>

          {/* Brand */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'26px' }}>
            <NexoraLogo size={64} />
            <p style={{ fontWeight:800, fontSize:'20px', color:'#0F172A', margin:'12px 0 0', letterSpacing:'0.08em' }}>NEXORA</p>
            <p style={{ fontSize:'10.5px', color:'#94A3B8', margin:'3px 0 0', letterSpacing:'0.14em', fontWeight:500, textTransform:'uppercase' }}>Facturación SRI · Ecuador</p>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', background:'#F1F5F9', borderRadius:'12px', padding:'4px', marginBottom:'26px', gap:'4px' }}>
            {(['login','register'] as Mode[]).map(m => (
              <button key={m} type="button"
                onClick={m === 'login' ? toLogin : toRegister}
                style={{
                  flex:1, padding:'9px 0', borderRadius:'9px', border:'none',
                  cursor:'pointer', fontSize:'13px', fontWeight:600,
                  transition:'all 0.2s', fontFamily:'inherit',
                  background: mode === m ? '#fff' : 'transparent',
                  color:      mode === m ? '#1D4ED8' : '#64748B',
                  boxShadow:  mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} noValidate>
              <div style={fieldStyle}>
                <label htmlFor={ids.le} style={labelStyle}>Correo electrónico</label>
                <input id={ids.le} type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="correo@empresa.com" autoComplete="email" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
              </div>
              <div style={{ ...fieldStyle, marginBottom: '22px' }}>
                <label htmlFor={ids.lp} style={labelStyle}>Contraseña</label>
                <input id={ids.lp} type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
              </div>
              {loginError && <ErrorBox message={loginError} />}
              <button type="submit" disabled={loginLoading} className="nx-submit" style={btnStyle}>
                {loginLoading ? <><Spinner />Iniciando sesión...</> : 'Iniciar sesión'}
              </button>
            </form>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} noValidate>
              <div style={fieldStyle}>
                <label htmlFor={ids.rn} style={labelStyle}>Nombre completo</label>
                <input id={ids.rn} type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Juan Pérez" autoComplete="name" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
              </div>
              <div style={fieldStyle}>
                <label htmlFor={ids.re} style={labelStyle}>Correo electrónico</label>
                <input id={ids.re} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="correo@empresa.com" autoComplete="email" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
              </div>
              <div style={fieldStyle}>
                <label htmlFor={ids.rp} style={labelStyle}>Contraseña</label>
                <input id={ids.rp} type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
              </div>
              <div style={{ ...fieldStyle, marginBottom: '20px' }}>
                <label htmlFor={ids.rc} style={labelStyle}>Confirmar contraseña</label>
                <input id={ids.rc} type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Repite tu contraseña" autoComplete="new-password" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
              </div>
              {regError   && <ErrorBox   message={regError} />}
              {regSuccess && <SuccessBox message={regSuccess} />}
              <button type="submit" disabled={regLoading} className="nx-submit" style={btnStyle}>
                {regLoading ? <><Spinner />Creando cuenta...</> : 'Crear cuenta gratis'}
              </button>
              <p style={{ textAlign:'center', fontSize:'11.5px', color:'#94A3B8', marginTop:'12px', marginBottom:0 }}>
                Al registrarte aceptas los términos de servicio
              </p>
            </form>
          )}

          {/* Footer */}
          <p style={{ textAlign:'center', fontSize:'11px', color:'#CBD5E1', marginTop:'24px', paddingTop:'18px', borderTop:'1px solid #F1F5F9', marginBottom:0 }}>
            © {new Date().getFullYear()} Nexora Labs · Autorizado SRI Ecuador
          </p>
        </div>
      </div>
    </>
  );
}