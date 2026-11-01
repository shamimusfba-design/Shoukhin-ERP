import React from 'react';
import { X, Plus, Trash2, Truck, Save, CheckCircle2 } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { saveErpRecord } from '../../firebase';
import {
  BANGLADESH_DISTRICTS,
  ORDER_SOURCES,
  ORDER_STATUSES,
  formatMoney,
  V2_CONFIG,
  getOrderComponents,
} from '../../services/erpEngine';
import {
  AdDailyRecord,
  BudgetRecord,
  ComboRecord,
  ExpenseRecord,
  LedgerRecord,
  OrderRecord,
  ProductRecord,
  PurchaseRecord,
  StockRecord,
  CashTransactionKind,
  SettingsRecord,
} from '../../types/erp';
import { OrderFormModal } from './OrderFormModal';
import { ComboFormModal } from './ComboFormModal';

export const AppModals: React.FC = () => {
  const {
    erpState,
    today,
    canWrite,
    catalog,
    settings,
    dashboard,
    showToast,
    handleBookSteadfastOrder,
    orderModal,
    setOrderModal,
    productModal,
    setProductModal,
    comboModal,
    setComboModal,
    stockCountSku,
    setStockCountSku,
    damageModalOpen,
    setDamageModalOpen,
    expenseModal,
    setExpenseModal,
    budgetModal,
    setBudgetModal,
    cashModalOpen,
    setCashModalOpen,
    purchaseModalOpen,
    setPurchaseModalOpen,
    payBillModal,
    setPayBillModal,
    targetModalOpen,
    setTargetModalOpen,
    adModalOpen,
    setAdModalOpen,
  } = useErp();

  return (
    <>
      {/* ORDER CREATE / EDIT MODAL */}
      {orderModal && (
        <OrderFormModal
          initial={orderModal}
          catalog={catalog}
          products={erpState.Products}
          today={today}
          canWrite={canWrite}
          onClose={() => setOrderModal(null)}
          onBookSteadfast={handleBookSteadfastOrder}
          onSave={async (saved) => {
            await saveErpRecord('Orders', saved);
            setOrderModal(null);
            showToast('Order saved');
          }}
        />
      )}

      {/* PRODUCT MODAL */}
      {productModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const id = productModal.id || 'SHD-' + String(erpState.Products.length + 1).padStart(5, '0');
              const prod: ProductRecord = {
                id,
                name: String(fd.get('name') || '').trim(),
                category: String(fd.get('category') || 'Home Decor').trim(),
                cost: Number(fd.get('cost') || 0),
                price: Number(fd.get('price') || 0),
                reorder: Number(fd.get('reorder') || 0),
                leadDays: Number(fd.get('leadDays') || 7),
                legacyStock: productModal.legacyStock ?? 0,
                active: fd.get('active') === 'on',
                created: productModal.created || new Date().toISOString(),
              };
              await saveErpRecord('Products', prod);
              setProductModal(null);
              showToast('Product saved');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">
                {productModal.id ? 'Edit Product' : 'New Product'}
              </h3>
              <button type="button" onClick={() => setProductModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="col-span-2 space-y-1">
                <span>Product Name</span>
                <input
                  name="name"
                  required
                  defaultValue={productModal.name || ''}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <label className="space-y-1">
                <span>Category</span>
                <input
                  name="category"
                  defaultValue={productModal.category || 'Lighting'}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <label className="space-y-1">
                <span>Low Stock Reorder Point</span>
                <input
                  name="reorder"
                  type="number"
                  min="0"
                  defaultValue={productModal.reorder ?? 5}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Purchase Cost (BDT)</span>
                <input
                  name="cost"
                  type="number"
                  step="any"
                  min="0"
                  required
                  defaultValue={productModal.cost ?? ''}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Selling Price (BDT)</span>
                <input
                  name="price"
                  type="number"
                  step="any"
                  min="0"
                  required
                  defaultValue={productModal.price ?? ''}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="col-span-2 flex items-center gap-2 pt-1">
                <input name="active" type="checkbox" defaultChecked={productModal.active !== false} />
                <span>Active in catalog</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductModal(null)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COMBO MODAL */}
      {comboModal && (
        <ComboFormModal
          initial={comboModal}
          products={erpState.Products}
          onClose={() => setComboModal(null)}
          onSave={async (c) => {
            await saveErpRecord('Combos', c);
            setComboModal(null);
            showToast('Combo bundle saved');
          }}
        />
      )}

      {/* STOCK PHYSICAL COUNT MODAL */}
      {stockCountSku && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const date = String(fd.get('date') || today);
              const qty = Number(fd.get('qty') || 0);
              const included: Record<string, number | null> = {};
              erpState.Orders.filter((o) => o.date >= V2_CONFIG.cutoff && o.date <= date).forEach((o) => {
                included[o.id] = o.imported && !o.lines.length ? null : getOrderComponents(o.lines)[stockCountSku] || 0;
              });
              const purchaseIds = erpState.Purchases.filter(
                (x) => !x.void && x.receivedDate && x.receivedDate <= date
              ).map((x) => x.id);

              await saveErpRecord<StockRecord>('Stock', {
                id: stockCountSku,
                date,
                qty,
                included,
                movements: [],
                purchaseIds,
                provisional: false,
                updated: new Date().toISOString(),
              });
              setStockCountSku(null);
              showToast('Physical stock baseline updated');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Count Available Stock</h3>
              <button type="button" onClick={() => setStockCountSku(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span>Count Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Counted Available Quantity (excluding reserved parcels)</span>
                <input
                  name="qty"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={catalog.find((x) => x.id === stockCountSku)?.stock ?? 0}
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStockCountSku(null)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Count
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DAMAGE MODAL */}
      {damageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const sku = String(fd.get('sku') || '');
              const date = String(fd.get('date') || today);
              const qty = Number(fd.get('qty') || 0);
              const note = String(fd.get('note') || '');
              const prod = erpState.Products.find((p) => p.id === sku);
              if (!prod || prod.cost === null) {
                showToast('Select a physical product with a known purchase cost.');
                return;
              }
              const stockRec = erpState.Stock.find((s) => s.id === sku) || {
                id: sku,
                date: today,
                qty: prod.legacyStock || 0,
                included: {},
                movements: [],
              };
              const dmgId = 'damage_' + Date.now();
              stockRec.movements = (stockRec.movements || []).concat({
                id: dmgId,
                date,
                qty: -qty,
                note: 'Damage: ' + note,
              });
              await saveErpRecord('Stock', stockRec);
              await saveErpRecord<ExpenseRecord>('Expenses', {
                id: dmgId,
                date,
                periodStart: date,
                periodEnd: date,
                category: 'Damage',
                amount: qty * prod.cost,
                damageSku: sku,
                damageQty: qty,
                nonCash: true,
                coverageComplete: true,
                payments: [],
                note: `Damaged ${qty}x ${prod.name}: ${note}`,
              });
              setDamageModalOpen(false);
              showToast('Damaged stock recorded');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Record Damaged Stock</h3>
              <button type="button" onClick={() => setDamageModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span>Product</span>
                <select
                  name="sku"
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {erpState.Products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Cost: {formatMoney(p.cost)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span>Damage Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Damaged Quantity</span>
                <input
                  name="qty"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Reason / Note</span>
                <input
                  name="note"
                  placeholder="Transit breakage, warehouse damage…"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDamageModalOpen(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-red-600 text-white text-xs font-semibold cursor-pointer"
              >
                Record Damage
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXPENSE MODAL */}
      {expenseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const id = expenseModal.id || 'EXP-' + Date.now();
              const date = String(fd.get('date') || today);
              const amount = Number(fd.get('amount') || 0);
              const paid = Number(fd.get('paid') || 0);
              const exp: ExpenseRecord = {
                id,
                date,
                periodStart: String(fd.get('periodStart') || date),
                periodEnd: String(fd.get('periodEnd') || date),
                category: String(fd.get('category') || 'Other').trim(),
                marketplace: String(fd.get('marketplace') || '').trim(),
                amount,
                coverageComplete: fd.get('coverageComplete') === 'on',
                note: String(fd.get('note') || '').trim(),
                payments: paid > 0 ? [{ id: id + '_init', date, amount: paid, account: 'Bank' }] : [],
              };
              await saveErpRecord('Expenses', exp);
              setExpenseModal(null);
              showToast('Expense saved');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Actual Expense</h3>
              <button type="button" onClick={() => setExpenseModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span>Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={expenseModal.date || today}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Category</span>
                <input
                  name="category"
                  defaultValue={expenseModal.category || 'Packing'}
                  required
                  placeholder="Ads / Salary / Packing"
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <label className="space-y-1">
                <span>Covers From</span>
                <input
                  name="periodStart"
                  type="date"
                  defaultValue={expenseModal.periodStart || today}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Covers Through</span>
                <input
                  name="periodEnd"
                  type="date"
                  defaultValue={expenseModal.periodEnd || today}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Total Expense (BDT)</span>
                <input
                  name="amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  defaultValue={expenseModal.amount ?? ''}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Paid from Bank Now</span>
                <input
                  name="paid"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={expenseModal.amount ?? 0}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="col-span-2 space-y-1">
                <span>Note</span>
                <input
                  name="note"
                  defaultValue={expenseModal.note || ''}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <label className="col-span-2 flex items-center gap-2">
                <input
                  name="coverageComplete"
                  type="checkbox"
                  defaultChecked={expenseModal.coverageComplete !== false}
                />
                <span>Complete actual cost for this category & coverage period</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExpenseModal(null)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BUDGET PROJECTION MODAL */}
      {budgetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const bud: BudgetRecord = {
                id: budgetModal.id || 'BUD-' + Date.now(),
                category: String(fd.get('category') || 'Salary').trim(),
                frequency: fd.get('frequency') === 'daily' ? 'daily' : 'monthly',
                amount: Number(fd.get('amount') || 0),
                start: String(fd.get('start') || '2026-09-01'),
                end: String(fd.get('end') || ''),
                active: fd.get('active') === 'on',
              };
              await saveErpRecord('Budgets', bud);
              setBudgetModal(null);
              showToast('Expense projection saved');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Recurring Expense Projection</h3>
              <button type="button" onClick={() => setBudgetModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span>Category</span>
                <input
                  name="category"
                  required
                  defaultValue={budgetModal.category || ''}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <label className="space-y-1">
                <span>Frequency</span>
                <select
                  name="frequency"
                  defaultValue={budgetModal.frequency || 'monthly'}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="space-y-1">
                <span>Amount (BDT)</span>
                <input
                  name="amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  defaultValue={budgetModal.amount ?? ''}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Start Date</span>
                <input
                  name="start"
                  type="date"
                  required
                  defaultValue={budgetModal.start || '2026-09-01'}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="col-span-2 flex items-center gap-2">
                <input name="active" type="checkbox" defaultChecked={budgetModal.active !== false} />
                <span>Active projection</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBudgetModal(null)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Projection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BANK LEDGER MODAL */}
      {cashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const kind = fd.get('kind') as CashTransactionKind;
              const amount = Number(fd.get('amount') || 0);
              const sign = ['withdrawal', 'adjustmentOut'].includes(kind)
                ? -1
                : kind === 'transferPending'
                ? 0
                : 1;
              const rec: LedgerRecord = {
                id: 'LED-' + Date.now(),
                date: String(fd.get('date') || today),
                kind,
                amount,
                signed: amount * sign,
                reference: String(fd.get('reference') || '').trim(),
                note: String(fd.get('note') || '').trim(),
                created: new Date().toISOString(),
              };
              await saveErpRecord('Ledger', rec);
              setCashModalOpen(false);
              showToast('Bank ledger entry saved');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Bank Ledger Entry</h3>
              <button type="button" onClick={() => setCashModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span>Transaction Type</span>
                <select
                  name="kind"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="opening">Opening bank balance</option>
                  <option value="transferReceived">Courier money received in bank</option>
                  <option value="investment">New owner investment</option>
                  <option value="withdrawal">Owner withdrawal</option>
                  <option value="customerReceipt">Direct customer payment</option>
                  <option value="adjustmentIn">Correction: increase</option>
                  <option value="adjustmentOut">Correction: decrease</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span>Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Amount (BDT)</span>
                <input
                  name="amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Reference</span>
                <input
                  name="reference"
                  placeholder="Bank / Steadfast transfer ref"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <label className="block space-y-1">
                <span>Note</span>
                <input
                  name="note"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCashModalOpen(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STOCK PURCHASE MODAL */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const sku = String(fd.get('sku') || '');
              const prod = erpState.Products.find((p) => p.id === sku);
              if (!prod) return;
              const qty = Number(fd.get('qty') || 1);
              const cost = Number(fd.get('cost') || prod.cost || 0);
              const date = String(fd.get('date') || today);
              const total = qty * cost;
              const id = 'PUR-' + Date.now();
              const pur: PurchaseRecord = {
                id,
                date,
                receivedDate: date,
                supplier: String(fd.get('supplier') || '').trim(),
                reference: String(fd.get('reference') || '').trim(),
                lines: [{ sku: prod.id, name: prod.name, qty, cost }],
                total,
                note: String(fd.get('note') || '').trim(),
                payments: [{ id: id + ':init', date, amount: total, account: 'Bank' }],
                created: new Date().toISOString(),
              };
              await saveErpRecord('Purchases', pur);
              setPurchaseModalOpen(false);
              showToast('Stock purchase & receipt recorded');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Stock Purchase</h3>
              <button type="button" onClick={() => setPurchaseModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="col-span-2 space-y-1">
                <span>Product</span>
                <select
                  name="sku"
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {erpState.Products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span>Purchase & Receipt Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Supplier</span>
                <input
                  name="supplier"
                  placeholder="Supplier name"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <label className="space-y-1">
                <span>Quantity</span>
                <input
                  name="qty"
                  type="number"
                  min="1"
                  step="any"
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Unit Cost (BDT)</span>
                <input
                  name="cost"
                  type="number"
                  min="0"
                  step="any"
                  required
                  defaultValue={erpState.Products[0]?.cost ?? 0}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Purchase
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MONTHLY TARGET MODAL */}
      {targetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const m = String(fd.get('month') || today.slice(0, 7));
              const amount = Number(fd.get('amount') || 0);
              const nextSettings: SettingsRecord = {
                ...settings,
                salesTarget: amount,
                monthTargets: {
                  ...(settings.monthTargets || {}),
                  [m]: amount,
                },
              };
              await saveErpRecord('Settings', nextSettings);
              setTargetModalOpen(false);
              showToast(`Monthly target for ${m} set to ${formatMoney(amount)}`);
            }}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Set Monthly Sales Target</h3>
              <button type="button" onClick={() => setTargetModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span>Month</span>
                <input
                  name="month"
                  type="month"
                  defaultValue={today.slice(0, 7)}
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Target Delivered Sales (BDT)</span>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  defaultValue={dashboard.target.amount}
                  required
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTargetModalOpen(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Target
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DAILY AD SPEND MODAL */}
      {adModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const date = String(fd.get('date') || today);
              const usd = Number(fd.get('usd') || 0);
              const rate = Number(fd.get('rate') || settings.usdRate || 122);
              const vat = Number(fd.get('vat') || settings.vatRate || 15);
              const msgRaw = fd.get('messages');
              const messages = msgRaw === '' || msgRaw === null ? null : Number(msgRaw);
              const amount = Math.round(usd * rate * (1 + vat / 100) * 100) / 100;
              const id = `${settings.metaAccount}:${date}`;

              const adRec: AdDailyRecord = {
                id,
                account: settings.metaAccount,
                date,
                usd,
                rate,
                vat,
                amount,
                messages,
                origin: 'Manual',
                updated: new Date().toISOString(),
              };
              await saveErpRecord('AdDaily', adRec);
              await saveErpRecord<ExpenseRecord>('Expenses', {
                id: 'meta_' + id,
                date,
                periodStart: date,
                periodEnd: date,
                category: 'Ads',
                marketplace: 'Facebook',
                amount,
                coverageComplete: true,
                metaManaged: true,
                payments: [{ id: 'meta_pay_' + date, date, amount, account: 'Bank' }],
                note: `USD ${usd} × ${rate} + ${vat}% VAT`,
              });
              setAdModalOpen(false);
              showToast('Daily ad spend & VAT-inclusive expense saved');
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Daily Meta Ad Spend</h3>
              <button type="button" onClick={() => setAdModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span>Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Spend USD (before VAT)</span>
                <input
                  name="usd"
                  type="number"
                  step="any"
                  min="0"
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>Ad Conversations</span>
                <input
                  name="messages"
                  type="number"
                  min="0"
                  placeholder="Blank if unknown"
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>BDT per USD</span>
                <input
                  name="rate"
                  type="number"
                  step="any"
                  defaultValue={settings.usdRate}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="space-y-1">
                <span>VAT %</span>
                <input
                  name="vat"
                  type="number"
                  step="any"
                  defaultValue={settings.vatRate}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdModalOpen(false)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Ad Spend
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAY BILL MODAL */}
      {payBillModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const date = String(fd.get('date') || today);
              const amount = Number(fd.get('amount') || 0);
              const reference = String(fd.get('reference') || '').trim();
              if (payBillModal.kind === 'expense') {
                const exp = erpState.Expenses.find((x) => x.id === payBillModal.id);
                if (exp) {
                  await saveErpRecord('Expenses', {
                    ...exp,
                    payments: (exp.payments || []).concat({
                      id: 'pay_' + Date.now(),
                      date,
                      amount,
                      account: 'Bank',
                      reference,
                    }),
                  });
                }
              } else {
                const pur = erpState.Purchases.find((x) => x.id === payBillModal.id);
                if (pur) {
                  await saveErpRecord('Purchases', {
                    ...pur,
                    payments: (pur.payments || []).concat({
                      id: 'pay_' + Date.now(),
                      date,
                      amount,
                      account: 'Bank',
                      reference,
                    }),
                  });
                }
              }
              setPayBillModal(null);
              showToast('Bill payment recorded');
            }}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Record Bill Payment</h3>
              <button type="button" onClick={() => setPayBillModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Outstanding: {formatMoney(payBillModal.outstanding)}. Updates bank balance without double-counting expense.
            </p>
            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span>Payment Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Amount (BDT)</span>
                <input
                  name="amount"
                  type="number"
                  step="any"
                  max={payBillModal.outstanding}
                  defaultValue={payBillModal.outstanding}
                  required
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span>Reference</span>
                <input
                  name="reference"
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayBillModal(null)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}

    </>
  );
};
