'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

interface Product {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  ivaRate: string;
  isActive: boolean;
}

const schema = z.object({
  code: z.string().min(1, 'Requerido'),
  name: z.string().min(2, 'Requerido'),
  description: z.string().optional(),
  unitPrice: z.string().min(1, 'Requerido'),
  ivaRate: z.enum(['0', '2', '3', '4', '5', '6', '7', '8']),
});

type ProductForm = z.infer<typeof schema>;

const ivaLabel: Record<string, string> = {
  '0': '0%',
  '2': '12%',
  '3': '14%',
  '4': '15%',
  '5': '5%',
  '6': 'No objeto IVA',
  '7': 'Exento',
  '8': '8%',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(schema),
    defaultValues: { ivaRate: '2' },
  });

  const loadProducts = () => {
    api.get('/products')
      .then((res) => {
        const data = res.data.data;
        setProducts(Array.isArray(data) ? data : data?.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, []);

  const onSubmit = async (data: ProductForm) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/products', {
        ...data,
        unitPrice: parseFloat(data.unitPrice),
      });
      reset();
      setShowForm(false);
      loadProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Productos</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona tu catálogo de productos y servicios</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); reset(); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : 'Nuevo producto'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Nuevo producto</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              <input {...register('code')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: PROD001" />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio unitario</label>
              <input {...register('unitPrice')} type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
              {errors.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.unitPrice.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input {...register('name')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Servicio de consultoría" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IVA</label>
              <select {...register('ivaRate')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="2">12%</option>
                <option value="4">15%</option>
                <option value="5">5%</option>
                <option value="8">8%</option>
                <option value="0">0%</option>
                <option value="6">No objeto IVA</option>
                <option value="7">Exento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción adicional (opcional)</label>
              <input {...register('description')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && (
              <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); reset(); setError(''); }} className="text-slate-600 hover:text-slate-800 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors">
                {saving ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay productos registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Precio</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">IVA</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">{p.code}</td>
                  <td className="px-4 py-3 text-slate-700">{p.name}</td>
                  <td className="px-4 py-3 text-slate-700">${Number(p.unitPrice).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-500">{ivaLabel[p.ivaRate] || p.ivaRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}