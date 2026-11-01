import React, { useState } from 'react';
import { useErp } from '../context/ErpContext';
import { listDates } from '../services/erpEngine';
import { DualAdGraph, Graph21 } from '../components/Charts';

export const AdsPage: React.FC = () => {
  const { erpState, today, canWrite, setAdModalOpen } = useErp();

  const [adStart, setAdStart] = useState(() => today.slice(0, 7) + '-01');
  const [adEnd, setAdEnd] = useState(() => today);

  const adRows = listDates(adStart, adEnd).map((d) => {
    const x = erpState.AdDaily.find((a) => a.date === d);
    const orders = erpState.Orders.filter((o) => o.date === d).length;
    return {
      name: d,
      range: d,
      spend: x?.amount ?? null,
      messages: x?.messages ?? null,
      orders,
    };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <span>From</span>
            <input
              type="date"
              value={adStart}
              onChange={(ev) => setAdStart(ev.target.value)}
              className="block min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            />
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <span>To</span>
            <input
              type="date"
              value={adEnd}
              onChange={(ev) => setAdEnd(ev.target.value)}
              className="block min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            />
          </label>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setAdModalOpen(true)}
            className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
          >
            + Daily Ad Spend Entry
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold">Daily Ad Expense vs Orders Created</h3>
          <DualAdGraph rows={adRows} />
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold">Ad Conversations vs Orders Created</h3>
          <Graph21
            rows={adRows}
            series={[
              { key: 'messages', label: 'Ad conversations', color: 'green' },
              { key: 'orders', label: 'All orders created', color: 'blue' },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
