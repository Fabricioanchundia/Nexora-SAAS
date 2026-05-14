'use client';

import { useEffect, useState, useCallback, useId, useRef } from 'react';
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ExpiryStyle { bg: string; color: string; border: string; }

function getExpiryStyle(days: number): ExpiryStyle {
  if (days <= 30) return { bg: '#FEF2F2', color: '#DC2626', border: 'rgba(220,38,38,0.18)' };
  if (days <= 90) return { bg: '#FFFBEB', color: '#D97706', border: 'rgba(217,119,6,0.18)' };
  return { bg: '#F8FAFC', color: '#64748B', border: 'rgba(100,116,139,0.18)' };
}

function isExpiringSoon(days: number): boolean {
  return days <= 90;
}

function getDropZoneStyle(dragOver: boolean, hasFile: boolean): React.CSSProperties {
  if (dragOver) return { border: '2px solid #3B82F6', background: '#EFF6FF' };
  if (hasFile)  return { border: '2px solid #22C55E', background: '#F0FDF4' };
  return { border: '2px dashed #CBD5E1', background: '#F8FAFC' };
}

interface DropZoneContentProps {
  readonly file: File | null;
  readonly dragOver: boolean;
}

function DropZoneContent({ file, dragOver }: DropZoneContentProps) {
  if (file !== null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p style={{ color: '#15803D', fontWeight: 700, fontSize: '14px', margin: 0 }}>{file.name}</p>
        <p style={{ color: '#86EFAC', fontSize: '12px', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB · Haz clic para cambiar</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: dragOver ? '#DBEAFE' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={dragOver ? '#3B82F6' : '#94A3B8'} strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      <div>
        <p style={{ color: dragOver ? '#2563EB' : '#374151', fontWeight: 600, fontSize: '14px', margin: '0 0 3px' }}>
          {dragOver ? 'Suelta el archivo aquí' : 'Arrastra tu archivo .p12 o haz clic'}
        </p>
        <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>Formatos: .p12, .pfx</p>
      </div>
    </div>
  );
}

interface CertListProps {
  readonly certificates: Certificate[];
  readonly loading: boolean;
}

function CertList({ certificates, loading }: CertListProps) {
  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }
  if (certificates.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: '#F1F5F9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <p style={{ color: '#475569', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Sin certificados</p>
        <p style={{ color: '#94A3B8', fontSize: '12.5px', margin: 0 }}>Sube tu certificado BCE .p12 para firmar facturas</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {certificates.map(c => {
        const days      = daysUntil(c.validUntil);
        const expStyle  = getExpiryStyle(days);
        const showBadge = isExpiringSoon(days);
        return (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', borderBottom: '1px solid #F8FAFC' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.holderName ?? 'Sin nombre'}</p>
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>Válido {formatDate(c.validFrom)} — {formatDate(c.validUntil)}</p>
            </div>
            {showBadge && (
              <div style={{ background: expStyle.bg, border: `1px solid ${expStyle.border}`, borderRadius: '10px', padding: '5px 12px', textAlign: 'center', flexShrink: 0 }}>
                <p style={{ color: expStyle.color, fontSize: '11px', fontWeight: 700, margin: 0 }}>
                  {days > 0 ? `${days}d restantes` : 'Expirado'}
                </p>
              </div>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: c.isActive ? '#F0FDF4' : '#F8FAFC', color: c.isActive ? '#15803D' : '#94A3B8', border: `1px solid ${c.isActive ? '#BBF7D0' : '#E2E8F0'}`, flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.isActive ? '#22C55E' : '#CBD5E1', flexShrink: 0 }} />
              {c.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CertificatesPage() {
  const baseId  = useId();
  const passId  = `${baseId}-pass`;
  const fileRef = useRef<HTMLInputElement>(null);

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [file,      setFile]      = useState<File | null>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const loadCertificates = useCallback(() => {
    api.get('/certificates')
      .then(res => { const d = res.data.data; setCertificates(Array.isArray(d) ? d : []); })
      .catch((err: unknown) => console.error('[Certificates]', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCertificates(); }, [loadCertificates]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f !== undefined && (f.name.endsWith('.p12') || f.name.endsWith('.pfx'))) {
      setFile(f); setError('');
    } else {
      setError('Solo se aceptan archivos .p12 o .pfx');
    }
  }, []);

  const handleDragOver   = useCallback((e: React.DragEvent<HTMLButtonElement>) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave  = useCallback(() => setDragOver(false), []);
  const handleTogglePass = useCallback(() => setShowPass(p => !p), []);
  const handleZoneClick  = useCallback(() => fileRef.current?.click(), []);

  const handleUpload = useCallback(async () => {
    if (file === null || passphrase === '') {
      setError('Selecciona el archivo .p12 e ingresa la contraseña');
      return;
    }
    setUploading(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('passphrase', passphrase);
      await api.post('/certificates/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('✓ Certificado subido y validado correctamente');
      setFile(null); setPassphrase('');
      if (fileRef.current !== null) fileRef.current.value = '';
      loadCertificates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al subir certificado');
    } finally { setUploading(false); }
  }, [file, passphrase, loadCertificates]);

  const dropZoneStyle = getDropZoneStyle(dragOver, file !== null);
  const canUpload     = !uploading && file !== null && passphrase !== '';

  return (
    <div style={{ padding: '32px 36px', maxWidth: '820px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Certificados</h1>
        <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>Gestiona tu certificado digital BCE para firma electrónica XAdES-BES</p>
      </div>

      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '28px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 3px' }}>Subir certificado .p12</h2>
            <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: 0 }}>Archivo emitido por el Banco Central del Ecuador (BCE)</p>
          </div>
        </div>

        {/* S6848: handlers drag en <button> — elemento interactivo nativo */}
        <button
          type="button"
          onClick={handleZoneClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          aria-label="Zona para subir certificado .p12 — arrastra o haz clic"
          style={{ ...dropZoneStyle, borderRadius: '16px', padding: '28px 20px', textAlign: 'center', transition: 'all 0.2s', marginBottom: '16px', width: '100%', cursor: 'pointer', fontFamily: 'inherit', display: 'block' }}
        >
          <input ref={fileRef} type="file" accept=".p12,.pfx" onChange={handleFileChange} style={{ display: 'none' }} />
          <DropZoneContent file={file} dragOver={dragOver} />
        </button>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor={passId} style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Contraseña del certificado
          </label>
          <div style={{ position: 'relative' }}>
            <input id={passId} type={showPass ? 'text' : 'password'} value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder="Contraseña del archivo .p12"
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '11px 44px 11px 14px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none', fontFamily: 'inherit' }}
            />
            <button type="button" onClick={handleTogglePass} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px', display: 'flex', alignItems: 'center' }}>
              {showPass
                ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              }
            </button>
          </div>
        </div>

        {error !== '' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </div>
        )}
        {success !== '' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '13px', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {success}
          </div>
        )}

        <button type="button" onClick={handleUpload} disabled={!canUpload}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: canUpload ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#E2E8F0', color: canUpload ? '#fff' : '#94A3B8', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: canUpload ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: canUpload ? '0 4px 14px rgba(29,78,216,0.3)' : 'none' }}>
          {uploading
            ? <><div style={{ width: '16px', height: '16px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Subiendo y validando...</>
            : <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Subir y validar certificado</>
          }
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Certificados registrados</h2>
          <span style={{ fontSize: '12px', color: '#94A3B8', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '3px 12px' }}>
            {certificates.length} certificado{certificates.length === 1 ? '' : 's'}
          </span>
        </div>
        <CertList certificates={certificates} loading={loading} />
      </div>
    </div>
  );
}