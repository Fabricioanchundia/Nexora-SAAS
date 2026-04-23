'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Invoice {
  id: string;
  sequential: string;
  total: number;
  status: string;
  customer: { fullName: string };
}

interface Stats {
  totalInvoices: number;
  authorized: number;
  pending: number;
  error: number;
  totalAmount: number;
  recentInvoices: Invoice[];
}

const statusLabel: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  PENDING_SIGN: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  PROCESSING: { label: 'Procesando', color: 'bg-blue-100 text-blue-700' },
  SUBMITTED: { label: 'Enviada al SRI', color: 'bg-blue-100 text-blue-700' },
  AUTHORIZED: { label: 'Autorizada', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-600' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0, authorized: 0, pending: 0, error: 0, totalAmount: 0, recentInvoices: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexora_token');
    if (!token) { router.push('/login'); return; }
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/invoices?page=1&limit=100');
      const response = res.data?.data;
      const invoices: Invoice[] = Array.isArray(response) ? response :
                                   Array.isArray(response?.data) ? response.data :
                                   Array.isArray(response?.invoices) ? response.invoices : [];
      setStats({
        totalInvoices: invoices.length,
        authorized: invoices.filter((i) => i.status === 'AUTHORIZED').length,
        pending: invoices.filter((i) => ['PROCESSING', 'PENDING_SIGN', 'SUBMITTED'].includes(i.status)).length,
        error: invoices.filter((i) => ['ERROR', 'REJECTED'].includes(i.status)).length,
        totalAmount: invoices.filter((i) => i.status === 'AUTHORIZED').reduce((acc, i) => acc + Number(i.total || 0), 0),
        recentInvoices: invoices.slice(0, 5),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total facturas', value: stats.totalInvoices, color: 'text-slate-900', border: 'border-slate-200' },
    { label: 'Autorizadas', value: stats.authorized, color: 'text-green-600', border: 'border-green-200' },
    { label: 'En proceso', value: stats.pending, color: 'text-blue-600', border: 'border-blue-200' },
    { label: 'Con error', value: stats.error, color: 'text-red-500', border: 'border-red-200' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Resumen de tu facturación electrónica</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} p-5`}>
            <p className="text-xs font-medium text-slate-500 mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>
              {loading ? '—' : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <p className="text-xs font-medium text-slate-500 mb-1">Total facturado autorizado</p>
        <p className="text-3xl font-bold text-slate-900">
          {loading ? '—' : `$${stats.totalAmount.toFixed(2)}`}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Facturas recientes</h3>
          <button onClick={() => router.push('/dashboard/invoices')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Ver todas
          </button>
        </div>
        {loading ? (
          <div className="p-6 text-center text-slate-400 text-sm">Cargando...</div>
        ) : stats.recentInvoices.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No hay facturas aún</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Secuencial</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>
                  <td className="px-4 py-3 font-mono text-slate-700 text-xs">{inv.sequential}</td>
                  <td className="px-4 py-3 text-slate-700">{inv.customer?.fullName || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusLabel[inv.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel[inv.status]?.label || inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Acciones rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nueva factura', href: '/dashboard/invoices/new', primary: true },
            { label: 'Ver facturas', href: '/dashboard/invoices', primary: false },
            { label: 'Clientes', href: '/dashboard/customers', primary: false },
            { label: 'Productos', href: '/dashboard/products', primary: false },
          ].map((action) => (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className={`text-sm font-medium px-4 py-3 rounded-lg transition-colors ${
                action.primary
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}