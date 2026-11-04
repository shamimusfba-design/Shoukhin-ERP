import React, { useState, useMemo } from 'react';
import { Search, Plus, Printer, Truck, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, ClipboardPaste } from 'lucide-react';
import { SteadfastPasteModal } from '../components/modals/SteadfastPasteModal';
import { saveErpRecord } from '../firebase';
import { useErp } from '../context/ErpContext';
import { ORDER_STATUSES, formatMoney, calculateOrderFinance } from '../services/erpEngine';
import { OrderRecord, OrderStatus } from '../types/erp';

export const OrdersPage: React.FC = () => {
  const {
    erpState,
    today,
    canWrite,
    customerTypesMap,
    setOrderModal,
    handleBookSteadfastOrder,
    handleUpdateOrderStatus,
    handleSyncAllSteadfastStatuses,
    handleDirectFetchConsignment,
    setPrintOrder,
    setErpState,
    showToast,
    busy,
  } = useErp();

  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [pendingProductsOnly, setPendingProductsOnly] = useState(false);
  const [orderOffset, setOrderOffset] = useState(0);
  const [directCode, setDirectCode] = useState('');
  const [pasteModalOpen, setPasteModalOpen] = useState(false);

  const filteredOrdersList = useMemo(() => {
    const q = orderQuery.toLowerCase().trim();
    const rows = erpState.Orders.filter((o) => {
      if (orderStatusFilter && o.status !== orderStatusFilter) return false;
      if (pendingProductsOnly && o.lines && o.lines.length > 0) return false;
      if (
        q &&
        ![o.name, o.phone, o.id, o.cid, o.tracking, o.district, o.invoice, o.address]
          .join(' ')
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    return {
      total: rows.length,
      rows: rows.slice(orderOffset, orderOffset + 50).map((o) => ({
        ...o,
        customerType: (customerTypesMap[o.id] || 'New') as 'New' | 'Repeat' | 'Unknown',
        finance: calculateOrderFinance(o),
      })),
    };
  }, [erpState.Orders, orderQuery, orderStatusFilter, pendingProductsOnly, orderOffset, customerTypesMap]);

  return (
                <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderQuery}
                    onChange={(ev) => {
                      setOrderQuery(ev.target.value);
                      setOrderOffset(0);
                    }}
                    placeholder="Search name, phone, tracking, invoice, district…"
                    className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(ev) => {
                    setOrderStatusFilter(ev.target.value);
                    setOrderOffset(0);
                  }}
                  className="min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="">All statuses</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer min-h-[42px] px-2">
                  <input
                    type="checkbox"
                    checked={pendingProductsOnly}
                    onChange={(ev) => {
                      setPendingProductsOnly(ev.target.checked);
                      setOrderOffset(0);
                    }}
                    className="rounded border-slate-300"
                  />
                  <span>Product assignment pending</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSyncAllSteadfastStatuses}
                    className="min-h-[42px] px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                    <span>⚡ Auto-Sync Steadfast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPasteModalOpen(true)}
                    className="min-h-[42px] px-3.5 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-all"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>📋 বাল্ক পেস্ট করুন</span>
                  </button>

                  {canWrite && (
                    <button
                      type="button"
                      onClick={() =>
                        setOrderModal({
                          date: today,
                          status: 'Confirmed',
                          source: 'Facebook',
                          paymentStatus: 'Unpaid',
                          returnCharge: 0,
                          lines: [],
                        })
                      }
                      className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Order</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Ingest Bar for New Courier Orders */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 flex flex-col sm:flex-row items-center gap-2.5 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>কুরিয়ার থেকে সরাসরি অর্ডার যোগ করুন:</span>
                </span>
                <div className="flex-1 flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={directCode}
                    onChange={(e) => setDirectCode(e.target.value)}
                    placeholder="Steadfast Tracking Code বা Consignment ID দিন (যেমন SFR261008... বা 306145501)"
                    className="flex-1 min-h-[36px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={busy || !directCode.trim()}
                    onClick={async () => {
                      await handleDirectFetchConsignment(directCode);
                      setDirectCode('');
                    }}
                    className="min-h-[36px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium whitespace-nowrap cursor-pointer shadow-xs transition-colors"
                  >
                    Fetch & Add
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>{filteredOrdersList.total} matching orders</span>
                  <span className="font-mono">
                    Showing {filteredOrdersList.total ? orderOffset + 1 : 0}–
                    {Math.min(orderOffset + 50, filteredOrdersList.total)}
                  </span>
                </div>

                {/* Mobile Tap List Cards */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                  {filteredOrdersList.rows.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">No matching orders found.</div>
                  ) : (
                    filteredOrdersList.rows.map((o) => (
                      <div key={o.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{o.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {o.date} · {o.phone || 'No phone'} · {o.district || 'District review'}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatMoney(o.total)}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">{o.status}</div>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2">
                          <span>Invoice: {o.invoice}</span>
                          <span>·</span>
                          <span>Tracking: {o.tracking || 'Unbooked'}</span>
                          <span>·</span>
                          <span>
                            After courier:{' '}
                            {o.finance.historical
                              ? formatMoney(o.finance.estimate)
                              : o.finance.reason || formatMoney(o.finance.contribution)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setOrderModal(o)}
                            className="min-h-[40px] px-3.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                          >
                            Open / Edit
                          </button>
                          {!o.cid && !o.tracking && canWrite && (
                            <button
                              type="button"
                              onClick={() => handleBookSteadfastOrder(o)}
                              className="min-h-[40px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Book Steadfast</span>
                            </button>
                          )}
                          {(o.cid || o.tracking) && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(o)}
                              className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                            >
                              Update Status
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setPrintOrder(o);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop High-Density Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                        <th className="py-3 px-4 font-medium">Date</th>
                        <th className="py-3 px-4 font-medium">Customer</th>
                        <th className="py-3 px-4 font-medium">District</th>
                        <th className="py-3 px-4 font-medium text-right">Total</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Gross / Est.</th>
                        <th className="py-3 px-4 font-medium text-right">After Courier</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredOrdersList.rows.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono whitespace-nowrap">{o.date}</td>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-slate-900 dark:text-white">{o.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {o.phone || 'Guest'} · {o.tracking || o.invoice}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">{o.district || 'Review'}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium">{formatMoney(o.total)}</td>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-slate-900 dark:text-slate-200">{o.status}</div>
                            <div className="text-[10px] text-slate-500">
                              {o.lastSync ? 'Synced ' + new Date(o.lastSync).toLocaleDateString() : 'Manual'}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                            {formatMoney(o.finance.gross !== null ? o.finance.gross : o.finance.estimate)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {formatMoney(o.finance.contribution !== null ? o.finance.contribution : o.finance.estimate)}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setOrderModal(o)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium cursor-pointer"
                            >
                              Open
                            </button>
                            {!o.cid && !o.tracking && canWrite && (
                              <button
                                type="button"
                                onClick={() => handleBookSteadfastOrder(o)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer inline-flex items-center gap-1"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Book</span>
                              </button>
                            )}
                            {(o.cid || o.tracking) && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(o)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                Sync
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setPrintOrder(o);
                                setTimeout(() => window.print(), 100);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    disabled={orderOffset === 0}
                    onClick={() => setOrderOffset(Math.max(0, orderOffset - 50))}
                    className="min-h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="font-mono text-slate-500">
                    {orderOffset + 1}–{Math.min(orderOffset + 50, filteredOrdersList.total)} of{' '}
                    {filteredOrdersList.total}
                  </span>
                  <button
                    type="button"
                    disabled={orderOffset + 50 >= filteredOrdersList.total}
                    onClick={() => setOrderOffset(orderOffset + 50)}
                    className="min-h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>

        {/* STEADFAST PASTE MODAL */}
        {pasteModalOpen && (
          <SteadfastPasteModal
            onClose={() => setPasteModalOpen(false)}
            onImport={async (incoming) => {
              const mergedMap = new Map<string, OrderRecord>();
              erpState.Orders.forEach((o) => mergedMap.set(o.cid || o.tracking || o.id, o));
              incoming.forEach((o) => mergedMap.set(o.cid || o.tracking || o.id, o));
              const nextList = Array.from(mergedMap.values());
              setErpState((prev) => ({ ...prev, Orders: nextList }));
              for (const ord of incoming) {
                await saveErpRecord('Orders', ord);
              }
              showToast(`সফলভাবে ${incoming.length} টি অর্ডার ইআরপিতে যুক্ত করা হয়েছে!`);
            }}
          />
        )}
      </div>
  );
};
