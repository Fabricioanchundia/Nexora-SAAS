'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer { readonly id: string; readonly fullName: string; readonly identification: string; }
interface Product  { readonly id: string; readonly name: string; readonly code: string; readonly unitPrice: number; readonly ivaRate: string; }

interface Item {
  itemKey: string;
  productId: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: string;
  discount: number;
}

const IVA_LABELS: Readonly<Record<string, string>> = {
  '0': '0%', '2': '12%', '4': '15%', '5': '5%', '8': '8%', '6': 'No objeto', '7': 'Exento',
};
const IVA_VALUES: Readonly<Record<string, number>> = {
  '0': 0, '2': 0.12, '4': 0.15, '5': 0.05, '8': 0.08, '6': 0, '7': 0,
};

function calcSubtotal(item: Item) { return item.quantity * item.unitPrice - item.discount; }
function calcIva(item: Item)      { return calcSubtotal(item) * (IVA_VALUES[item.ivaRate] ?? 0); }

let keyCounter = 0;
function nextKey() { keyCounter += 1; return `item-${keyCounter}`; }

// ── Estilos inline garantizados — Tailwind no siempre compila en producción ──
const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1.5px solid #E2E8F0',
  borderRadius: '10px',
  padding: '9px 12px',
  fontSize: '14px',
  color: '#0F172A',           // ← SIEMPRE visible
  background: '#F8FAFC',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
  appearance: 'auto',
};

const INPUT_SM: React.CSSProperties = {
  ...INPUT_STYLE,
  padding: '7px 8px',
  fontSize: '13px',
};

const SELECT_SM: React.CSSProperties = {
  ...INPUT_SM,
  cursor: 'pointer',
  appearance: 'auto',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '5px',
};

const LABEL_SM: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748B',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export default function NewInvoicePage() {
  const router    = useRouter();
  const baseId    = useId();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate]   = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [items, setItems]   = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/customers').then(res => {
      const d = res.data.data;
      setCustomers(Array.isArray(d) ? d : d?.customers ?? []);
    });
    api.get('/products').then(res => {
      const d = res.data.data;
      setProducts(Array.isArray(d) ? d : d?.products ?? []);
    });
  }, []);

  const getProductUpdate = useCallback((value: string | number) => {
    const p = products.find(pr => pr.id === value);
    if (!p) return null;
    return {
      productId:   p.id,
      productCode: p.code,
      description: p.name,
      unitPrice:   Number.parseFloat(String(p.unitPrice)),
      ivaRate:     p.ivaRate,
    };
  }, [products]);

  const addItem = useCallback(() => {
    if (products.length === 0) return;
    const p = products[0];
    setItems(prev => [...prev, {
      itemKey:     nextKey(),
      productId:   p.id,
      productCode: p.code,
      description: p.name,
      quantity:    1,
      unitPrice:   Number.parseFloat(String(p.unitPrice)),
      ivaRate:     p.ivaRate,
      discount:    0,
    }]);
  }, [products]);

  const updateItem = useCallback((key: string, field: keyof Item, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.itemKey !== key) return item;
      if (field === 'productId') {
        const productUpdate = getProductUpdate(value);
        if (!productUpdate) return item;
        return { ...item, ...productUpdate };
      }
      return { ...item, [field]: value };
    }));
  }, [getProductUpdate]);

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.filter(i => i.itemKey !== key));
  }, []);

  const goBack = useCallback(() => router.push('/dashboard/invoices'), [router]);

  const customerSelectId = `${baseId}-customer`;
  const issueDateId      = `${baseId}-date`;

  const totalSubtotal = items.reduce((acc, i) => acc + calcSubtotal(i), 0);
  const totalIva      = items.reduce((acc, i) => acc + calcIva(i), 0);
  const total         = totalSubtotal + totalIva;

  const handleSubmit = useCallback(async () => {
    if (!customerId) { setError('Selecciona un cliente'); return; }
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/invoices', {
        customerId,
        issueDate,
        items: items.map(item => ({
          productId:   item.productId,
          productCode: item.productCode,
          description: item.description,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          ivaRate:     item.ivaRate,
          discount:    item.discount,
        })),
        paymentMethods: [{ code: '01', total: Number.parseFloat(total.toFixed(2)) }],
      });
      router.push('/dashboard/invoices');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al crear factura');
    } finally {
      setSaving(false);
    }
  }, [customerId, issueDate, items, total, router]);

  let itemsBody: React.ReactNode;
  if (items.length === 0) {
    itemsBody = (
      <div style={{ padding:'32px 20px', textAlign:'center' }}>
        <div style={{ width:'44px', height:'44px', background:'#F1F5F9', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <p style={{ color:'#64748B', fontSize:'13px', margin:0 }}>No hay items. Agrega un producto.</p>
      </div>
    );
  } else {
    itemsBody = (
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {items.map((item) => {
          const productSelectId = `${baseId}-prod-${item.itemKey}`;
          const qtyId           = `${baseId}-qty-${item.itemKey}`;
          const priceId         = `${baseId}-price-${item.itemKey}`;

          const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => updateItem(item.itemKey, 'productId', e.target.value);
          const handleQtyChange     = (e: React.ChangeEvent<HTMLInputElement>)  => updateItem(item.itemKey, 'quantity', Number.parseFloat(e.target.value) || 0);
          const handlePriceChange   = (e: React.ChangeEvent<HTMLInputElement>)  => updateItem(item.itemKey, 'unitPrice', Number.parseFloat(e.target.value) || 0);
          const handleRemove        = () => removeItem(item.itemKey);

          return (
            <div key={item.itemKey} style={{ display:'grid', gridTemplateColumns:'3fr 1fr 1fr 1fr auto', gap:'10px', alignItems:'end', background:'#F8FAFC', borderRadius:'12px', padding:'12px 14px', border:'1px solid #E2E8F0' }}>
              <div>
                <label htmlFor={productSelectId} style={LABEL_SM}>Producto</label>
                <select id={productSelectId} value={item.productId} onChange={handleProductChange} style={SELECT_SM}>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={qtyId} style={LABEL_SM}>Cantidad</label>
                <input id={qtyId} type="number" min="1" step="0.01" value={item.quantity} onChange={handleQtyChange} style={INPUT_SM} />
              </div>
              <div>
                <label htmlFor={priceId} style={LABEL_SM}>Precio</label>
                <input id={priceId} type="number" step="0.01" value={item.unitPrice} onChange={handlePriceChange} style={INPUT_SM} />
              </div>
              <div>
                <p style={{ ...LABEL_SM, marginBottom:'4px' }}>Subtotal</p>
                <p style={{ fontSize:'14px', fontWeight:700, color:'#0F172A', margin:0, padding:'7px 0' }}>${calcSubtotal(item).toFixed(2)}</p>
                <p style={{ fontSize:'11px', color:'#64748B', margin:'2px 0 0' }}>IVA {IVA_LABELS[item.ivaRate]}</p>
              </div>
              <div style={{ paddingBottom:'2px' }}>
                <button type="button" onClick={handleRemove} aria-label="Eliminar item"
                  style={{ background:'#FEF2F2', border:'none', borderRadius:'8px', padding:'8px', cursor:'pointer', color:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ padding:'32px 36px', maxWidth:'900px', margin:'0 auto', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'24px', fontWeight:800, color:'#0F172A', margin:'0 0 4px' }}>Nueva factura</h1>
        <p style={{ color:'#64748B', fontSize:'13px', margin:0 }}>Completa los datos para emitir una factura electrónica</p>
      </div>

      {/* Datos del comprobante */}
      <div style={{ background:'#fff', borderRadius:'16px', border:'1px solid #E2E8F0', padding:'24px', marginBottom:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize:'15px', fontWeight:700, color:'#0F172A', margin:'0 0 18px' }}>Datos del comprobante</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div>
            <label htmlFor={customerSelectId} style={LABEL_STYLE}>Cliente</label>
            <select
              id={customerSelectId}
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              style={SELECT_STYLE}
            >
              <option value="">Seleccionar cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} — {c.identification}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={issueDateId} style={LABEL_STYLE}>Fecha de emisión</label>
            <input
              id={issueDateId}
              type="date"
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ background:'#fff', borderRadius:'16px', border:'1px solid #E2E8F0', padding:'24px', marginBottom:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <h2 style={{ fontSize:'15px', fontWeight:700, color:'#0F172A', margin:0 }}>Productos / Servicios</h2>
          <button type="button" onClick={addItem}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 3px 10px rgba(29,78,216,0.3)' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Agregar item
          </button>
        </div>
        {itemsBody}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div style={{ background:'#fff', borderRadius:'16px', border:'1px solid #E2E8F0', padding:'20px 24px', marginBottom:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ width:'260px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F1F5F9' }}>
                <span style={{ fontSize:'13px', color:'#64748B' }}>Subtotal</span>
                <span style={{ fontSize:'13px', color:'#0F172A', fontWeight:600 }}>${totalSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F1F5F9' }}>
                <span style={{ fontSize:'13px', color:'#64748B' }}>IVA</span>
                <span style={{ fontSize:'13px', color:'#0F172A', fontWeight:600 }}>${totalIva.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0' }}>
                <span style={{ fontSize:'15px', color:'#0F172A', fontWeight:800 }}>Total</span>
                <span style={{ fontSize:'18px', color:'#1D4ED8', fontWeight:800 }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'13px', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', display:'flex', gap:'8px', alignItems:'center' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" style={{ flexShrink:0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
        <button type="button" onClick={goBack}
          style={{ padding:'11px 20px', fontSize:'14px', fontWeight:600, color:'#374151', background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit' }}>
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          style={{ padding:'11px 28px', background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: saving ? 0.7 : 1, boxShadow:'0 4px 14px rgba(29,78,216,0.35)' }}>
          {saving ? 'Emitiendo...' : 'Emitir factura'}
        </button>
      </div>
    </div>
  );
}
