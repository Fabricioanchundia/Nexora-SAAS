'use client';

import { useState, useCallback, useId, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import api from '@/lib/api';

type Mode = 'login' | 'register';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://177.7.58.244/api/v1';

// ── Canvas animado con partículas + líneas tipo fintech ────────
function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;

    let animId: number;
    let w = 0;
    let h = 0;

    function resize() {
      if (canvas === null) return;
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Partículas
    const COUNT = 55;
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; alphaDir: number;
    }
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.5 + 0.1,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
    }));

    function draw() {
      if (ctx === null) return;

      // Fondo degradado
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0,   '#060e25');
      grad.addColorStop(0.4, '#0a1a45');
      grad.addColorStop(0.7, '#0d2260');
      grad.addColorStop(1,   '#060e25');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Brillo central
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.55);
      glow.addColorStop(0,   'rgba(30,80,200,0.18)');
      glow.addColorStop(0.5, 'rgba(20,60,160,0.08)');
      glow.addColorStop(1,   'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Actualizar y dibujar partículas
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        p.alpha += p.alphaDir * 0.004;
        if (p.alpha >= 0.7) p.alphaDir = -1;
        if (p.alpha <= 0.05) p.alphaDir = 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,160,255,${p.alpha})`;
        ctx.fill();
      });

      // Líneas entre partículas cercanas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const opacity = (1 - dist / 130) * 0.15;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(80,140,255,${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

// ── Componentes UI ─────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ width: '15px', height: '15px', flexShrink: 0, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'nxspin 0.7s linear infinite' }} />
  );
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
const SEC: React.CSSProperties = {
  fontSize: '10.5px', fontWeight: 700, color: '#94A3B8',
  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px',
};

export default function LoginPage() {
  const router = useRouter();
  const baseId = useId();
  const [mode, setMode] = useState<Mode>('login');

  useEffect(() => {
    const id = 'nx-spin-css';
    if (document.getElementById(id) !== null) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = '@keyframes nxspin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

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
    e.preventDefault(); setLErr('');
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
    e.preventDefault(); setRErr(''); setROk('');
    if ([rName, rEmail, rPass, rConf, rRuc, rCompany].includes('')) { setRErr('Completa todos los campos'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail)) { setRErr('Correo electrónico no válido'); return; }
    if (rPass !== rConf) { setRErr('Las contraseñas no coinciden'); return; }
    if (rPass.length < 8) { setRErr('La contraseña debe tener al menos 8 caracteres'); return; }
    if (rRuc.length !== 13 || !/^\d+$/.test(rRuc)) { setRErr('El RUC debe tener exactamente 13 dígitos'); return; }
    setRLoad(true);
    try {
      await axios.post(`${API_URL}/auth/register`, { name: rName, email: rEmail, password: rPass });
      const lr = await axios.post(`${API_URL}/auth/login`, { email: rEmail, password: rPass });
      const token = lr.data?.token ?? lr.data?.access_token;
      if (token !== undefined) {
        globalThis.localStorage.setItem('nexora_token', token);
        globalThis.localStorage.setItem('nexora_user_name', rName);
        await api.post('/companies', { ruc: rRuc, businessName: rCompany, tradeName: rCompany, address: 'Ecuador', phone: '', email: rEmail, sriEnvironment: '2' }, { headers: { Authorization: `Bearer ${token}` } });
        const cr = await api.get('/companies', { headers: { Authorization: `Bearer ${token}` } });
        const d = cr.data?.data;
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'system-ui,-apple-system,sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Canvas animado en loop infinito */}
      <AnimatedBackground />

      {/* Card única con logo integrado arriba */}
      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Card con logo dentro en la parte superior */}
        <div style={{ background: 'rgba(255,255,255,0.98)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' }}>

          {/* Header azul con logo */}
          <div style={{ background: 'linear-gradient(135deg, #0d2149 0%, #1a3a8f 50%, #1D4ED8 100%)', padding: '28px 28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Brillo decorativo */}
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(29,78,216,0.15)', pointerEvents: 'none' }} />

            {/* Logo PNG sobre fondo blanco redondeado */}
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '16px', padding: '12px 24px', marginBottom: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', position: 'relative' }}>
              <Image
                src="/nexora-logo.png"
                alt="Nexora Labs"
                width={160}
                height={72}
                style={{ objectFit: 'contain', display: 'block' }}
                priority
              />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0, letterSpacing: '0.03em' }}>
              Facturación electrónica · SRI Ecuador
            </p>

            {/* Badge SRI */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '4px 12px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.8)', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11.5px', fontWeight: 600 }}>Ambiente Producción · Autorizado SRI</span>
            </div>
          </div>

          {/* Formulario */}
          <div style={{ padding: '24px 28px 28px' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '4px', marginBottom: '22px' }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} type="button" onClick={m === 'login' ? toLogin : toRegister}
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
                  <label htmlFor={ids.le} style={LABEL}>Correo electrónico</label>
                  <input id={ids.le} type="email" value={lEmail} onChange={e => setLEmail(e.target.value)} placeholder="tu@empresa.ec" style={INPUT} />
                </div>
                <div style={{ marginBottom: '22px' }}>
                  <label htmlFor={ids.lp} style={LABEL}>Contraseña</label>
                  <input id={ids.lp} type="password" value={lPass} onChange={e => setLPass(e.target.value)} placeholder="Tu contraseña" style={INPUT} />
                </div>
                <button type="submit" disabled={lLoad}
                  style={{ width: '100%', padding: '13px', background: lLoad ? '#E2E8F0' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: lLoad ? '#94A3B8' : '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: lLoad ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: lLoad ? 'none' : '0 4px 18px rgba(29,78,216,0.45)' }}>
                  {lLoad ? <><Spinner />Ingresando...</> : 'Iniciar sesión →'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', margin: '14px 0 0' }}>
                  ¿No tienes cuenta?{' '}
                  <button type="button" onClick={toRegister} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Regístrate gratis</button>
                </p>
              </form>
            )}

            {/* REGISTER */}
            {mode === 'register' && (
              <form onSubmit={doRegister} noValidate>
                {rErr !== '' && <ErrBox msg={rErr} />}
                {rOk  !== '' && <OkBox  msg={rOk}  />}
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                  <p style={SEC}>Datos personales</p>
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
                  <p style={SEC}>Tu empresa</p>
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
                <button type="submit" disabled={rLoad}
                  style={{ width: '100%', padding: '13px', background: rLoad ? '#E2E8F0' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: rLoad ? '#94A3B8' : '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: rLoad ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: rLoad ? 'none' : '0 4px 18px rgba(29,78,216,0.45)', marginBottom: '12px' }}>
                  {rLoad ? <><Spinner />Creando cuenta...</> : 'Crear cuenta gratis →'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', margin: 0 }}>
                  ¿Ya tienes cuenta?{' '}
                  <button type="button" onClick={toLogin} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Iniciar sesión</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}