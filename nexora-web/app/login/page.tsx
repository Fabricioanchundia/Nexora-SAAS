'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

// S6759: Readonly props
interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard' },
  { label: 'Facturas',     href: '/dashboard/invoices' },
  { label: 'Clientes',     href: '/dashboard/customers' },
  { label: 'Productos',    href: '/dashboard/products' },
  { label: 'Empresas',     href: '/dashboard/companies' },
  { label: 'Certificados', href: '/dashboard/certificates' },
] as const;

// S6759: extracted NavItem — avoids inline onClick factory inside .map()
interface NavItemProps {
  readonly label: string;
  readonly href: string;
  readonly isActive: boolean;
  readonly onNavigate: (href: string) => void;
}

function NavItem({ label, href, isActive, onNavigate }: NavItemProps) {
  const handleClick = useCallback(() => onNavigate(href), [onNavigate, href]);
  const cls = isActive
    ? 'w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-blue-50 text-blue-700'
    : 'w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900';
  return (
    <button type="button" onClick={handleClick} className={cls}>
      {label}
    </button>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted]   = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    setMounted(true);
    // S7764: globalThis instead of window/localStorage
    const token = globalThis.localStorage.getItem('nexora_token');
    // S7735: positive condition first — avoid negated condition
    if (token) {
      const name = globalThis.localStorage.getItem('nexora_user_name');
      if (name) setUserName(name);
    } else {
      router.push('/login');
    }
  }, [router]);

  // S6759: stable ref — no inline handler in JSX
  const handleNavigate = useCallback((href: string) => router.push(href), [router]);

  const handleLogout = useCallback(() => {
    globalThis.localStorage.removeItem('nexora_token');
    globalThis.localStorage.removeItem('nexora_company_id');
    globalThis.localStorage.removeItem('nexora_user_name');
    router.push('/login');
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col fixed h-full shadow-sm">

        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Nexora</h1>
              <p className="text-xs text-slate-400">Facturación Electrónica</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
              || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                isActive={isActive}
                onNavigate={handleNavigate}
              />
            );
          })}
        </nav>

        {/* User / logout */}
        <div className="px-3 py-4 border-t border-slate-100">
          {userName && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs text-slate-400">Conectado como</p>
              <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}