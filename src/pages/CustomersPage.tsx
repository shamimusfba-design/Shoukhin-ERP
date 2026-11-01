import React from 'react';
import { useErp } from '../context/ErpContext';
import { formatMoney } from '../services/erpEngine';

export const CustomersPage: React.FC = () => {
  const { customersList, setPage } = useErp();

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{customersList.length} Unique Customers</h2>
        <span className="text-xs text-slate-500">Rebuilt from normalized Bangladesh phone numbers</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium">Phone</th>
              <th className="py-3 px-4 font-medium">District</th>
              <th className="py-3 px-4 font-medium text-right">Orders</th>
              <th className="py-3 px-4 font-medium text-right">Delivered</th>
              <th className="py-3 px-4 font-medium text-right">Recognized Sales</th>
              <th className="py-3 px-4 font-medium">Last Order</th>
              <th className="py-3 px-4 font-medium text-right">History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {customersList.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{c.name}</td>
                <td className="py-3 px-4 font-mono">{c.phone || 'Guest'}</td>
                <td className="py-3 px-4">{c.district}</td>
                <td className="py-3 px-4 text-right font-mono">{c.orders}</td>
                <td className="py-3 px-4 text-right font-mono">{c.delivered}</td>
                <td className="py-3 px-4 text-right font-mono font-medium">{formatMoney(c.sales)}</td>
                <td className="py-3 px-4 font-mono">{c.lastDate}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setPage('Orders');
                    }}
                    className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                  >
                    View Orders
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
