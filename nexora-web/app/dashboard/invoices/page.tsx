'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

interface Invoice {
  id: string;
  sequential: string;
  issueDate: string;
  customer: { fullName: string };
  total: number;
  status: string;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  PENDING_SIGN: { label: 'Pendiente firma', color: 'bg-yellow-100 text-yellow-700' },
  PROCESSING: { label: 'Procesando', color: 'bg-blue-100 text-blue-700' },
  SUBMITTED: { label: 'Enviada al SRI', color: 'bg-blue-100 text-blue-700' },
  AUTHORIZED: { label: 'Autorizada', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Anulada', color: 'bg-slate-100 text-slate-500' },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-600' },
};

function InvoicesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  let content;

  if (loading) {
    content = <div className="p-8 text-center text-slate-400 text-sm">Cargando facturas...</div>;
  } else if (invoices.length === 0) {
    content = <div className="p-8 text-center text-slate-400 text-sm">No hay facturas registradas</div>;
  } else {
    content = (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Secuencial</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Total</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-slate-700">{inv.sequential || '-'}</td>
              <td className="px-4 py-3 text-slate-700">{inv.customer?.fullName || '-'}</td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(inv.issueDate).toLocaleDateString('es-EC')}
              </td>
              <td className="px-4 py-3 font-medium text-slate-800">
                ${Number(inv.total).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusLabel[inv.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                  {statusLabel[inv.status]?.label || inv.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const loadInvoices = useCallback(async () => {
    try {
      const res = await api.get('/invoices?page=1&limit=50');
      const response = res.data?.data;
      let list: Invoice[] = [];

      if (Array.isArray(response)) {
        list = response;
      } else if (Array.isArray(response?.data)) {
        list = response.data;
      } else if (Array.isArray(response?.invoices)) {
        list = response.invoices;
      }

      setInvoices(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadInvoices();
    const interval = setInterval(loadInvoices, 8000);
    return () => clearInterval(interval);
  }, [searchParams, loadInvoices]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Facturas</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona tus comprobantes electrónicos</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/invoices/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Nueva factura
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {content}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400 text-sm">Cargando...</div>}>
      <InvoicesList />
    </Suspense>
  );
}