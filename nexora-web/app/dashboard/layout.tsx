'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Facturas',
    href: '/dashboard/invoices',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Clientes',
    href: '/dashboard/customers',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Productos',
    href: '/dashboard/products',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Empresas',
    href: '/dashboard/companies',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Certificados',
    href: '/dashboard/certificates',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    label: 'Planes',
    href: '/dashboard/plans',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
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
    <button type="button" onClick={handleClick} className={`nav-item ${isActive ? 'active' : ''}`}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {isActive && <span className="nav-dot" aria-hidden="true" />}
    </button>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [mounted,  setMounted]  = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    setMounted(true);
    const token = globalThis.localStorage.getItem('nexora_token');
    if (token) {
      const name = globalThis.localStorage.getItem('nexora_user_name');
      if (name) setUserName(name);
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleNavigate = useCallback((href: string) => router.push(href), [router]);

  const handleLogout = useCallback(() => {
    globalThis.localStorage.removeItem('nexora_token');
    globalThis.localStorage.removeItem('nexora_company_id');
    globalThis.localStorage.removeItem('nexora_user_name');
    router.push('/login');
  }, [router]);

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase() || 'N';

  if (!mounted) return null;

  return (
    <>
      <style>{`
        :root {
          --sb-bg:     #0B1628;
          --sb-border: rgba(255,255,255,0.06);
          --sb-width:  240px;
          --blue-soft: rgba(59,130,246,0.12);
          --tx-pri:    rgba(255,255,255,0.90);
          --tx-sec:    rgba(255,255,255,0.45);
          --tx-mut:    rgba(255,255,255,0.22);
        }
        .nx-layout   { display:flex; min-height:100vh; background:#F1F5F9; font-family:var(--font-sans,system-ui,sans-serif); }
        .nx-sidebar  { width:var(--sb-width); background:var(--sb-bg); border-right:1px solid var(--sb-border); display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:40; }

        /* ── Brand con logo PNG ── */
        .nx-brand { padding:0; border-bottom:1px solid var(--sb-border); overflow:hidden; }
        .nx-brand-logo-wrap {
          display:flex; align-items:center; justify-content:center;
          padding: 14px 16px 10px;
          background: linear-gradient(160deg, #0d1e3d 0%, #112347 100%);
        }
        .nx-brand-logo-inner {
          background: #ffffff;
          border-radius: 12px;
          padding: 6px 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .nx-brand-sub-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 16px 10px;
          background: linear-gradient(160deg, #112347 0%, #0d1e3d 100%);
        }
        .nx-brand-dot { width:5px; height:5px; border-radius:50%; background:#22C55E; box-shadow:0 0 6px rgba(34,197,94,0.8); flex-shrink:0; }
        .nx-brand-tag { font-size:10px; color:rgba(147,197,253,0.6); letter-spacing:0.06em; font-weight:500; }

        .nx-nav       { flex:1; padding:14px 10px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
        .nx-nav-label { font-size:9.5px; font-weight:600; letter-spacing:0.1em; color:var(--tx-mut); padding:0 10px; margin:0 0 8px; text-transform:uppercase; }
        .nav-item     { display:flex; align-items:center; gap:10px; width:100%; padding:9px 10px; border-radius:8px; font-size:13.5px; font-weight:400; color:var(--tx-sec); background:transparent; border:none; cursor:pointer; text-align:left; transition:all 0.15s ease; }
        .nav-item:hover { background:rgba(255,255,255,0.05); color:var(--tx-pri); }
        .nav-item.active { background:var(--blue-soft); color:#60A5FA; font-weight:500; }
        .nav-icon     { display:flex; align-items:center; justify-content:center; width:18px; flex-shrink:0; opacity:0.7; }
        .nav-item.active .nav-icon { opacity:1; }
        .nav-dot      { width:5px; height:5px; border-radius:50%; background:#3B82F6; margin-left:auto; flex-shrink:0; }

        .nx-user      { padding:10px 10px 14px; border-top:1px solid var(--sb-border); }
        .nx-user-card { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:8px; margin-bottom:4px; }
        .nx-avatar    { width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg,#1D4ED8,#3B82F6); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
        .nx-user-name { font-size:12.5px; font-weight:500; color:var(--tx-pri); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px; }
        .nx-user-role { font-size:10.5px; color:var(--tx-mut); margin:0; }
        .nx-logout    { display:flex; align-items:center; gap:8px; width:100%; padding:8px 10px; border-radius:8px; font-size:12.5px; font-weight:400; color:rgba(248,113,113,0.7); background:transparent; border:none; cursor:pointer; text-align:left; transition:all 0.15s; }
        .nx-logout:hover { background:rgba(239,68,68,0.08); color:#F87171; }
        .nx-main      { margin-left:var(--sb-width); flex:1; min-height:100vh; overflow:auto; }
      `}</style>

      <div className="nx-layout">
        <aside className="nx-sidebar">

          {/* ── Brand con logo PNG real ── */}
          <div className="nx-brand">
            <div className="nx-brand-logo-wrap">
              <div className="nx-brand-logo-inner">
                <Image
                  src="/nexora-logo.png"
                  alt="Nexora Labs"
                  width={148}
                  height={56}
                  style={{ objectFit: 'contain', display: 'block' }}
                  priority
                />
              </div>
            </div>
            <div className="nx-brand-sub-row">
              <span className="nx-brand-dot" />
              <span className="nx-brand-tag">Facturación Electrónica · SRI</span>
            </div>
          </div>

          <nav className="nx-nav" aria-label="Navegación principal">
            <p className="nx-nav-label">Menú</p>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
                || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <NavItem
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  isActive={isActive}
                  onNavigate={handleNavigate}
                />
              );
            })}
          </nav>

          <div className="nx-user">
            {userName !== '' && (
              <div className="nx-user-card">
                <div className="nx-avatar">{initials}</div>
                <div style={{ minWidth: 0 }}>
                  <p className="nx-user-name">{userName}</p>
                  <p className="nx-user-role">Administrador</p>
                </div>
              </div>
            )}
            <button type="button" onClick={handleLogout} className="nx-logout">
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