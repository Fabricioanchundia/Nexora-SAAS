'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import api from '@/lib/api';

interface Product {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly unitPrice: number;
  readonly ivaRate: string;
}

const IVA_LABELS: Readonly<Record<string, string>> = {
  '0': '0%', '2': '12%', '4': '15%', '5': '5%', '8': '8%', '6': 'No objeto', '7': 'Exento',
};

interface ProductFormData {
  code: string;
  name: string;
  description: string;
  unitPrice: string;
  ivaRate: string;
}

const EMPTY_FORM: ProductFormData = {
  code: '', name: '', description: '', unitPrice: '', ivaRate: '4',
};

export default function ProductsPage() {
  const baseId = useId();
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState<ProductFormData>(EMPTY_FORM);
  const [error, setError]         = useState('');

  // S6853: IDs for all form controls
  const ids = {
    code:        `${baseId}-code`,
    name:        `${baseId}-name`,
    description: `${baseId}-desc`,
    unitPrice:   `${baseId}-price`,
    ivaRate:     `${baseId}-iva`,
  };

  const loadProducts = useCallback(() => {
    api.get('/products')
      .then(res => {
        const data = res.data.data;
        setProducts(Array.isArray(data) ? data : data?.products ?? []);
      })
      .catch((err: unknown) => console.error('[ProductsPage]', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleToggleForm = useCallback(() => {
    setShowForm(prev => !prev);
    setForm(EMPTY_FORM);
    setError('');
  }, []);

  const handleFieldChange = useCallback((field: keyof ProductFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
    }, []);

  const handleSave = useCallback(async () => {
    if (!form.code || !form.name || !form.unitPrice) {
      setError('Código, nombre y precio son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/products', {
        code:        form.code,
        name:        form.name,
        description: form.description,
        // S7773: Number.parseFloat instead of parseFloat
        unitPrice:   Number.parseFloat(form.unitPrice),
        ivaRate:     form.ivaRate,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadProducts();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  }, [form, loadProducts]);

  // S3358: resolve table body without nested ternary
  let tableBody: React.ReactNode;
  if (loading) {
    tableBody = (
      <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">Cargando productos...</td></tr>
    );
  } else if (products.length === 0) {
    tableBody = (
      <tr><td colSpan={5}>
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Sin productos</p>
          <p className="text-xs text-slate-400">Agrega productos o servicios para incluirlos en tus facturas.</p>
        </div>
      </td></tr>
    );
  } else {
    tableBody = products.map(p => (
      (() => {
        let ivaMultiplier = 0;
        if (p.ivaRate === '2') {
          ivaMultiplier = 0.12;
        } else if (p.ivaRate === '4') {
          ivaMultiplier = 0.15;
        }

        return (
          <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td className="px-5 py-3.5">
              <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{p.code}</span>
            </td>
            <td className="px-5 py-3.5">
              <p className="font-medium text-slate-800">{p.name}</p>
              {p.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.description}</p>}
            </td>
            <td className="px-5 py-3.5 font-semibold text-slate-800">${Number(p.unitPrice).toFixed(2)}</td>
            <td className="px-5 py-3.5">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${p.ivaRate === '0' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                {IVA_LABELS[p.ivaRate] ?? p.ivaRate}
              </span>
            </td>
            <td className="px-5 py-3.5 text-slate-600 text-sm">
              ${(Number(p.unitPrice) * (1 + ivaMultiplier)).toFixed(2)}
            </td>
          </tr>
        );
      })()
    ));
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Productos</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona tu catálogo de productos y servicios</p>
        </div>
        <button type="button" onClick={handleToggleForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-600/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
          </svg>
          {showForm ? 'Cancelar' : 'Nuevo producto'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Nuevo producto</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={ids.code} className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              <input id={ids.code} type="text" value={form.code} onChange={handleFieldChange('code')} placeholder="Ej: PROD-001"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor={ids.name} className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input id={ids.name} type="text" value={form.name} onChange={handleFieldChange('name')} placeholder="Ej: Servicio de consultoría"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label htmlFor={ids.description} className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <input id={ids.description} type="text" value={form.description} onChange={handleFieldChange('description')} placeholder="Descripción opcional"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor={ids.unitPrice} className="block text-sm font-medium text-slate-700 mb-1">Precio unitario</label>
              <input id={ids.unitPrice} type="number" step="0.01" min="0" value={form.unitPrice} onChange={handleFieldChange('unitPrice')} placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor={ids.ivaRate} className="block text-sm font-medium text-slate-700 mb-1">IVA</label>
              <select id={ids.ivaRate} value={form.ivaRate} onChange={handleFieldChange('ivaRate')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="0">0%</option>
                <option value="2">12%</option>
                <option value="4">15%</option>
                <option value="5">5%</option>
                <option value="6">No objeto</option>
                <option value="7">Exento</option>
              </select>
            </div>
          </div>
          {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={handleToggleForm}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Código', 'Nombre', 'Precio', 'IVA', 'Precio + IVA'].map(h => (
                  <th key={h} scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{tableBody}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}