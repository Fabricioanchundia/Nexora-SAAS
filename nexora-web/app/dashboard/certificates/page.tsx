'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Certificate {
  id: string;
  holderName: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCertificates = () => {
    api.get('/certificates')
      .then((res) => {
        const data = res.data.data;
        setCertificates(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCertificates(); }, []);

  const handleUpload = async () => {
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
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Error al subir certificado');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Certificados</h2>
        <p className="text-slate-500 text-sm mt-1">Gestiona tu certificado digital BCE para firma electrónica</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Subir certificado .p12</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Archivo .p12</label>
            <input
              type="file"
              accept=".p12,.pfx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña del certificado</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contraseña del archivo .p12"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {uploading ? 'Subiendo...' : 'Subir certificado'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Certificados registrados</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : certificates.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay certificados registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Titular</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Válido desde</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Válido hasta</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{c.holderName || 'Sin nombre'}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(c.validFrom).toLocaleDateString('es-EC')}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(c.validUntil).toLocaleDateString('es-EC')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}