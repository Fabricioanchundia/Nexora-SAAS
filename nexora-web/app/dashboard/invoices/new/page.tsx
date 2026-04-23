'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer { id: string; fullName: string; identification: string; }
interface Product { id: string; name: string; code: string; unitPrice: number; ivaRate: string; }
interface Item {
  productId: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: string;
  discount: number;
}

const ivaLabel: Record<string, string> = {
  '0': '0%', '2': '12%', '4': '15%', '5': '5%', '8': '8%', '6': 'No objeto', '7': 'Exento',
};

const ivaValue: Record<string, number> = {
  '0': 0, '2': 0.12, '4': 0.15, '5': 0.05, '8': 0.08, '6': 0, '7': 0,
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/customers').then((res) => {
      const data = res.data.data;
      setCustomers(Array.isArray(data) ? data : data?.customers || []);
    });
    api.get('/products').then((res) => {
      const data = res.data.data;
      setProducts(Array.isArray(data) ? data : data?.products || []);
    });
  }, []);

  const addItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setItems([...items, {
      productId: p.id,
      productCode: p.code,
      description: p.name,
      quantity: 1,
      unitPrice: Number(p.unitPrice),
      ivaRate: p.ivaRate,
      discount: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    const updated = [...items];
    if (field === 'productId') {
      const p = products.find((pr) => pr.id === value);
      if (p) {
        updated[index] = {
          ...updated[index],
          productId: p.id,
          productCode: p.code,
          description: p.name,
          unitPrice: Number(p.unitPrice),
          ivaRate: p.ivaRate,
        };
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calcSubtotal = (item: Item) => Number(item.quantity) * Number(item.unitPrice) - Number(item.discount);
  const calcIva = (item: Item) => calcSubtotal(item) * (ivaValue[item.ivaRate] || 0);
  const totalSubtotal = items.reduce((acc, item) => acc + calcSubtotal(item), 0);
  const totalIva = items.reduce((acc, item) => acc + calcIva(item), 0);
  const total = totalSubtotal + totalIva;

  const handleSubmit = async () => {
    if (!customerId) { setError('Selecciona un cliente'); return; }
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/invoices', {
        customerId,
        issueDate,
        items: items.map((item) => ({
          productId: item.productId,
          productCode: item.productCode,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          ivaRate: item.ivaRate,
          discount: Number(item.discount),
        })),
        paymentMethods: [{ code: '01', total: parseFloat(total.toFixed(2)) }],
      });
      router.push('/dashboard/invoices?refresh=' + Date.now());
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear factura');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nueva factura</h2>
        <p className="text-slate-500 text-sm mt-1">Completa los datos para emitir una factura electrónica</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <h3 className="font-semibold text-slate-900 mb-4">Datos del comprobante</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar cliente</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName} — {c.identification}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de emisión</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Productos / Servicios</h3>
          <button
            onClick={addItem}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Agregar item
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No hay items agregados</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
                <div className="col-span-4">
                  <label className="block text-xs text-slate-500 mb-1">Producto</label>
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(index, 'productId', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Subtotal</label>
                  <p className="text-sm font-medium text-slate-700 py-1.5">${calcSubtotal(item).toFixed(2)}</p>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">IVA</label>
                  <p className="text-xs text-slate-500 py-1.5">{ivaLabel[item.ivaRate]}</p>
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium py-1.5"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>${totalSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>IVA</span>
                <span>${totalIva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => router.push('/dashboard/invoices')}
          className="text-slate-600 hover:text-slate-800 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Emitiendo...' : 'Emitir factura'}
        </button>
      </div>
    </div>
  );
}