'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',              icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
  { label: 'Facturas',     href: '/dashboard/invoices',     icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
  { label: 'Clientes',     href: '/dashboard/customers',    icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { label: 'Productos',    href: '/dashboard/products',     icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg> },
  { label: 'Empresas',     href: '/dashboard/companies',    icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg> },
  { label: 'Certificados', href: '/dashboard/certificates', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg> },
  { label: 'Planes',       href: '/dashboard/plans',        icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> },
] as const;

// Módulos próximamente
const COMING_SOON = [
  { label: 'Inventario',    icon: '📦', color: '#059669' },
  { label: 'Punto de Venta', icon: '🖥️', color: '#7C3AED' },
] as const;

interface NavItemProps {
  readonly label: string;
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly isActive: boolean;
  readonly onNavigate: (href: string) => void;
}

function NavItem({ label, href, icon, isActive, onNavigate }: NavItemProps) {
  const handleClick = useCallback(() => onNavigate(href), [onNavigate, href]);
  return (
    <button type="button" onClick={handleClick}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 10px', borderRadius: '8px', fontSize: '13.5px', fontWeight: isActive ? 500 : 400, color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.45)', background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{icon}</span>
      <span>{label}</span>
      {isActive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3B82F6', marginLeft: 'auto', flexShrink: 0 }} />}
    </button>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [mounted,  setMounted]  = useState(false);
  const [userName, setUserName] = useState('');
  const [dark,     setDark]     = useState(false);

  // ── Aplicar tema al <html> — única forma garantizada ──────────
  useEffect(() => {
    setMounted(true);
    const token = globalThis.localStorage.getItem('nexora_token');
    if (!token) { router.push('/login'); return; }
    const name = globalThis.localStorage.getItem('nexora_user_name');
    if (name) setUserName(name);

    const saved = globalThis.localStorage.getItem('nexora_theme');
    const isDark = saved === 'dark';
    setDark(isDark);
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [router]);

  const handleToggle = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      globalThis.localStorage.setItem('nexora_theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      return next;
    });
  }, []);

  const handleNavigate = useCallback((href: string) => router.push(href), [router]);
  const handleLogout   = useCallback(() => {
    globalThis.localStorage.removeItem('nexora_token');
    globalThis.localStorage.removeItem('nexora_company_id');
    globalThis.localStorage.removeItem('nexora_user_name');
    router.push('/login');
  }, [router]);

  const initials = userName.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase() || 'N';

  if (!mounted) return null;

  return (
    <>
      <style>{`
        /* ════════════════════════════════════════════════
           NEXORA — Sistema de temas claro / oscuro
           Se aplica en :root[data-theme="dark"]
        ════════════════════════════════════════════════ */

        :root {
          --nx-bg:           #F1F5F9;
          --nx-card:         #ffffff;
          --nx-card-border:  #F1F5F9;
          --nx-card-shadow:  0 1px 4px rgba(0,0,0,0.05);
          --nx-tx1:          #0F172A;
          --nx-tx2:          #64748B;
          --nx-tx3:          #94A3B8;
          --nx-input-bg:     #F8FAFC;
          --nx-input-border: #E2E8F0;
          --nx-divider:      #F1F5F9;
          --nx-table-head:   #F8FAFC;
          --nx-row-hover:    #F8FAFC;
          --nx-badge-gray:   #F8FAFC;
          --nx-badge-gray-tx:#475569;
        }

        :root[data-theme="dark"] {
          --nx-bg:           #060e25;
          --nx-card:         #0d1b35;
          --nx-card-border:  rgba(255,255,255,0.07);
          --nx-card-shadow:  0 2px 16px rgba(0,0,0,0.35);
          --nx-tx1:          rgba(255,255,255,0.92);
          --nx-tx2:          rgba(255,255,255,0.52);
          --nx-tx3:          rgba(255,255,255,0.28);
          --nx-input-bg:     rgba(255,255,255,0.05);
          --nx-input-border: rgba(255,255,255,0.1);
          --nx-divider:      rgba(255,255,255,0.06);
          --nx-table-head:   rgba(255,255,255,0.03);
          --nx-row-hover:    rgba(255,255,255,0.04);
          --nx-badge-gray:   rgba(255,255,255,0.06);
          --nx-badge-gray-tx:rgba(255,255,255,0.5);
        }

        /* ── Aplicar variables a TODO el dashboard ── */
        .nx-main {
          background: var(--nx-bg) !important;
          transition: background 0.3s;
        }

        /* Cards / paneles blancos */
        .nx-main div[style*="background: '#fff'"],
        .nx-main div[style*="background:'#fff'"],
        .nx-main div[style*="background: rgb(255, 255, 255)"],
        .nx-main div[style*="background:#fff"] {
          background: var(--nx-card) !important;
          border-color: var(--nx-card-border) !important;
          box-shadow: var(--nx-card-shadow) !important;
        }

        /* Fondo gris claro de secciones */
        .nx-main div[style*="background: '#F1F5F9'"],
        .nx-main div[style*="background:'#F1F5F9'"],
        .nx-main div[style*="background: '#F8FAFC'"],
        .nx-main div[style*="background:'#F8FAFC'"] {
          background: var(--nx-badge-gray) !important;
        }

        /* Textos primarios */
        .nx-main *[style*="color: '#0F172A'"],
        .nx-main *[style*="color:'#0F172A'"],
        .nx-main h1, .nx-main h2, .nx-main h3 {
          color: var(--nx-tx1) !important;
        }

        /* Textos secundarios */
        .nx-main *[style*="color: '#64748B'"],
        .nx-main *[style*="color:'#64748B'"] {
          color: var(--nx-tx2) !important;
        }

        .nx-main *[style*="color: '#94A3B8'"],
        .nx-main *[style*="color:'#94A3B8'"],
        .nx-main *[style*="color: '#475569'"],
        .nx-main *[style*="color:'#475569'"] {
          color: var(--nx-tx3) !important;
        }

        /* Inputs */
        .nx-main input,
        .nx-main select,
        .nx-main textarea {
          background: var(--nx-input-bg) !important;
          border-color: var(--nx-input-border) !important;
          color: var(--nx-tx1) !important;
        }

        /* Tablas */
        .nx-main table { color: var(--nx-tx1); }
        .nx-main th    { background: var(--nx-table-head) !important; color: var(--nx-tx3) !important; }
        .nx-main tr    { border-color: var(--nx-divider) !important; }

        /* Bordes */
        .nx-main *[style*="border: '1px solid #E2E8F0'"],
        .nx-main *[style*="border: '1px solid #F1F5F9'"],
        .nx-main *[style*="borderBottom: '1px solid #F8FAFC'"],
        .nx-main *[style*="borderTop: '1px solid #F1F5F9'"] {
          border-color: var(--nx-divider) !important;
        }

        /* Sidebar */
        .nx-sidebar { width:240px; background:#0B1628; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:40; }
        .nx-main    { margin-left:240px; flex:1; min-height:100vh; overflow:auto; }
        .nx-layout  { display:flex; min-height:100vh; font-family:system-ui,-apple-system,sans-serif; }

        /* Toggle switch animación */
        .nx-toggle-track { width:38px; height:21px; border-radius:11px; position:relative; transition:background 0.25s; flex-shrink:0; cursor:pointer; }
        .nx-toggle-thumb { position:absolute; top:2.5px; width:16px; height:16px; border-radius:50%; background:#fff; transition:left 0.25s; display:flex; align-items:center; justify-content:center; font-size:10px; box-shadow:0 1px 4px rgba(0,0,0,0.3); }

        /* Hover nav */
        .nx-nav-btn:hover { background:rgba(255,255,255,0.06) !important; color:rgba(255,255,255,0.85) !important; }

        /* Próximamente badge */
        .nx-soon { display:inline-flex; align-items:center; padding:2px 7px; borderRadius:6px; background:rgba(255,255,255,0.08); fontSize:9.5px; color:rgba(255,255,255,0.3); fontWeight:600; letterSpacing:0.05em; border-radius:6px; }
      `}</style>

      <div className="nx-layout" style={{ background: 'var(--nx-bg)' }}>
        <aside className="nx-sidebar">

          {/* Logo */}
          <div style={{ padding: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px 10px', background: 'linear-gradient(160deg,#0d1e3d,#112347)' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                <Image src="/nexora-logo.png" alt="Nexora Labs" width={148} height={56} style={{ objectFit: 'contain', display: 'block' }} priority />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '7px 16px 10px', background: 'linear-gradient(160deg,#112347,#0d1e3d)' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.8)', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'rgba(147,197,253,0.6)', letterSpacing: '0.06em', fontWeight: 500 }}>Facturación Electrónica · SRI</span>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }} aria-label="Navegación principal">
            <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', padding: '0 10px', margin: '0 0 8px', textTransform: 'uppercase' }}>Menú</p>

            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return <NavItem key={item.href} label={item.label} href={item.href} icon={item.icon} isActive={isActive} onNavigate={handleNavigate} />;
            })}

            {/* Separador módulos próximamente */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0 8px' }} />
            <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', padding: '0 10px', margin: '0 0 6px', textTransform: 'uppercase' }}>Próximamente</p>

            {COMING_SOON.map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 10px', borderRadius: '8px', fontSize: '13.5px', color: 'rgba(255,255,255,0.25)', cursor: 'default', position: 'relative' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', flexShrink: 0, fontSize: '14px', opacity: 0.5 }}>{m.icon}</span>
                <span style={{ flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: '8.5px', fontWeight: 700, color: m.color, background: `${m.color}18`, border: `1px solid ${m.color}30`, borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.04em', flexShrink: 0 }}>
                  PRONTO
                </span>
              </div>
            ))}
          </nav>

          {/* User + toggle + logout */}
          <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

            {/* User card */}
            {userName !== '' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '8px', marginBottom: '6px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{userName}</p>
                  <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.22)', margin: 0 }}>Administrador</p>
                </div>
              </div>
            )}

            {/* Toggle modo oscuro */}
            <button
              type="button"
              onClick={handleToggle}
              aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '4px' }}
            >
              <div
                className="nx-toggle-track"
                style={{ background: dark ? '#3B82F6' : 'rgba(255,255,255,0.15)', border: dark ? 'none' : '1px solid rgba(255,255,255,0.15)' }}
              >
                <div
                  className="nx-toggle-thumb"
                  style={{ left: dark ? '19px' : '2.5px' }}
                >
                  {dark ? '🌙' : '☀️'}
                </div>
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
                {dark ? 'Modo oscuro' : 'Modo claro'}
              </span>
            </button>

            {/* Logout */}
            <button type="button" onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 400, color: 'rgba(248,113,113,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="nx-main">
          {children}
        </main>
      </div>
    </>
  );
}