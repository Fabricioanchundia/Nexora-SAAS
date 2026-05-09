'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

interface Customer {
  readonly id: string;
  readonly identification: string;
  readonly identificationType: string;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
}

const schema = z.object({
  identificationType: z.enum(['04', '05', '06', '07', '08']),
  identification: z.string().min(1, 'Requerido'),
  fullName:       z.string().min(2, 'Requerido'),
  email:          z.email('Email inválido').optional().or(z.literal('')),
  phone:          z.string().optional(),
  address:        z.string().optional(),
});

type CustomerForm = z.infer<typeof schema>;

const ID_TYPE_LABELS: Readonly<Record<string, string>> = {
  '04': 'Cédula',
  '05': 'Pasaporte',
  '06': 'RUC',
  '07': 'Consumidor Final',
  '08': 'Id. exterior',
};

// S6853: LabelledInput ensures label is always associated via htmlFor
interface LabelledInputProps {
  readonly id: string;
  readonly label: string;
  readonly error?: string;
  readonly [key: string]: unknown;
}

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

export default function CustomersPage() {
  const baseId = useId();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: { identificationType: '04' },
  });

  const loadCustomers = useCallback(() => {
    api.get('/customers')
      .then((res) => {
        const data = res.data.data as Customer[] | { customers: Customer[] };
        setCustomers(Array.isArray(data) ? data : data.customers ?? []);
      })
      .catch((err: unknown) => console.error('[CustomersPage] load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleToggleForm = useCallback(() => {
    setShowForm(prev => !prev);
    setError('');
    reset();
  }, [reset]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    reset();
    setError('');
  }, [reset]);

  const onSubmit = useCallback(async (data: CustomerForm) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/customers', data);
      reset();
      setShowForm(false);
      loadCustomers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  }, [reset, loadCustomers]);

  // S3358: resolve table body content without nested ternary
  let tableBody: React.ReactNode;
  if (loading) {
    tableBody = <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">Cargando clientes...</td></tr>;
  } else if (customers.length === 0) {
    tableBody = (
      <tr><td colSpan={5}>
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Sin clientes</p>
          <p className="text-xs text-slate-400">Agrega tu primer cliente para comenzar a facturar.</p>
        </div>
      </td></tr>
    );
  } else {
    tableBody = customers.map(c => (
      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td className="px-5 py-3.5">
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
            {ID_TYPE_LABELS[c.identificationType] ?? c.identificationType}
          </span>
        </td>
        <td className="px-5 py-3.5 font-mono text-sm text-slate-700">{c.identification}</td>
        <td className="px-5 py-3.5 font-medium text-slate-800">{c.fullName}</td>
        <td className="px-5 py-3.5 text-slate-500 text-sm">{c.email ?? '—'}</td>
        <td className="px-5 py-3.5 text-slate-500 text-sm">{c.phone ?? '—'}</td>
      </tr>
    ));
  }

  // Field IDs for S6853
  const ids = {
    idType:  `${baseId}-id-type`,
    idNum:   `${baseId}-id-num`,
    name:    `${baseId}-name`,
    email:   `${baseId}-email`,
    phone:   `${baseId}-phone`,
    address: `${baseId}-address`,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona tu cartera de clientes</p>
        </div>
        <button type="button" onClick={handleToggleForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-600/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
          </svg>
          {showForm ? 'Cancelar' : 'Nuevo cliente'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Nuevo cliente</h2>
          {/* S6853: all inputs have matching htmlFor/id */}
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
            <div>
              <label htmlFor={ids.idType} className="block text-sm font-medium text-slate-700 mb-1">Tipo identificación</label>
              <select id={ids.idType} {...register('identificationType')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="04">Cédula</option>
                <option value="05">Pasaporte</option>
                <option value="06">RUC</option>
                <option value="07">Consumidor Final</option>
                <option value="08">Id. exterior</option>
              </select>
            </div>
            <div>
              <label htmlFor={ids.idNum} className="block text-sm font-medium text-slate-700 mb-1">Identificación</label>
              <input id={ids.idNum} {...register('identification')} placeholder="Ej: 1350135958" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <FieldError message={errors.identification?.message} />
            </div>
            <div className="col-span-2">
              <label htmlFor={ids.name} className="block text-sm font-medium text-slate-700 mb-1">Nombre completo / Razón social</label>
              <input id={ids.name} {...register('fullName')} placeholder="Ej: Juan Pérez" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <FieldError message={errors.fullName?.message} />
            </div>
            <div>
              <label htmlFor={ids.email} className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
              <input id={ids.email} {...register('email')} type="email" placeholder="correo@ejemplo.com" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <label htmlFor={ids.phone} className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input id={ids.phone} {...register('phone')} placeholder="0999999999" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label htmlFor={ids.address} className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <input id={ids.address} {...register('address')} placeholder="Ej: Av. Principal 123" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Tipo', 'Identificación', 'Nombre', 'Correo', 'Teléfono'].map(h => (
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