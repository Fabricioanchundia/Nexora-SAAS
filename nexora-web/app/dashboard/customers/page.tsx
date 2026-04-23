'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

interface Customer {
  id: string;
  identification: string;
  identificationType: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

const schema = z.object({
  identificationType: z.enum(['04', '05', '06', '07', '08']),
  identification: z.string().min(1, 'Requerido'),
  fullName: z.string().min(2, 'Requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerForm = z.infer<typeof schema>;

const idTypeLabel: Record<string, string> = {
  '04': 'Cédula',
  '05': 'Pasaporte',
  '06': 'RUC',
  '07': 'Consumidor Final',
  '08': 'Identificación exterior',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: { identificationType: '04' },
  });

  const loadCustomers = () => {
    api.get('/customers')
      .then((res) => {
        const data = res.data.data;
        setCustomers(Array.isArray(data) ? data : data?.customers || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCustomers(); }, []);

  const onSubmit = async (data: CustomerForm) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/customers', data);
      reset();
      setShowForm(false);
      loadCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona tu cartera de clientes</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); reset(); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : 'Nuevo cliente'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Nuevo cliente</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo identificación</label>
              <select {...register('identificationType')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="04">Cédula</option>
                <option value="05">Pasaporte</option>
                <option value="06">RUC</option>
                <option value="07">Consumidor Final</option>
                <option value="08">Identificación exterior</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Identificación</label>
              <input {...register('identification')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 1350135958" />
              {errors.identification && <p className="text-red-500 text-xs mt-1">{errors.identification.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo / Razón social</label>
              <input {...register('fullName')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Juan Pérez" />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
              <input {...register('email')} type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="correo@ejemplo.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input {...register('phone')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0999999999" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <input {...register('address')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Av. Principal 123" />
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
                {saving ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay clientes registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Identificación</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Correo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 text-xs">{idTypeLabel[c.identificationType] || c.identificationType}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{c.identification}</td>
                  <td className="px-4 py-3 text-slate-700">{c.fullName}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}