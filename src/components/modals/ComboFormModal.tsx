import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { ComboRecord, ProductRecord } from '../../types/erp';
import { formatMoney } from '../../services/erpEngine';

export const ComboFormModal: React.FC<{
  initial: Partial<ComboRecord>;
  products: ProductRecord[];
  onClose: () => void;
  onSave: (c: ComboRecord) => Promise<void>;
}> = ({ initial, products, onClose, onSave }) => {
  const [name, setName] = useState(initial.name || '');
  const [price, setPrice] = useState(String(initial.price ?? ''));
  const [active, setActive] = useState(initial.active !== false);
  const [components, setComponents] = useState<{ sku: string; qty: number }[]>(
    initial.components?.length ? initial.components : [{ sku: products[0]?.id || '', qty: 1 }]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          const validComponents = components.filter((c) => c.sku && c.qty > 0);
          if (!validComponents.length) return;
          await onSave({
            id: initial.id || 'COMBO-' + Date.now().toString().slice(-6),
            name: name.trim(),
            price: Number(price || 0),
            active,
            components: validComponents,
          });
        }}
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display">Create / Edit Combo Bundle</h3>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span>Combo Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </label>
          <label className="block space-y-1">
            <span>Combo Selling Price (BDT)</span>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Component Products for 1 Combo</span>
              <button
                type="button"
                onClick={() => setComponents(components.concat({ sku: products[0]?.id || '', qty: 1 }))}
                className="text-emerald-600 font-medium"
              >
                + Add Component
              </button>
            </div>
            {components.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={c.sku}
                  onChange={(ev) => {
                    const next = [...components];
                    next[idx] = { ...next[idx], sku: ev.target.value };
                    setComponents(next);
                  }}
                  className="flex-1 min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={c.qty}
                  onChange={(ev) => {
                    const next = [...components];
                    next[idx] = { ...next[idx], qty: Number(ev.target.value) };
                    setComponents(next);
                  }}
                  className="w-20 min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                  className="text-red-500 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Active combo</span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[40px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
          >
            Save Combo
          </button>
        </div>
      </form>
    </div>
  );
};
