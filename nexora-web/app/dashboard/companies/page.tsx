'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import api from '@/lib/api';

interface Company {
  id: string;
  ruc: string;
  businessName: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  sriEnvironment: string;
  isActive: boolean;
}

const INPUT_CLS = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400';

export default function CompaniesPage() {
  const baseId = useId();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<Company | null>(null);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/companies')
      .then(res => {
        const d = res.data.data;
        setCompanies(Array.isArray(d) ? d : [d]);
      })
      .catch((err: unknown) => console.error('[CompaniesPage]', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/companies/${editing.id}`, editing);
      setSuccess('Empresa actualizada correctamente');
      setCompanies(prev => prev.map(c => c.id === editing.id ? editing : c));
      setEditing(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [editing]);

  const handleCancelEdit = useCallback(() => setEditing(null), []);

  const ids = {
    ruc:   `${baseId}-ruc`,
    biz:   `${baseId}-biz`,
    trade: `${baseId}-trade`,
    addr:  `${baseId}-addr`,
    phone: `${baseId}-phone`,
    email: `${baseId}-email`,
    env:   `${baseId}-env`,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
        <p className="mt-1 text-sm text-slate-500">Gestiona los datos de tu empresa emisora en el SRI</p>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {companies.map(company => {
        const isEditing = editing?.id === company.id;
        const isProd    = company.sriEnvironment === '2';

        const setField = (key: keyof Company) =>
          (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            if (!editing) return;
            setEditing({ ...editing, [key]: e.target.value });
          };

        return (
          <div key={company.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
            {isEditing && editing ? (
              /* ── Edit form ── */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-900">Editar empresa</h3>
                  <button type="button" onClick={handleCancelEdit} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label htmlFor={ids.ruc} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">RUC</label>
                    <input id={ids.ruc} type="text" disabled value={editing.ruc} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label htmlFor={ids.biz} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Razón social</label>
                    <input id={ids.biz} type="text" value={editing.businessName} onChange={setField('businessName')} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label htmlFor={ids.trade} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Nombre comercial</label>
                    <input id={ids.trade} type="text" value={editing.tradeName} onChange={setField('tradeName')} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label htmlFor={ids.phone} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                    <input id={ids.phone} type="text" value={editing.phone} onChange={setField('phone')} className={INPUT_CLS} />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor={ids.addr} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Dirección</label>
                    <input id={ids.addr} type="text" value={editing.address} onChange={setField('address')} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label htmlFor={ids.email} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input id={ids.email} type="email" value={editing.email} onChange={setField('email')} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label htmlFor={ids.env} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Ambiente SRI</label>
                    <select id={ids.env} value={editing.sriEnvironment} onChange={setField('sriEnvironment')} className={INPUT_CLS}>
                      <option value="1">Pruebas</option>
                      <option value="2">Producción</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
                  <button type="button" onClick={handleCancelEdit} className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/20">
                      <span className="text-white text-xl font-bold">{company.businessName?.[0] ?? 'N'}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{company.businessName}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{company.tradeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${isProd ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isProd ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {isProd ? 'Producción' : 'Pruebas'}
                    </span>
                    <button type="button" onClick={() => setEditing(company)} className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Editar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  {[
                    { label: 'RUC',       value: company.ruc },
                    { label: 'Email',     value: company.email },
                    { label: 'Teléfono',  value: company.phone },
                    { label: 'Dirección', value: company.address },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-slate-800">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}