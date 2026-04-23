'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Facturas', href: '/dashboard/invoices' },
  { label: 'Clientes', href: '/dashboard/customers' },
  { label: 'Productos', href: '/dashboard/products' },
  { label: 'Empresas', href: '/dashboard/companies' },
  { label: 'Certificados', href: '/dashboard/certificates' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('nexora_token');
    if (!token) { router.push('/login'); return; }
    const name = localStorage.getItem('nexora_user_name');
    if (name) setUserName(name);
  }, []);

  if (!mounted) return null;

  const handleLogout = () => {
    localStorage.removeItem('nexora_token');
    localStorage.removeItem('nexora_company_id');
    localStorage.removeItem('nexora_user_name');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col fixed h-full shadow-sm">
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

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          {userName && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs text-slate-400">Conectado como</p>
              <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
            </div>
          )}
          <button
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