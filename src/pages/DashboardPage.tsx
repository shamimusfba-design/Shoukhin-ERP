import React from 'react';
import { Search } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import {
  BANGLADESH_DISTRICTS,
  ORDER_SOURCES,
  QUICK_DATES,
  formatMoney,
  formatNum,
  formatPct,
  getDateRange,
  monthEnd,
  monthLabel,
} from '../services/erpEngine';
import { DualAdGraph, ExpenseBars, Graph21 } from '../components/Charts';
import { OrderStatus } from '../types/erp';

export const DashboardPage: React.FC = () => {
  const {
    today,
    catalog,
    canWrite,
    setPage,
    handleRefreshCourierBalance,
    setTargetModalOpen,
    dashboard,
    quickDate,
    setQuickDate,
    selectedMonth,
    setSelectedMonth,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    districtFilter,
    setDistrictFilter,
    categoryFilter,
    setCategoryFilter,
    productFilter,
    setProductFilter,
    marketFilter,
    setMarketFilter,
    customerFilter,
    setCustomerFilter,
    dashQuery,
    setDashQuery,
    groupBy,
    setGroupBy,
    districtMetric,
    setDistrictMetric,
    productMetric,
    setProductMetric,
  } = useErp();

  return (
    <>
                    {/* Filter Bar */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Quick date</span>
                    <select
                      value={quickDate}
                      onChange={(ev) => {
                        const q = ev.target.value;
                        setQuickDate(q);
                        setSelectedMonth('');
                        const [s, e] = getDateRange(q, today, dashboard.options.months);
                        setStartDate(s);
                        setEndDate(e);
                      }}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      {QUICK_DATES.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Month</span>
                    <select
                      value={selectedMonth}
                      onChange={(ev) => {
                        const m = ev.target.value;
                        setSelectedMonth(m);
                        if (!m) return;
                        setQuickDate('Custom');
                        setStartDate(m + '-01');
                        const end = monthEnd(m);
                        setEndDate(end > today ? today : end);
                      }}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">All / select</option>
                      {dashboard.options.months.map((m) => (
                        <option key={m} value={m}>
                          {monthLabel(m)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>From date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(ev) => {
                        setStartDate(ev.target.value);
                        setQuickDate('Custom');
                      }}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>To date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(ev) => {
                        setEndDate(ev.target.value);
                        setQuickDate('Custom');
                      }}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>District</span>
                    <select
                      value={districtFilter}
                      onChange={(ev) => setDistrictFilter(ev.target.value)}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">All districts</option>
                      {dashboard.options.districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Category</span>
                    <select
                      value={categoryFilter}
                      onChange={(ev) => {
                        setCategoryFilter(ev.target.value);
                        setProductFilter('');
                      }}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">All categories</option>
                      {dashboard.options.categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Product / combo</span>
                    <select
                      value={productFilter}
                      onChange={(ev) => setProductFilter(ev.target.value)}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">All products</option>
                      {catalog
                        .filter((x) => !categoryFilter || x.category === categoryFilter)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Marketplace</span>
                    <select
                      value={marketFilter}
                      onChange={(ev) => setMarketFilter(ev.target.value)}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">All sources</option>
                      {dashboard.options.marketplaces.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Customer type</span>
                    <select
                      value={customerFilter}
                      onChange={(ev) => setCustomerFilter(ev.target.value)}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">All customers</option>
                      <option value="New">New</option>
                      <option value="Repeat">Repeat</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Search</span>
                    <input
                      type="text"
                      value={dashQuery}
                      onChange={(ev) => setDashQuery(ev.target.value)}
                      placeholder="Customer, phone, tracking"
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </label>

                  <label className="block text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span>Group by</span>
                    <select
                      value={groupBy}
                      onChange={(ev) => setGroupBy(ev.target.value as any)}
                      className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickDate('This Month');
                      setSelectedMonth('');
                      setStartDate(today.slice(0, 7) + '-01');
                      setEndDate(today);
                      setDistrictFilter('');
                      setCategoryFilter('');
                      setProductFilter('');
                      setMarketFilter('');
                      setCustomerFilter('');
                      setDashQuery('');
                    }}
                    className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* Snapshot Header */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                    Business Snapshot
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {startDate} — {endDate} · Sales: delivery date · Orders: created date · Cash/stock: current
                  </p>
                </div>
              </div>

              {/* 12 KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Delivered Sales</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatMoney(dashboard.deliveredAmount)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {formatNum(dashboard.delivered)} orders · Delivery date
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Pending COD</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {formatMoney(dashboard.pendingAmount)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {formatNum(dashboard.pending)} orders · Order date
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Gross Profit</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {dashboard.gross === null ? '—' : formatMoney(dashboard.gross)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {dashboard.incomplete || dashboard.missingDelivery
                      ? 'Missing dates, costs or charges'
                      : 'Before courier & operating expenses'}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Net Profit</div>
                  <div
                    className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
                      Number(dashboard.displayNet) < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatMoney(dashboard.displayNet)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {dashboard.displayNetLabel} · Margin {formatPct(dashboard.displayMargin)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Return / Cancelled</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
                    {formatNum(dashboard.returned + dashboard.cancelled)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {formatPct(dashboard.problemRate)} · Ret {dashboard.returned} · Canc {dashboard.cancelled}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Partial Delivery</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {formatNum(dashboard.partial)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {formatPct(dashboard.partialRate)} of finalized parcels
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPage('Purchases & Bank')}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">Bank Balance</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {formatMoney(dashboard.cash.bank)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {dashboard.cash.bank === null ? 'Tap to enter opening balance' : 'Recorded through today'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleRefreshCourierBalance}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">Courier Requestable</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                    {formatMoney(dashboard.cash.courier)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {dashboard.cash.balanceUpdated
                      ? 'Updated ' + new Date(dashboard.cash.balanceUpdated).toLocaleDateString()
                      : 'Tap to fetch balance'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPage('Purchases & Bank')}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">Available Cash</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatMoney(dashboard.cash.available)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Bank + courier requestable
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPage('Inventory');
                  }}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">Stock Value</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {dashboard.inventory.componentValueOnly ? '—' : formatMoney(dashboard.inventory.value)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {formatNum(dashboard.inventory.activeProducts)} active products/combos
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPage('Inventory');
                  }}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">Stock Alerts</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {dashboard.inventory.low} low · {dashboard.inventory.dead} dead
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Dead stock {formatMoney(dashboard.inventory.deadValue)}
                  </div>
                </button>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Steadfast Charges</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {formatMoney(dashboard.fees)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {dashboard.chargeMissing
                      ? `${dashboard.chargeMissing} incomplete records`
                      : 'Delivery + COD + return fees'}
                  </div>
                </div>
              </div>

              {/* Data Integrity Notice */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                {dashboard.missingDelivery} delivered order(s) need delivery date · {dashboard.incomplete} profit input(s) incomplete · {dashboard.partialUnverified} partial order(s) need verification · {dashboard.conflicts} approval conflict(s). Historical profit before Sep 2026 uses a fixed {dashboard.historicalRate}% estimate.
              </div>

              {/* Order Status Strip */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Order Status Breakdown</h3>
                  <span className="text-xs text-slate-500">Selected filters</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {(['Pending', 'Shipped', 'Hold', 'Delivered', 'Partial', 'Returned', 'Cancelled'] as OrderStatus[]).map(
                    (st) => {
                      const count = dashboard.statuses.find((x) => x.name === st)?.orders || 0;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setPage('Orders');
                          }}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                        >
                          <div className="text-xs text-slate-500 dark:text-slate-400">{st}</div>
                          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                            {count}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Primary Charts Grid */}
              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delivered Sales Trend</h3>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => setTargetModalOpen(true)}
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Set Monthly Target
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl font-mono">
                    <span>Target: {formatMoney(dashboard.target.amount)}</span>
                    <span>·</span>
                    <span>Achieved: {formatMoney(dashboard.target.achieved)}</span>
                    <span>·</span>
                    <span>Req/day: {formatMoney(dashboard.target.required)}</span>
                  </div>
                  <Graph21
                    rows={dashboard.chartDays}
                    series={
                      groupBy === 'Daily' && dashboard.target.amount > 0
                        ? [
                            { key: 'sales', label: 'Delivered sales', color: 'blue' },
                            { key: 'required', label: 'Required/day', color: 'orange', dashed: true },
                          ]
                        : [{ key: 'sales', label: 'Delivered sales', color: 'blue' }]
                    }
                    line
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Orders Received</h3>
                  <Graph21
                    rows={dashboard.chartDays}
                    series={[{ key: 'orders', label: 'Orders received', color: 'blue' }]}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Monthly Net Profit</h3>
                  <Graph21
                    rows={dashboard.months.map((m) => ({
                      ...m,
                      netView: m.incomplete ? null : m.historical ? m.estimate : m.net ?? m.projectedNet,
                    }))}
                    series={[{ key: 'netView', label: 'Net profit / estimate', color: 'green' }]}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Returns, Cancellations & Partial
                  </h3>
                  <Graph21
                    rows={dashboard.months}
                    series={[
                      { key: 'returned', label: 'Returned', color: 'red' },
                      { key: 'cancelled', label: 'Cancelled', color: 'orange' },
                      { key: 'partial', label: 'Partial', color: 'yellow' },
                    ]}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Expenses by Category</h3>
                  <ExpenseBars
                    rows={Object.values(
                      dashboard.expenses.rows.reduce(
                        (acc, r) => {
                          const g = acc[r.category] || (acc[r.category] = { name: r.category, actual: 0, projection: 0 });
                          g.actual += r.actual;
                          g.projection += r.used;
                          return acc;
                        },
                        {} as Record<string, { name: string; actual: number; projection: number }>
                      )
                    )}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Marketplace Performance</h3>
                  <Graph21
                    rows={dashboard.marketplaces.map((x) => ({
                      ...x,
                      netValue: x.net ?? x.projectedNet,
                    }))}
                    series={[
                      { key: 'sales', label: 'Sales', color: 'blue' },
                      { key: 'netValue', label: 'Net / estimate', color: 'green' },
                    ]}
                  />
                </div>
              </div>

              {/* District & Product Top 10 Performance */}
              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">District Performance</h3>
                    <select
                      value={districtMetric}
                      onChange={(ev) => setDistrictMetric(ev.target.value)}
                      className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    >
                      <option value="sales">Delivered sales</option>
                      <option value="orders">Orders</option>
                      <option value="gross">Gross profit</option>
                      <option value="returned">Returns</option>
                    </select>
                  </div>
                  <Graph21
                    rows={dashboard.districts
                      .slice()
                      .sort((a: any, b: any) => (b[districtMetric] ?? 0) - (a[districtMetric] ?? 0))
                      .slice(0, 10)}
                    series={[{ key: districtMetric, label: districtMetric, color: 'blue' }]}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Product Performance</h3>
                    <select
                      value={productMetric}
                      onChange={(ev) => setProductMetric(ev.target.value)}
                      className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    >
                      <option value="sales">Delivered sales</option>
                      <option value="qty">Sold quantity</option>
                      <option value="gross">Gross profit</option>
                      <option value="returned">Returns</option>
                    </select>
                  </div>
                  <Graph21
                    rows={dashboard.products
                      .slice()
                      .sort((a: any, b: any) => (b[productMetric] ?? 0) - (a[productMetric] ?? 0))
                      .slice(0, 10)}
                    series={[{ key: productMetric, label: productMetric, color: 'green' }]}
                  />
                </div>
              </div>
    </>
  );
};
