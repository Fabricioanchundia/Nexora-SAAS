'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/invoices',
    label: 'Facturas',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/customers',
    label: 'Clientes',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/products',
    label: 'Productos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/companies',
    label: 'Empresas',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/certificates',
    label: 'Certificados',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

// ── Nexora N logo SVG ──────────────────────────────────────────────────────────
function NexoraLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="ng1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#60B4FF" />
          <stop offset="100%" stopColor="#1A6FD4" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#ng1)" opacity="0.15" />
      {/* N letterform */}
      <path
        d="M10 30V10l7 0 13 15V10h0"
        stroke="url(#ng1)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M17 10v20"
        stroke="#60B4FF"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.4"
        fill="none"
      />
      <path
        d="M30 10v20"
        stroke="url(#ng1)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Star */}
      <path
        d="M33 8 L33.6 9.4 L35 9.4 L34 10.2 L34.4 11.6 L33 10.8 L31.6 11.6 L32 10.2 L31 9.4 L32.4 9.4 Z"
        fill="#93D0FF"
      />
    </svg>
  );
}

interface SidebarProps {
  userName?: string;
  userEmail?: string;
}

export function Sidebar({ userName = 'Usuario', userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    setLoggingOut(true);
    localStorage.removeItem('token');
    router.push('/login');
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <aside className="nexora-sidebar">
      {/* Brand */}
      <div className="nexora-brand">
        <NexoraLogo size={36} />
        <div>
          <span className="nexora-brand-name">NEXORA</span>
          <span className="nexora-brand-sub">Facturación Electrónica</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="nexora-nav">
        <p className="nexora-nav-label">MENÚ</p>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nexora-nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="nexora-nav-icon">{item.icon}</span>
            {item.label}
            {isActive(item.href) && <span className="nexora-nav-dot" />}
          </Link>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Plan badge */}
      <div className="nexora-plan-badge">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Plan Gratuito · 20 facturas/mes
      </div>

      {/* User */}
      <div className="nexora-user">
        <div className="nexora-user-avatar">{initials}</div>
        <div className="nexora-user-info">
          <p className="nexora-user-name">{userName}</p>
          {userEmail && <p className="nexora-user-email">{userEmail}</p>}
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Cerrar sesión"
          className="nexora-logout-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <style>{`
        .nexora-sidebar {
          width: 240px;
          min-height: 100vh;
          background: #0B1628;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          padding: 20px 14px 20px;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 40;
        }

        .nexora-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 6px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 24px;
        }

        .nexora-brand-name {
          display: block;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #fff;
          line-height: 1;
        }

        .nexora-brand-sub {
          display: block;
          font-size: 10px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.02em;
          margin-top: 3px;
        }

        .nexora-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nexora-nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.25);
          padding: 0 10px;
          margin: 0 0 8px;
        }

        .nexora-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 400;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all 0.15s ease;
          position: relative;
        }

        .nexora-nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.85);
        }

        .nexora-nav-item.active {
          background: rgba(55,138,221,0.15);
          color: #60B4FF;
          font-weight: 500;
        }

        .nexora-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          flex-shrink: 0;
        }

        .nexora-nav-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #378ADD;
          margin-left: auto;
        }

        .nexora-plan-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(55,138,221,0.1);
          border: 1px solid rgba(55,138,221,0.2);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          color: #60B4FF;
          margin-bottom: 16px;
          cursor: pointer;
        }

        .nexora-plan-badge:hover {
          background: rgba(55,138,221,0.18);
        }

        .nexora-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 16px;
        }

        .nexora-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1A6FD4, #378ADD);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
        }

        .nexora-user-info {
          flex: 1;
          min-width: 0;
        }

        .nexora-user-name {
          font-size: 12.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.85);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nexora-user-email {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nexora-logout-btn {
          padding: 6px;
          border-radius: 6px;
          color: rgba(255,255,255,0.3);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .nexora-logout-btn:hover {
          color: #ff6b6b;
          background: rgba(255,107,107,0.1);
        }
      `}</style>
    </aside>
  );
}