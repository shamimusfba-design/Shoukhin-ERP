import React, { useState } from 'react';
import { useErp } from '../context/ErpContext';
import { computeMonthReview, formatMoney, monthLabel } from '../services/erpEngine';
import { saveErpRecord } from '../firebase';
import { MonthCloseRecord } from '../types/erp';

export const MonthClosingPage: React.FC = () => {
  const {
    erpState,
    today,
    dashboard,
    isAdminOrOwner,
    showToast,
  } = useErp();

  const [closingMonth, setClosingMonth] = useState(() => today.slice(0, 7));
  const [confirmMonthClose, setConfirmMonthClose] = useState(false);

  const review = computeMonthReview(erpState, closingMonth, today);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold font-display">Month Closing & Reconciliation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Close once all order outcomes, product costs, courier charges, and actual expenses are verified.
            </p>
          </div>
          <select
            value={closingMonth}
            onChange={(ev) => setClosingMonth(ev.target.value)}
            className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
          >
            {(dashboard.options.months.length > 0 ? dashboard.options.months : [today.slice(0, 7)]).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)} ({m})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="text-xs text-slate-500">Gross Profit</div>
            <div className="text-lg font-bold font-mono mt-1">{formatMoney(review.summary.gross)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="text-xs text-slate-500">Actual Expenses</div>
            <div className="text-lg font-bold font-mono mt-1">{formatMoney(review.expenses.actual)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="text-xs text-slate-500">Net After Actual Expenses</div>
            <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
              {formatMoney(review.summary.contribution - review.expenses.actual)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="text-xs text-slate-500">Unresolved Orders</div>
            <div className="text-lg font-bold font-mono text-red-600 mt-1">
              {review.incomplete.length}
            </div>
          </div>
        </div>

        {review.existing?.closed ? (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-emerald-600 font-medium">
              Month Closed on {new Date(review.existing.closedAt || '').toLocaleString()}
            </span>
            {isAdminOrOwner && (
              <button
                type="button"
                onClick={async () => {
                  await saveErpRecord<MonthCloseRecord>('Months', {
                    id: closingMonth,
                    closed: false,
                    reopenedAt: new Date().toISOString(),
                    reason: 'Reopened by Admin for adjustment',
                  });
                  showToast(`Reopened ${closingMonth}`);
                }}
                className="min-h-[38px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                Reopen Month
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmMonthClose}
                onChange={(ev) => setConfirmMonthClose(ev.target.checked)}
              />
              <span>
                All actual expenses and required order data for {closingMonth} are complete.
              </span>
            </label>
            <button
              type="button"
              disabled={!review.canClose || !confirmMonthClose || !isAdminOrOwner}
              onClick={async () => {
                await saveErpRecord<MonthCloseRecord>('Months', {
                  id: closingMonth,
                  closed: true,
                  closedAt: new Date().toISOString(),
                  confirmedExpenses: true,
                  gross: review.summary.gross,
                  contribution: review.summary.contribution,
                  expenses: review.expenses.actual,
                  net: review.summary.contribution - review.expenses.actual,
                });
                showToast(`Month ${closingMonth} finalized and closed!`);
              }}
              className="min-h-[42px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
            >
              Close Month ({closingMonth})
            </button>
            {review.openTooEarly && (
              <p className="text-xs text-amber-600">
                Note: You can finalize and lock this month on or after {review.end}.
              </p>
            )}
          </div>
        )}
      </div>

      {review.incomplete.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold">Unresolved Orders in {closingMonth}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Missing / Unresolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {review.incomplete.map((x) => (
                  <tr key={x.id}>
                    <td className="py-2.5 px-4 font-mono">{x.invoice || x.id}</td>
                    <td className="py-2.5 px-4 font-medium">{x.name}</td>
                    <td className="py-2.5 px-4">{x.status}</td>
                    <td className="py-2.5 px-4 text-amber-600">{x.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
