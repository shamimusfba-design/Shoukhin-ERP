import React, { useState } from 'react';
import { useErp } from '../context/ErpContext';
import { formatMoney } from '../services/erpEngine';

export const InventoryPage: React.FC = () => {
  const {
    dashboard,
    canWrite,
    setPurchaseModalOpen,
    setDamageModalOpen,
    setStockCountSku,
  } = useErp();

  const [inventoryMode, setInventoryMode] = useState<'all' | 'low' | 'dead'>('all');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
          {(['all', 'low', 'dead'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setInventoryMode(m)}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                inventoryMode === m
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {m === 'all'
                ? 'All Items'
                : m === 'low'
                ? `Low Stock (${dashboard.inventory.low})`
                : `Dead Stock (${dashboard.inventory.dead})`}
            </button>
          ))}
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPurchaseModalOpen(true)}
              className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
            >
              + Stock Purchase
            </button>
            <button
              type="button"
              onClick={() => setDamageModalOpen(true)}
              className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
            >
              Record Damage
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          Count available units excluding reserved parcels. Physical counts replace the baseline as of the count date.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 font-medium">Product / Combo</th>
                <th className="py-3 px-4 font-medium text-right">Available</th>
                <th className="py-3 px-4 font-medium text-right">Stock Value</th>
                <th className="py-3 px-4 font-medium">Last Sale</th>
                <th className="py-3 px-4 font-medium">Health</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dashboard.inventory.rows
                .filter((r) => (inventoryMode === 'low' ? r.low : inventoryMode === 'dead' ? r.dead : true))
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{p.qty}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {p.components ? 'Shared components' : formatMoney(p.value)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{p.lastSale || '—'}</td>
                    <td className="py-3 px-4">
                      {p.low ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">Low stock</span>
                      ) : p.dead ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Dead stock</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Healthy</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canWrite && !p.components && (
                        <button
                          type="button"
                          onClick={() => setStockCountSku(p.id)}
                          className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                        >
                          Physical Count
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
