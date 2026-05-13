'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import api from '@/lib/api';

interface Product {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly unitPrice: number;
  readonly ivaRate: string;
}

const IVA_LABELS: Readonly<Record<string, string>> = {
  '0':'0%', '2':'12%', '4':'15%', '5':'5%', '8':'8%', '6':'No objeto', '7':'Exento',
};

interface ProductFormData {
  code: string; name: string; description: string;
  unitPrice: string; ivaRate: string;
}

const EMPTY_FORM: ProductFormData = { code:'', name:'', description:'', unitPrice:'', ivaRate:'4' };

// Estilos inline garantizados
const INP: React.CSSProperties = { width:'100%', boxSizing:'border-box', border:'1.5px solid #E2E8F0', borderRadius:'10px', padding:'10px 14px', fontSize:'14px', color:'#0F172A', background:'#fff', outline:'none', fontFamily:'inherit' };
const SEL: React.CSSProperties = { ...INP, cursor:'pointer' };
const LBL: React.CSSProperties = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' };
const FD:  React.CSSProperties = { marginBottom:'14px' };

export default function ProductsPage() {
  const baseId = useId();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState<ProductFormData>(EMPTY_FORM);
  const [error, setError]       = useState('');

  const ids = {
    code:`${baseId}-code`, name:`${baseId}-name`,
    desc:`${baseId}-desc`, price:`${baseId}-price`, iva:`${baseId}-iva`,
  };

  const loadProducts = useCallback(() => {
    api.get('/products')
      .then(res => {
        const d = res.data.data;
        setProducts(Array.isArray(d) ? d : d?.products ?? []);
      })
      .catch((err: unknown) => console.error('[Products]', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleField = useCallback((field: keyof ProductFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
    }, []);

  const handleSave = useCallback(async () => {
    if (!form.code || !form.name || !form.unitPrice) { setError('Código, nombre y precio son requeridos'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/products', {
        code: form.code, name: form.name, description: form.description,
        unitPrice: Number.parseFloat(form.unitPrice), ivaRate: form.ivaRate,
      });
      setForm(EMPTY_FORM); setShowForm(false); loadProducts();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m  = ax.response?.data?.message;
      setError(Array.isArray(m) ? m[0] : m ?? 'Error al guardar producto');
    } finally { setSaving(false); }
  }, [form, loadProducts]);

  let tableBody: React.ReactNode;
  if (loading) {
    tableBody = <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#94A3B8', fontSize:'13px' }}>Cargando productos...</td></tr>;
  } else if (products.length === 0) {
    tableBody = (
      <tr><td colSpan={5} style={{ padding:'48px 20px', textAlign:'center' }}>
        <p style={{ color:'#475569', fontWeight:600, fontSize:'14px', margin:'0 0 4px' }}>Sin productos</p>
        <p style={{ color:'#94A3B8', fontSize:'12.5px', margin:0 }}>Agrega productos o servicios para incluirlos en tus facturas</p>
      </td></tr>
    );
  } else {
    tableBody = products.map(p => {
      const ivaNum = p.ivaRate === '2' ? 0.12 : p.ivaRate === '4' ? 0.15 : p.ivaRate === '5' ? 0.05 : 0;
      const total  = Number(p.unitPrice) * (1 + ivaNum);
      const ivaColored = ['2','4','5'].includes(p.ivaRate);
      return (
        <tr key={p.id} style={{ borderBottom:'1px solid #F8FAFC' }}
          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background='#F8FAFC'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background='transparent'; }}>
          <td style={{ padding:'12px 16px' }}>
            <span style={{ fontFamily:'monospace', fontSize:'12px', fontWeight:600, color:'#475569', background:'#F1F5F9', padding:'3px 8px', borderRadius:'6px' }}>{p.code}</span>
          </td>
          <td style={{ padding:'12px 16px' }}>
            <p style={{ fontWeight:600, color:'#0F172A', margin:'0 0 2px', fontSize:'14px' }}>{p.name}</p>
            {p.description && <p style={{ color:'#94A3B8', fontSize:'12px', margin:0 }}>{p.description}</p>}
          </td>
          <td style={{ padding:'12px 16px', fontWeight:700, color:'#0F172A', fontSize:'14px' }}>${Number(p.unitPrice).toFixed(2)}</td>
          <td style={{ padding:'12px 16px' }}>
            <span style={{ display:'inline-flex', alignItems:'center', background: ivaColored ? '#EFF6FF' : '#F8FAFC', color: ivaColored ? '#1D4ED8' : '#64748B', border:`1px solid ${ivaColored ? '#BFDBFE' : '#E2E8F0'}`, borderRadius:'20px', fontSize:'12px', fontWeight:600, padding:'3px 10px' }}>
              {IVA_LABELS[p.ivaRate] ?? p.ivaRate}
            </span>
          </td>
          <td style={{ padding:'12px 16px', fontWeight:700, color:'#0F172A', fontSize:'14px' }}>${total.toFixed(2)}</td>
        </tr>
      );
    });
  }

  return (
    <div style={{ padding:'32px 36px', background:'#F1F5F9', minHeight:'100vh', fontFamily:'system-ui,-apple-system,sans-serif' }}>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:800, color:'#0F172A', margin:'0 0 4px', letterSpacing:'-0.01em' }}>Productos</h1>
          <p style={{ fontSize:'13px', color:'#64748B', margin:0 }}>Gestiona tu catálogo de productos y servicios</p>
        </div>
        <button type="button" onClick={() => { setShowForm(p => !p); setForm(EMPTY_FORM); setError(''); }}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 18px', background: showForm ? '#F1F5F9' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: showForm ? '#374151' : '#fff', border: showForm ? '1px solid #E2E8F0' : 'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: showForm ? 'none' : '0 4px 14px rgba(29,78,216,0.3)' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'}/>
          </svg>
          {showForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid #E2E8F0', padding:'24px', marginBottom:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize:'16px', fontWeight:700, color:'#0F172A', margin:'0 0 20px' }}>Nuevo producto</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
            <div style={FD}>
              <label htmlFor={ids.code} style={LBL}>Código</label>
              <input id={ids.code} type="text" value={form.code} onChange={handleField('code')} placeholder="Ej: PROD-001" style={INP}/>
            </div>
            <div style={FD}>
              <label htmlFor={ids.name} style={LBL}>Nombre</label>
              <input id={ids.name} type="text" value={form.name} onChange={handleField('name')} placeholder="Ej: Servicio de consultoría" style={INP}/>
            </div>
            <div style={{ ...FD, gridColumn:'1 / -1' }}>
              <label htmlFor={ids.desc} style={LBL}>Descripción <span style={{ color:'#94A3B8', fontWeight:400 }}>(opcional)</span></label>
              <input id={ids.desc} type="text" value={form.description} onChange={handleField('description')} placeholder="Descripción breve del producto" style={INP}/>
            </div>
            <div style={FD}>
              <label htmlFor={ids.price} style={LBL}>Precio unitario (sin IVA)</label>
              <input id={ids.price} type="number" step="0.01" min="0" value={form.unitPrice} onChange={handleField('unitPrice')} placeholder="0.00" style={INP}/>
            </div>
            <div style={FD}>
              <label htmlFor={ids.iva} style={LBL}>IVA</label>
              <select id={ids.iva} value={form.ivaRate} onChange={handleField('ivaRate')} style={SEL}>
                <option value="4">15% (vigente 2025)</option>
                <option value="2">12%</option>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="6">No objeto de IVA</option>
                <option value="7">Exento de IVA</option>
              </select>
            </div>
          </div>
          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'13px', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px' }}>{error}</div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', paddingTop:'8px', borderTop:'1px solid #F1F5F9' }}>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              style={{ padding:'10px 18px', background:'#F8FAFC', color:'#374151', border:'1px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ padding:'10px 22px', background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: saving ? 0.7 : 1, boxShadow:'0 4px 14px rgba(29,78,216,0.3)' }}>
              {saving ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid #E2E8F0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                {['Código','Nombre','Precio','IVA','Precio + IVA'].map(h => (
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{tableBody}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}