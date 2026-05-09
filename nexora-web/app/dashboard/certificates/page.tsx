'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import api from '@/lib/api';

interface Certificate {
  readonly id: string;
  readonly holderName: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly isActive: boolean;
}

export default function CertificatesPage() {
  const baseId = useId();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const fileInputId       = `${baseId}-file`;
  const passphraseInputId = `${baseId}-pass`;

  const loadCertificates = useCallback(() => {
    api.get('/certificates')
      .then(res => {
        const data = res.data.data;
        setCertificates(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => console.error('[CertificatesPage]', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCertificates(); }, [loadCertificates]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  }, []);

  const handlePassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassphrase(e.target.value);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !passphrase) {
      setError('Selecciona el archivo .p12 e ingresa la contraseña');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('passphrase', passphrase);
      await api.post('/certificates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Certificado subido correctamente');
      setFile(null);
      setPassphrase('');
      loadCertificates();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al subir certificado');
    } finally {
      setUploading(false);
    }
  }, [file, passphrase, loadCertificates]);

  // S3358: table body without nested ternary
  let tableBody: React.ReactNode;
  if (loading) {
    tableBody = <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Cargando...</td></tr>;
  } else if (certificates.length === 0) {
    tableBody = <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">No hay certificados registrados</td></tr>;
  } else {
    tableBody = certificates.map(c => (
      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-5 py-3.5 text-slate-700 font-medium">{c.holderName || 'Sin nombre'}</td>
        <td className="px-5 py-3.5 text-slate-500 text-sm">{new Date(c.validFrom).toLocaleDateString('es-EC')}</td>
        <td className="px-5 py-3.5 text-slate-500 text-sm">{new Date(c.validUntil).toLocaleDateString('es-EC')}</td>
        <td className="px-5 py-3.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {c.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </td>
      </tr>
    ));
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Certificados</h1>
        <p className="text-slate-500 text-sm mt-1">Gestiona tu certificado digital BCE para firma electrónica</p>
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Subir certificado .p12</h2>
        <div className="space-y-4">
          <div>
            {/* S6853: label with matching htmlFor */}
            <label htmlFor={fileInputId} className="block text-sm font-medium text-slate-700 mb-1">Archivo .p12</label>
            <input
              id={fileInputId}
              type="file"
              accept=".p12,.pfx"
              onChange={handleFileChange}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor={passphraseInputId} className="block text-sm font-medium text-slate-700 mb-1">Contraseña del certificado</label>
            <input
              id={passphraseInputId}
              type="password"
              value={passphrase}
              onChange={handlePassChange}
              placeholder="Contraseña del archivo .p12"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">{success}</div>}
          <button type="button" onClick={handleUpload} disabled={uploading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            {uploading ? 'Subiendo...' : 'Subir certificado'}
          </button>
        </div>
      </div>

      {/* Certificates list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Certificados registrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Titular', 'Válido desde', 'Válido hasta', 'Estado'].map(h => (
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