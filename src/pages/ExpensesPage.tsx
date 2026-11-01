import React from 'react';
import { useErp } from '../context/ErpContext';
import { formatMoney } from '../services/erpEngine';

export const ExpensesPage: React.FC = () => {
  const {
    canWrite,
    setExpenseModal,
    setBudgetModal,
    today,
    erpState,
  } = useErp();

  return (
    <div className="space-y-6">
      {canWrite && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setExpenseModal({
                date: today,
                periodStart: today,
                periodEnd: today,
                category: 'Packing',
                coverageComplete: true,
              })
            }
            className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
          >
            + Actual Expense
          </button>
          <button
            type="button"
            onClick={() =>
              setBudgetModal({
                category: 'Salary',
                frequency: 'monthly',
                start: '2026-09-01',
                active: true,
              })
            }
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
          >
            + Daily / Monthly Projection
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold">Actual Expenses ({erpState.Expenses.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 font-medium">Coverage Period</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Marketplace</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                <th className="py-3 px-4 font-medium text-right">Paid</th>
                <th className="py-3 px-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {erpState.Expenses.slice()
                .reverse()
                .map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono">
                      {x.periodStart || x.date} → {x.periodEnd || x.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{x.category}</td>
                    <td className="py-3 px-4">{x.marketplace || 'Business-wide'}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {x.void ? 'Voided' : formatMoney(x.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {x.nonCash
                        ? 'Non-cash'
                        : formatMoney(
                            (x.paidBeforeOpening || 0) +
                              (x.payments || []).reduce((a, p) => a + p.amount, 0)
                          )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{x.note}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold">Recurring Projections / Budgets ({erpState.Budgets.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Frequency</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                <th className="py-3 px-4 font-medium">Start</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {erpState.Budgets.map((b) => (
                <tr key={b.id}>
                  <td className="py-3 px-4 font-medium">{b.category}</td>
                  <td className="py-3 px-4 capitalize">{b.frequency}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(b.amount)}</td>
                  <td className="py-3 px-4 font-mono">{b.start}</td>
                  <td className="py-3 px-4">{b.active ? 'Active' : 'Paused'}</td>
                  <td className="py-3 px-4 text-right">
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => setBudgetModal(b)}
                        className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
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
