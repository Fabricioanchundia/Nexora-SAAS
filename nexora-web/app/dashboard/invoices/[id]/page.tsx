'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface InvoiceDetail {
  id: string;
  sequential: string;
  issueDate: string;
  total: number;
  subtotalNoTax: number;
  subtotalTaxable: number;
  taxAmount: number;
  discountTotal: number;
  status: string;
  accessKey: string;
  customer: { fullName: string; identification: string; identificationType: string; email?: string; phone?: string; address?: string; };
  items: { description: string; quantity: number; unitPrice: number; subtotal: number; taxAmount: number; ivaRate: string; }[];
  taxDocument?: { authorizationNumber?: string; authorizedAt?: string; sriStatus?: string; };
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

const ivaLabel: Record<string, string> = {
  '0': '0%', '2': '12%', '4': '15%', '5': '5%', '8': '8%', '6': 'No objeto', '7': 'Exento',
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/invoices/${params.id}`)
      .then((res) => {
        const data = res.data.data || res.data;
        setInvoice(data);
      })
      .catch(() => setError('No se pudo cargar la factura'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDownload = async (type: 'pdf' | 'xml') => {
    if (!invoice) return;
    try {
      const response = await api.get(`/invoices/${invoice.id}/${type}`, {
        responseType: 'blob',
      });
      const mimeType = type === 'pdf' ? 'application/pdf' : 'application/xml';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoice.sequential}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error al descargar el archivo');
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Cargando...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!invoice) return null;

  const status = statusLabel[invoice.status] || { label: invoice.status, color: 'bg-slate-100 text-slate-600' };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/invoices')}
          className="text-slate-400 hover:text-slate-600 transition-colors">
          ← Volver
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{invoice.sequential}</h2>
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date(invoice.issueDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {invoice.taxDocument?.authorizationNumber && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-green-800 mb-1">Factura Autorizada</p>
          <p className="text-xs text-green-700 font-mono break-all">
            Número de autorización: {invoice.taxDocument.authorizationNumber}
          </p>
          {invoice.taxDocument.authorizedAt && (
            <p className="text-xs text-green-600 mt-1">
              Autorizada el: {new Date(invoice.taxDocument.authorizedAt).toLocaleString('es-EC')}
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clave de acceso</p>
        <p className="text-xs font-mono text-slate-700 break-all">{invoice.accessKey}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h3 className="font-semibold text-slate-900 mb-3">Cliente</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Razón social</p>
            <p className="text-slate-800 font-medium">{invoice.customer.fullName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Identificación</p>
            <p className="text-slate-800">{invoice.customer.identification}</p>
          </div>
          {invoice.customer.email && (
            <div>
              <p className="text-slate-400 text-xs">Email</p>
              <p className="text-slate-800">{invoice.customer.email}</p>
            </div>
          )}
          {invoice.customer.phone && (
            <div>
              <p className="text-slate-400 text-xs">Teléfono</p>
              <p className="text-slate-800">{invoice.customer.phone}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Detalle de productos</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Descripción</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Cant.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">P. Unit.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">IVA</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{item.description}</td>
                <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-slate-600">${Number(item.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{ivaLabel[item.ivaRate] || item.ivaRate}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal sin impuestos</span>
              <span>${Number(invoice.subtotalNoTax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal gravado</span>
              <span>${Number(invoice.subtotalTaxable).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Descuento</span>
              <span>${Number(invoice.discountTotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>IVA</span>
              <span>${Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total</span>
              <span>${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {invoice.status === 'AUTHORIZED' && (
          <>
            <button
              onClick={() => handleDownload('pdf')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Descargar PDF
            </button>
            <button
              onClick={() => handleDownload('xml')}
              className="bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 transition-colors"
            >
              Descargar XML
            </button>
          </>
        )}
        {['ERROR', 'REJECTED'].includes(invoice.status) && (
          <button
            onClick={() => api.post(`/invoices/${invoice.id}/retry`).then(() => router.refresh())}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}