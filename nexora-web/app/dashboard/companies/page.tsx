'use client';

import { useEffect, useState } from 'react';
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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/companies')
      .then((res) => {
        const data = res.data.data;
        setCompanies(Array.isArray(data) ? data : [data]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/companies/${editing.id}`, editing);
      setSuccess('Empresa actualizada correctamente');
      setCompanies((prev) => prev.map((c) => c.id === editing.id ? editing : c));
      setEditing(null);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Empresas</h2>
        <p className="text-slate-500 text-sm mt-1">Gestiona los datos de tu empresa emisora</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400">Cargando...</div>
      ) : companies.map((company) => (
        <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          {editing?.id === company.id ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Editar empresa</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'RUC', key: 'ruc', disabled: true },
                  { label: 'Razón social', key: 'businessName' },
                  { label: 'Nombre comercial', key: 'tradeName' },
                  { label: 'Dirección', key: 'address' },
                  { label: 'Teléfono', key: 'phone' },
                  { label: 'Email', key: 'email' },
                ].map(({ label, key, disabled }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={(editing as any)[key] || ''}
                      onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ambiente SRI</label>
                  <select
                    value={editing.sriEnvironment}
                    onChange={(e) => setEditing({ ...editing, sriEnvironment: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">Pruebas</option>
                    <option value="2">Producción</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button onClick={() => setEditing(null)}
                  className="text-slate-600 hover:text-slate-800 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{company.businessName}</h3>
                  <p className="text-sm text-slate-500">{company.tradeName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${company.sriEnvironment === '2' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {company.sriEnvironment === '2' ? 'Producción' : 'Pruebas'}
                  </span>
                  <button onClick={() => setEditing(company)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Editar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">RUC</p><p className="text-slate-700">{company.ruc}</p></div>
                <div><p className="text-xs text-slate-400">Email</p><p className="text-slate-700">{company.email}</p></div>
                <div><p className="text-xs text-slate-400">Teléfono</p><p className="text-slate-700">{company.phone}</p></div>
                <div><p className="text-xs text-slate-400">Dirección</p><p className="text-slate-700">{company.address}</p></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}