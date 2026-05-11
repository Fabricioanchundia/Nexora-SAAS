'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type Mode = 'login' | 'register';

// ── Decode JWT sin librerías — extrae payload directamente ──────────────────
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = globalThis.atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ── Extrae company_id de la respuesta del login ───────────────────────────────
function extractCompanyId(body: Record<string, unknown>, token: string): string {
  // 1. Intentar desde el JWT payload directamente (más confiable)
  const payload = decodeJwt(token);
  console.log('[Nexora] JWT payload:', JSON.stringify(payload));
  const fromJwt = payload.companyId ?? payload.company_id ??
    (payload.company as Record<string,unknown>)?.id ??
    payload.sub_company ?? payload.cid;
  if (fromJwt) return String(fromJwt);

  // 2. Intentar desde la respuesta directa
  const tries: Array<() => unknown> = [
    () => (body.company as Record<string,unknown>)?.id,
    () => (body.user as Record<string,unknown>)?.companyId,
    () => (body.user as Record<string,unknown>)?.company_id,
    () => ((body.user as Record<string,unknown>)?.company as Record<string,unknown>)?.id,
    () => ((body.user as Record<string,unknown>)?.companies as Array<Record<string,unknown>>)?.[0]?.id,
    () => body.companyId,
    () => body.company_id,
  ];
  for (const fn of tries) {
    try { const v = fn(); if (v) return String(v); } catch { /* skip */ }
  }
  return '';
}

function NexoraLogoMark({ size = 60 }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Nexora">
      <defs>
        <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C8FF" /><stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="lg2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>
      <polygon points="28,168 28,32 68,32 68,100 132,32 172,32 172,168 132,168 132,100 68,168" fill="url(#lg1)" />
      <polygon points="68,32 108,32 68,82" fill="url(#lg2)" opacity="0.55" />
      <polygon points="132,168 92,168 132,118" fill="url(#lg2)" opacity="0.55" />
      <g transform="translate(158,36)"><polygon points="0,-10 2.4,-2.4 10,0 2.4,2.4 0,10 -2.4,2.4 -10,0 -2.4,-2.4" fill="#BAE6FD" /></g>
    </svg>
  );
}

function Spinner() {
  return <div style={{ width:'15px', height:'15px', flexShrink:0, border:'2.5px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'nxspin 0.7s linear infinite' }} />;
}

function ErrBox({ msg }: Readonly<{ msg: string }>) {
  return (
    <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'13px', borderRadius:'10px', padding:'10px 14px', marginBottom:'16px', display:'flex', gap:'8px', alignItems:'flex-start' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink:0, marginTop:'1px' }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {msg}
    </div>
  );
}

function OkBox({ msg }: Readonly<{ msg: string }>) {
  return (
    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#15803D', fontSize:'13px', borderRadius:'10px', padding:'10px 14px', marginBottom:'16px', display:'flex', gap:'8px', alignItems:'flex-start' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink:0, marginTop:'1px' }} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {msg}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const baseId = useId();
  const [mode, setMode] = useState<Mode>('login');

  const [lEmail, setLEmail] = useState('');
  const [lPass,  setLPass]  = useState('');
  const [lErr,   setLErr]   = useState('');
  const [lLoad,  setLLoad]  = useState(false);

  const [rName,  setRName]  = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass,  setRPass]  = useState('');
  const [rConf,  setRConf]  = useState('');
  const [rErr,   setRErr]   = useState('');
  const [rOk,    setROk]    = useState('');
  const [rLoad,  setRLoad]  = useState(false);

  const ids = { le:`${baseId}-le`, lp:`${baseId}-lp`, rn:`${baseId}-rn`, re:`${baseId}-re`, rp:`${baseId}-rp`, rc:`${baseId}-rc` };

  const inp: React.CSSProperties = { width:'100%', boxSizing:'border-box', border:'1.5px solid #E2E8F0', borderRadius:'12px', padding:'11px 14px', fontSize:'14px', color:'#0F172A', background:'#F8FAFC', outline:'none', transition:'all 0.15s', fontFamily:'inherit' };
  const foc = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor='#3B82F6'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,0.12)'; };
  const blu = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor='#E2E8F0'; e.target.style.background='#F8FAFC'; e.target.style.boxShadow='none'; };
  const btn: React.CSSProperties = { width:'100%', padding:'13px', background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(29,78,216,0.35)', transition:'all 0.2s', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' };
  const lbl: React.CSSProperties = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' };
  const fd: React.CSSProperties  = { marginBottom:'15px' };

  const doLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lEmail || !lPass) { setLErr('Ingresa tu correo y contraseña'); return; }
    setLLoad(true); setLErr('');
    try {
      const res  = await api.post('/auth/login', { email: lEmail, password: lPass });
      const body = (res.data.data ?? res.data) as Record<string, unknown>;
      const token = String(body.token ?? body.access_token ?? body.accessToken ?? '');

      if (!token) { setLErr('El servidor no devolvió token válido.'); return; }

      const userName  = String((body.user as Record<string,unknown>)?.name ?? (body.user as Record<string,unknown>)?.email ?? body.name ?? lEmail);
      const companyId = extractCompanyId(body, token);

      globalThis.localStorage.setItem('nexora_token',      token);
      globalThis.localStorage.setItem('nexora_user_name',  userName);
      globalThis.localStorage.setItem('nexora_company_id', companyId);

      console.log('[Nexora Login] body:', JSON.stringify(body, null, 2));
      console.log('[Nexora Login] companyId guardado:', companyId || '⚠ VACÍO');

      router.push('/dashboard');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m  = ax.response?.data?.message;
      setLErr(Array.isArray(m) ? m[0] : m ?? 'Error al iniciar sesión.');
    } finally { setLLoad(false); }
  }, [lEmail, lPass, router]);

  const doRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName || !rEmail || !rPass) { setRErr('Completa todos los campos'); return; }
    if (rPass !== rConf)             { setRErr('Las contraseñas no coinciden'); return; }
    if (rPass.length < 8)            { setRErr('Mínimo 8 caracteres'); return; }
    setRLoad(true); setRErr(''); setROk('');
    try {
      await api.post('/auth/register', { name: rName, email: rEmail, password: rPass });
      setROk('¡Cuenta creada! Redirigiendo...');
      setRName(''); setREmail(''); setRPass(''); setRConf('');
      setTimeout(() => { setMode('login'); setROk(''); }, 2000);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m  = ax.response?.data?.message;
      setRErr(Array.isArray(m) ? m[0] : m ?? 'Error al crear la cuenta.');
    } finally { setRLoad(false); }
  }, [rName, rEmail, rPass, rConf]);

  const toLogin    = useCallback(() => { setMode('login');    setRErr(''); setROk(''); }, []);
  const toRegister = useCallback(() => { setMode('register'); setLErr(''); }, []);

  return (
    <>
      <style>{`
        @keyframes nxspin   { to { transform:rotate(360deg); } }
        @keyframes nxfadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .nx-card { animation:nxfadeIn 0.35s ease; }
        .nx-btn:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); }
        .nx-btn:active:not(:disabled) { transform:translateY(0); }
        .nx-btn:disabled { opacity:0.65; cursor:not-allowed; }
      `}</style>
      <div style={{ minHeight:'100vh', background:'linear-gradient(150deg,#EEF2FF 0%,#DBEAFE 55%,#E0F2FE 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'system-ui,-apple-system,sans-serif', position:'relative', overflow:'hidden' }}>
        <div className="nx-card" style={{ width:'100%', maxWidth:'420px', background:'rgba(255,255,255,0.94)', backdropFilter:'blur(24px)', borderRadius:'24px', padding:'40px 40px 32px', boxShadow:'0 8px 48px rgba(0,0,0,0.10)', border:'1px solid rgba(255,255,255,0.75)' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'26px' }}>
            <NexoraLogoMark size={64} />
            <p style={{ fontWeight:800, fontSize:'20px', color:'#0F172A', margin:'12px 0 0', letterSpacing:'0.08em' }}>NEXORA</p>
            <p style={{ fontSize:'10.5px', color:'#94A3B8', margin:'3px 0 0', letterSpacing:'0.14em', fontWeight:500, textTransform:'uppercase' }}>Facturación SRI · Ecuador</p>
          </div>
          <div style={{ display:'flex', background:'#F1F5F9', borderRadius:'12px', padding:'4px', marginBottom:'26px', gap:'4px' }}>
            {(['login','register'] as Mode[]).map(m => (
              <button key={m} type="button" onClick={m==='login'?toLogin:toRegister}
                style={{ flex:1, padding:'9px 0', borderRadius:'9px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'all 0.2s', fontFamily:'inherit', background:mode===m?'#fff':'transparent', color:mode===m?'#1D4ED8':'#64748B', boxShadow:mode===m?'0 2px 8px rgba(0,0,0,0.08)':'none' }}>
                {m==='login'?'Iniciar sesión':'Crear cuenta'}
              </button>
            ))}
          </div>
          {mode === 'login' && (
            <form onSubmit={doLogin} noValidate>
              <div style={fd}><label htmlFor={ids.le} style={lbl}>Correo electrónico</label><input id={ids.le} type="email" value={lEmail} onChange={e=>setLEmail(e.target.value)} placeholder="correo@empresa.com" autoComplete="email" style={inp} onFocus={foc} onBlur={blu} /></div>
              <div style={{...fd,marginBottom:'22px'}}><label htmlFor={ids.lp} style={lbl}>Contraseña</label><input id={ids.lp} type="password" value={lPass} onChange={e=>setLPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={inp} onFocus={foc} onBlur={blu} /></div>
              {lErr && <ErrBox msg={lErr} />}
              <button type="submit" disabled={lLoad} className="nx-btn" style={btn}>{lLoad?<><Spinner/>Iniciando...</>:'Iniciar sesión'}</button>
            </form>
          )}
          {mode === 'register' && (
            <form onSubmit={doRegister} noValidate>
              <div style={fd}><label htmlFor={ids.rn} style={lbl}>Nombre completo</label><input id={ids.rn} type="text" value={rName} onChange={e=>setRName(e.target.value)} placeholder="Juan Pérez" autoComplete="name" style={inp} onFocus={foc} onBlur={blu} /></div>
              <div style={fd}><label htmlFor={ids.re} style={lbl}>Correo electrónico</label><input id={ids.re} type="email" value={rEmail} onChange={e=>setREmail(e.target.value)} placeholder="correo@empresa.com" autoComplete="email" style={inp} onFocus={foc} onBlur={blu} /></div>
              <div style={fd}><label htmlFor={ids.rp} style={lbl}>Contraseña</label><input id={ids.rp} type="password" value={rPass} onChange={e=>setRPass(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" style={inp} onFocus={foc} onBlur={blu} /></div>
              <div style={{...fd,marginBottom:'20px'}}><label htmlFor={ids.rc} style={lbl}>Confirmar contraseña</label><input id={ids.rc} type="password" value={rConf} onChange={e=>setRConf(e.target.value)} placeholder="Repite tu contraseña" autoComplete="new-password" style={inp} onFocus={foc} onBlur={blu} /></div>
              {rErr && <ErrBox msg={rErr} />}
              {rOk  && <OkBox  msg={rOk}  />}
              <button type="submit" disabled={rLoad} className="nx-btn" style={btn}>{rLoad?<><Spinner/>Creando...</>:'Crear cuenta gratis'}</button>
              <p style={{ textAlign:'center', fontSize:'11.5px', color:'#94A3B8', marginTop:'12px', marginBottom:0 }}>Al registrarte aceptas los términos de servicio</p>
            </form>
          )}
          <p style={{ textAlign:'center', fontSize:'11px', color:'#CBD5E1', marginTop:'24px', paddingTop:'18px', borderTop:'1px solid #F1F5F9', marginBottom:0 }}>
            © {new Date().getFullYear()} Nexora Labs · Autorizado SRI Ecuador
          </p>
        </div>
      </div>
    </>
  );
}