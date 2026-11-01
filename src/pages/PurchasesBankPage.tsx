import React from 'react';
import { useErp } from '../context/ErpContext';
import { formatMoney } from '../services/erpEngine';

export const PurchasesBankPage: React.FC = () => {
  const {
    dashboard,
    canWrite,
    setPurchaseModalOpen,
    setCashModalOpen,
    setPayBillModal,
  } = useErp();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold font-display">Cash & Bank Ledger</h2>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
            Bank: {formatMoney(dashboard.cash.bank)} · Courier Requestable: {formatMoney(dashboard.cash.courier)} · Available: {formatMoney(dashboard.cash.available)}
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPurchaseModalOpen(true)}
              className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
            >
              + Stock Purchase
            </button>
            <button
              type="button"
              onClick={() => setCashModalOpen(true)}
              className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
            >
              + Bank Ledger Entry
            </button>
          </div>
        )}
      </div>

      {dashboard.cash.upcoming.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold">Unpaid / Outstanding Bills</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Bill / Supplier</th>
                  <th className="py-3 px-4 font-medium text-right">Unpaid Amount</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboard.cash.upcoming.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-mono">{u.date}</td>
                    <td className="py-3 px-4 font-medium">{u.category || u.supplier}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                      {formatMoney(u.outstanding)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() =>
                            setPayBillModal({ id: u.id, kind: u.kind, outstanding: u.outstanding })
                          }
                          className="min-h-[34px] px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold">Bank Movements</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  <th className="py-3 px-4 font-medium">Ref / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboard.cash.ledger.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 px-4 font-mono">{l.date}</td>
                    <td className="py-3 px-4">{l.kind}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-medium ${
                        l.signed < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatMoney(l.signed)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {l.reference} {l.note ? `· ${l.note}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold">Stock Purchases</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Supplier</th>
                  <th className="py-3 px-4 font-medium text-right">Total</th>
                  <th className="py-3 px-4 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboard.cash.purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono">{p.date}</td>
                    <td className="py-3 px-4 font-medium">{p.supplier || 'Supplier'}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMoney(p.total)}</td>
                    <td className="py-3 px-4 font-mono">{p.receivedDate || 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
