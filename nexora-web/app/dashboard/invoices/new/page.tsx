'use client';

import { useEffect, useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer { readonly id: string; readonly fullName: string; readonly identification: string; }
interface Product  { readonly id: string; readonly name: string; readonly code: string; readonly unitPrice: number; readonly ivaRate: string; }

interface Item {
  itemKey: string; // stable unique key — not array index
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

// S6853: label component to enforce htmlFor
function FieldLabel({ htmlFor, children }: Readonly<{ htmlFor: string; children: React.ReactNode }>) {
  return <label htmlFor={htmlFor} className="block text-xs text-slate-500 mb-1">{children}</label>;
}

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

  const addItem = useCallback(() => {
    if (products.length === 0) return;
    const p = products[0];
    setItems(prev => [...prev, {
      itemKey:     nextKey(),
      productId:   p.id,
      productCode: p.code,
      description: p.name,
      quantity:    1,
      // S7773: Number.parseFloat instead of parseFloat
      unitPrice:   Number.parseFloat(String(p.unitPrice)),
      ivaRate:     p.ivaRate,
      discount:    0,
    }]);
  }, [products]);

  const updateItem = useCallback((key: string, field: keyof Item, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.itemKey !== key) return item;
      if (field === 'productId') {
        const p = products.find(pr => pr.id === value);
        if (!p) return item;
        return {
          ...item,
          productId:   p.id,
          productCode: p.code,
          description: p.name,
          // S7773: Number.parseFloat
          unitPrice:   Number.parseFloat(String(p.unitPrice)),
          ivaRate:     p.ivaRate,
        };
      }
      return { ...item, [field]: value };
    }));
  }, [products]);

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.filter(i => i.itemKey !== key));
  }, []);

  const goBack = useCallback(() => router.push('/dashboard/invoices'), [router]);

  // S6853: stable IDs for form controls
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

  // S3358: item rows body resolved without nested ternary
  let itemsBody: React.ReactNode;
  if (items.length === 0) {
    itemsBody = <p className="text-slate-400 text-sm text-center py-6">No hay items. Agrega un producto.</p>;
  } else {
    itemsBody = (
      <div className="space-y-3">
        {items.map((item) => {
          // S5479: use stable itemKey — not array index
          const productSelectId = `${baseId}-prod-${item.itemKey}`;
          const qtyId           = `${baseId}-qty-${item.itemKey}`;
          const priceId         = `${baseId}-price-${item.itemKey}`;

          const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => updateItem(item.itemKey, 'productId', e.target.value);
          const handleQtyChange     = (e: React.ChangeEvent<HTMLInputElement>)  => updateItem(item.itemKey, 'quantity', Number.parseFloat(e.target.value) || 0);
          const handlePriceChange   = (e: React.ChangeEvent<HTMLInputElement>)  => updateItem(item.itemKey, 'unitPrice', Number.parseFloat(e.target.value) || 0);
          const handleRemove        = () => removeItem(item.itemKey);

          return (
            <div key={item.itemKey} className="grid grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
              <div className="col-span-4">
                <FieldLabel htmlFor={productSelectId}>Producto</FieldLabel>
                <select id={productSelectId} value={item.productId} onChange={handleProductChange} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <FieldLabel htmlFor={qtyId}>Cantidad</FieldLabel>
                <input id={qtyId} type="number" min="1" step="0.01" value={item.quantity} onChange={handleQtyChange} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <FieldLabel htmlFor={priceId}>Precio</FieldLabel>
                <input id={priceId} type="number" step="0.01" value={item.unitPrice} onChange={handlePriceChange} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">Subtotal</p>
                <p className="text-sm font-semibold text-slate-800 py-1.5">${calcSubtotal(item).toFixed(2)}</p>
              </div>
              <div className="col-span-1">
                <p className="text-xs text-slate-500 mb-1">IVA</p>
                <p className="text-xs text-slate-500 py-1.5">{IVA_LABELS[item.ivaRate]}</p>
              </div>
              <div className="col-span-1 flex items-end pb-1.5">
                <button type="button" onClick={handleRemove} aria-label="Eliminar item" className="text-red-400 hover:text-red-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Nueva factura</h1>
        <p className="text-slate-500 text-sm mt-1">Completa los datos para emitir una factura electrónica</p>
      </div>

      {/* Datos del comprobante */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Datos del comprobante</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {/* S6853: label con htmlFor */}
            <label htmlFor={customerSelectId} className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <select id={customerSelectId} value={customerId} onChange={e => setCustomerId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} — {c.identification}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={issueDateId} className="block text-sm font-medium text-slate-700 mb-1">Fecha de emisión</label>
            <input id={issueDateId} type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Productos / Servicios</h2>
          <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar item
          </button>
        </div>
        {itemsBody}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span>${totalSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>IVA</span><span>${totalIva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={goBack} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
          {saving ? 'Emitiendo...' : 'Emitir factura'}
        </button>
      </div>
    </div>
  );
}