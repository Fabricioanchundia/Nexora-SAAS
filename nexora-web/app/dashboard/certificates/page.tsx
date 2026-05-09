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

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export default function CertificatesPage() {
  const baseId = useId();
  const fileId = `${baseId}-file`;
  const passId = `${baseId}-pass`;

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const loadCertificates = useCallback(() => {
    api.get('/certificates')
      .then(res => {
        const d = res.data.data;
        setCertificates(Array.isArray(d) ? d : []);
      })
      .catch((err: unknown) => console.error('[Certificates]', err))
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
      setSuccess('Certificado subido y validado correctamente');
      setFile(null);
      setPassphrase('');
      loadCertificates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al subir certificado');
    } finally {
      setUploading(false);
    }
  }, [file, passphrase, loadCertificates]);

  // S3358: no nested ternary
  let tableBody: React.ReactNode;
  if (loading) {
    tableBody = (
      <tr><td colSpan={4} className="py-10 text-center">
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </td></tr>
    );
  } else if (certificates.length === 0) {
    tableBody = (
      <tr><td colSpan={4} className="py-12 text-center">
        <p className="text-sm text-slate-500">No hay certificados registrados</p>
        <p className="text-xs text-slate-400 mt-1">Sube tu certificado BCE .p12 para firmar facturas</p>
      </td></tr>
    );
  } else {
    tableBody = certificates.map(c => {
      const days   = daysUntil(c.validUntil);
      const expCls = days <= 30 ? 'text-red-600' : days <= 90 ? 'text-amber-600' : 'text-slate-600';
      return (
        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                {/* ── Properly sized icon — NOT using SVG as file input label ── */}
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="text-blue-600" aria-hidden="true">
                  <circle cx="12" cy="8" r="6"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
              </div>
              <span className="font-medium text-slate-800 text-sm">{c.holderName ?? 'Sin nombre'}</span>
            </div>
          </td>
          <td className="px-5 py-4 text-sm text-slate-500">
            {new Date(c.validFrom).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
          </td>
          <td className="px-5 py-4">
            <p className={`text-sm font-medium ${expCls}`}>
              {new Date(c.validUntil).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            {days <= 90 && (
              <p className={`text-xs mt-0.5 ${expCls}`}>
                {days > 0 ? `Vence en ${days} días` : 'Expirado'}
              </p>
            )}
          </td>
          <td className="px-5 py-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {c.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Certificados</h1>
        <p className="mt-1 text-sm text-slate-500">Gestiona tu certificado digital BCE para firma electrónica XAdES-BES</p>
      </div>

      {/* Upload card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          {/* ── Properly sized upload icon in a box — not as SVG label ── */}
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="text-blue-600" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Subir certificado .p12</h2>
            <p className="text-xs text-slate-400 mt-0.5">Archivo emitido por el Banco Central del Ecuador</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={fileId} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Archivo .p12 / .pfx
            </label>
            <input
              id={fileId}
              type="file"
              accept=".p12,.pfx"
              onChange={handleFileChange}
              className="w-full border border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={passId} className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Contraseña del certificado
            </label>
            <input
              id={passId}
              type="password"
              value={passphrase}
              onChange={handlePassChange}
              placeholder="Contraseña del archivo .p12"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Subir certificado
              </>
            )}
          </button>
        </div>
      </div>

      {/* Certificates table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Certificados registrados</h2>
          <span className="text-xs text-slate-400">{certificates.length} certificado{certificates.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Titular</th>
                <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Válido desde</th>
                <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Válido hasta</th>
                <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{tableBody}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}