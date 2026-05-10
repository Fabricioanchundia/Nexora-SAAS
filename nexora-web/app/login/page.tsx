'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const router   = useRouter();
  const baseId   = useId();
  const emailId  = `${baseId}-email`;
  const passId   = `${baseId}-pass`;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), [],
  );
  const handlePassChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), [],
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Ingresa tu correo y contraseña'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user, company } = res.data.data ?? res.data;
      globalThis.localStorage.setItem('nexora_token',      token);
      globalThis.localStorage.setItem('nexora_user_name',  user?.name  ?? user?.email ?? '');
      globalThis.localStorage.setItem('nexora_company_id', company?.id ?? '');
      router.push('/dashboard');
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F0F4FF 0%, #E8F0FE 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#fff',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #E2E8F0',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(59,130,246,0.4)',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>N</span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '17px', color: '#0F172A', margin: 0, letterSpacing: '0.02em' }}>Nexora</p>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, marginTop: '1px' }}>Facturación Electrónica Ecuador</p>
          </div>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
          Iniciar sesión
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 28px 0' }}>
          Ingresa a tu cuenta para gestionar tus facturas
        </p>

        {/* eslint-disable-next-line -- native form, no react-hook-form needed here */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor={emailId} style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Correo electrónico
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="correo@empresa.com"
              autoComplete="email"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid #E2E8F0', borderRadius: '10px',
                padding: '10px 14px', fontSize: '14px', color: '#0F172A',
                background: '#F8FAFC', outline: 'none', transition: 'border 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#3B82F6'; e.target.style.background = '#fff'; }}
              onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor={passId} style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              id={passId}
              type="password"
              value={password}
              onChange={handlePassChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid #E2E8F0', borderRadius: '10px',
                padding: '10px 14px', fontSize: '14px', color: '#0F172A',
                background: '#F8FAFC', outline: 'none', transition: 'border 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#3B82F6'; e.target.style.background = '#fff'; }}
              onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }}
            />
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#DC2626', fontSize: '13px', borderRadius: '10px',
              padding: '10px 14px', marginBottom: '18px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#93C5FD' : 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Iniciando sesión...
              </>
            ) : 'Iniciar sesión'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#CBD5E1', marginTop: '28px' }}>
          © {new Date().getFullYear()} Nexora · Facturación SRI Ecuador
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}