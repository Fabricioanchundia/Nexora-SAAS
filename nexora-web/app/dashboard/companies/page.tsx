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

// S6853: extracted labelled field to ensure htmlFor is always set
function Field({ label, htmlFor, children }: Readonly<{ label: string; htmlFor: string; children: React.ReactNode }>) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400';

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
        const data = res.data.data;
        setCompanies(Array.isArray(data) ? data : [data]);
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
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [editing]);

  const handleCancelEdit = useCallback(() => setEditing(null), []);

  const ids = {
    ruc:      `${baseId}-ruc`,
    bizName:  `${baseId}-bizname`,
    trade:    `${baseId}-trade`,
    address:  `${baseId}-address`,
    phone:    `${baseId}-phone`,
    email:    `${baseId}-email`,
    env:      `${baseId}-env`,
  };

  // S3358: resolve page content without nested ternary
  let content: React.ReactNode;
  if (loading) {
    content = <div className="p-8 text-center text-slate-400">Cargando...</div>;
  } else {
    content = companies.map(company => {
      const isEditing = editing?.id === company.id;

      // S3358: resolve card body separately
      let cardBody: React.ReactNode;
      if (isEditing && editing) {
        const setField = (key: keyof Company) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
          setEditing({ ...editing, [key]: e.target.value });

        cardBody = (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Editar empresa</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="RUC" htmlFor={ids.ruc}>
                <input id={ids.ruc} type="text" disabled value={editing.ruc} className={INPUT_CLS} />
              </Field>
              <Field label="Razón social" htmlFor={ids.bizName}>
                <input id={ids.bizName} type="text" value={editing.businessName} onChange={setField('businessName')} className={INPUT_CLS} />
              </Field>
              <Field label="Nombre comercial" htmlFor={ids.trade}>
                <input id={ids.trade} type="text" value={editing.tradeName} onChange={setField('tradeName')} className={INPUT_CLS} />
              </Field>
              <Field label="Dirección" htmlFor={ids.address}>
                <input id={ids.address} type="text" value={editing.address} onChange={setField('address')} className={INPUT_CLS} />
              </Field>
              <Field label="Teléfono" htmlFor={ids.phone}>
                <input id={ids.phone} type="text" value={editing.phone} onChange={setField('phone')} className={INPUT_CLS} />
              </Field>
              <Field label="Email" htmlFor={ids.email}>
                <input id={ids.email} type="email" value={editing.email} onChange={setField('email')} className={INPUT_CLS} />
              </Field>
              <Field label="Ambiente SRI" htmlFor={ids.env}>
                <select id={ids.env} value={editing.sriEnvironment} onChange={setField('sriEnvironment')} className={INPUT_CLS}>
                  <option value="1">Pruebas</option>
                  <option value="2">Producción</option>
                </select>
              </Field>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={handleCancelEdit}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        );
      } else {
        const envBadge = company.sriEnvironment === '2'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200';
        const envLabel = company.sriEnvironment === '2' ? 'Producción' : 'Pruebas';

        cardBody = (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">{company.businessName}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{company.tradeName}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${envBadge}`}>{envLabel}</span>
                <button type="button" onClick={() => setEditing(company)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Editar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'RUC',       value: company.ruc },
                { label: 'Email',     value: company.email },
                { label: 'Teléfono',  value: company.phone },
                { label: 'Dirección', value: company.address },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-slate-700 font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          {cardBody}
        </div>
      );
    });
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
        <p className="text-slate-500 text-sm mt-1">Gestiona los datos de tu empresa emisora</p>
      </div>
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
      {content}
    </div>
  );
}