import React from 'react';
import { Plus } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { formatMoney } from '../services/erpEngine';

export const ProductsCombosPage: React.FC = () => {
  const { catalog, canWrite, erpState, setProductModal, setComboModal } = useErp();

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setProductModal({ active: true, reorder: 5, leadDays: 7 })}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
          <button
            type="button"
            onClick={() => setComboModal({ active: true, components: [{ sku: '', qty: 1 }] })}
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Combo Bundle</span>
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Products & Combos ({catalog.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 font-medium">SKU / ID</th>
                <th className="py-3 px-4 font-medium">Product / Combo Name</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium text-right">Purchase Cost</th>
                <th className="py-3 px-4 font-medium text-right">Selling Price</th>
                <th className="py-3 px-4 font-medium text-right">Available</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {catalog.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-500">{p.id}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                  <td className="py-3 px-4">{p.category}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(p.cost)}</td>
                  <td className="py-3 px-4 text-right font-mono font-medium">{formatMoney(p.price)}</td>
                  <td className="py-3 px-4 text-right font-mono">{p.stock}</td>
                  <td className="py-3 px-4">{p.active ? 'Active' : 'Inactive'}</td>
                  <td className="py-3 px-4 text-right">
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => {
                          if (p.components) {
                            const found = erpState.Combos.find((c) => c.id === p.id);
                            if (found) setComboModal(found);
                          } else {
                            const found = erpState.Products.find((x) => x.id === p.id);
                            if (found) setProductModal(found);
                          }
                        }}
                        className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
