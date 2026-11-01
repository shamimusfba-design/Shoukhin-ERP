import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Truck, Save, CheckCircle2 } from 'lucide-react';
import { CatalogItem, OrderLineItem, OrderRecord, OrderStatus, ProductRecord } from '../../types/erp';
import {
  BANGLADESH_DISTRICTS,
  ORDER_SOURCES,
  ORDER_STATUSES,
  districtHint,
  formatMoney,
  getOrderComponents,
  normalizePhone,
} from '../../services/erpEngine';

export const OrderFormModal: React.FC<{
  initial: Partial<OrderRecord>;
  catalog: CatalogItem[];
  products: ProductRecord[];
  today: string;
  canWrite: boolean;
  onClose: () => void;
  onBookSteadfast: (o: OrderRecord) => Promise<void>;
  onSave: (o: OrderRecord) => Promise<void>;
}> = ({ initial, catalog, products, today, canWrite, onClose, onBookSteadfast, onSave }) => {
  const [date, setDate] = useState(initial.date || today);
  const [deliveredAt, setDeliveredAt] = useState((initial.deliveredAt || '').slice(0, 10));
  const [status, setStatus] = useState<OrderStatus>(initial.status || 'Confirmed');
  const [name, setName] = useState(initial.name || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [address, setAddress] = useState(initial.address || '');
  const [district, setDistrict] = useState(initial.district || '');
  const [thana, setThana] = useState(initial.thana || '');
  const [source, setSource] = useState(initial.source || 'Facebook');
  const [paymentStatus, setPaymentStatus] = useState(initial.paymentStatus || 'Unpaid');
  const [total, setTotal] = useState<string>(initial.total !== undefined && initial.total !== null ? String(initial.total) : '');
  const [cod, setCod] = useState<string>(initial.cod !== undefined && initial.cod !== null ? String(initial.cod) : '');
  const [shippingCharge, setShippingCharge] = useState<string>(
    initial.shippingCharge !== undefined && initial.shippingCharge !== null ? String(initial.shippingCharge) : '80'
  );
  const [codCharge, setCodCharge] = useState<string>(
    initial.codCharge !== undefined && initial.codCharge !== null ? String(initial.codCharge) : '0'
  );
  const [returnCharge, setReturnCharge] = useState<string>(String(initial.returnCharge ?? 0));
  const [finalAmount, setFinalAmount] = useState<string>(
    initial.finalAmount !== undefined && initial.finalAmount !== null ? String(initial.finalAmount) : ''
  );
  const [amountVerified, setAmountVerified] = useState(!!initial.amountVerified);
  const [itemsVerified, setItemsVerified] = useState(!!initial.itemsVerified);
  const [dispatched, setDispatched] = useState(!!initial.dispatched);
  const [note, setNote] = useState(initial.note || '');
  const [lines, setLines] = useState<OrderLineItem[]>(
    initial.lines?.length
      ? initial.lines
      : [
          {
            sku: catalog[0]?.id || '',
            name: catalog[0]?.name || '',
            category: catalog[0]?.category || 'Other',
            qty: 1,
            price: catalog[0]?.price || 0,
            cost: catalog[0]?.cost ?? 0,
            returned: 0,
          },
        ]
  );

  const lineSum = useMemo(
    () => lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.price || 0), 0),
    [lines]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!canWrite) return;
          const preparedLines: OrderLineItem[] = lines
            .filter((l) => l.sku)
            .map((l) => {
              const catItem = catalog.find((c) => c.id === l.sku);
              return {
                sku: l.sku,
                name: catItem?.name || l.name,
                category: catItem?.category || l.category || 'Other',
                qty: Number(l.qty || 1),
                price: Number(l.price || 0),
                cost: l.cost !== null && l.cost !== undefined ? Number(l.cost) : catItem?.cost ?? null,
                returned: Number(l.returned || 0),
                components: (catItem?.components || [{ sku: l.sku, qty: 1 }]).map((c) => ({
                  sku: c.sku,
                  qty: c.qty,
                  cost: catItem?.components
                    ? products.find((p) => p.id === c.sku)?.cost ?? null
                    : Number(l.cost ?? catItem?.cost ?? 0),
                })),
              };
            });

          const id = initial.id || 'ORD-' + Date.now();
          const numTotal = total === '' ? lineSum : Number(total);
          const numCod = cod === '' ? numTotal : Number(cod);

          const savedOrder: OrderRecord = {
            id,
            cid: initial.cid || '',
            tracking: initial.tracking || '',
            invoice: initial.invoice || 'SHD-' + String(Date.now()).slice(-6),
            date,
            deliveredAt: deliveredAt || '',
            name: name.trim(),
            phone: normalizePhone(phone),
            address: address.trim(),
            district: district || districtHint(address),
            thana: thana.trim(),
            total: numTotal,
            cod: numCod,
            shippingCharge: shippingCharge === '' ? null : Number(shippingCharge),
            codCharge: codCharge === '' ? null : Number(codCharge),
            returnCharge: Number(returnCharge || 0),
            status,
            source,
            paymentStatus,
            note: note.trim(),
            createdAt: initial.createdAt || new Date().toISOString(),
            lines: preparedLines,
            stockReturns: initial.stockReturns || {},
            financialReturns: initial.financialReturns || {},
            stockReserved: !['Draft', 'Unknown'].includes(status),
            dispatched: dispatched || ['Shipped', 'Delivered', 'Partial', 'Returned'].includes(status),
            revision: (initial.revision || 0) + 1,
            imported: initial.imported,
            amountVerified,
            itemsVerified,
            finalAmount: amountVerified && finalAmount !== '' ? Number(finalAmount) : null,
            bookingState: initial.bookingState || '',
            lastSync: initial.lastSync || '',
          };
          await onSave(savedOrder);
        }}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold font-display">
            {initial.id ? `Order ${initial.invoice || initial.id}` : 'Create New Order'}
          </h3>
          <button type="button" onClick={onClose} className="min-h-[40px] min-w-[40px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <label className="space-y-1">
            <span>Order Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span>Delivery Date (if delivered)</span>
            <input
              type="date"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span>Customer Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </label>
          <label className="space-y-1">
            <span>Phone (Bangla/English digits)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span>Source / Marketplace</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              {ORDER_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 space-y-1">
            <span>Full Address (auto-detects district)</span>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                const val = e.target.value;
                setAddress(val);
                const hint = districtHint(val);
                if (hint && !district) setDistrict(hint);
              }}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </label>
          <label className="space-y-1">
            <span>District</span>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="">Select district</option>
              {BANGLADESH_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span>Order Total (BDT)</span>
            <input
              type="number"
              step="any"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder={String(lineSum)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span>COD to Collect (BDT)</span>
            <input
              type="number"
              step="any"
              value={cod}
              onChange={(e) => setCod(e.target.value)}
              placeholder={String(total || lineSum)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span>Courier Shipping Cost</span>
            <input
              type="number"
              step="any"
              value={shippingCharge}
              onChange={(e) => setShippingCharge(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>
        </div>

        {/* Line Items */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold">Order Items / Combos</h4>
            <button
              type="button"
              onClick={() =>
                setLines(
                  lines.concat({
                    sku: catalog[0]?.id || '',
                    name: catalog[0]?.name || '',
                    category: catalog[0]?.category || 'Other',
                    qty: 1,
                    price: catalog[0]?.price || 0,
                    cost: catalog[0]?.cost ?? 0,
                    returned: 0,
                  })
                )
              }
              className="text-xs font-medium text-emerald-600 hover:underline cursor-pointer"
            >
              + Add Item
            </button>
          </div>
          {lines.map((l, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end text-xs">
              <label className="col-span-5 space-y-1">
                <span>Product / Combo</span>
                <select
                  value={l.sku}
                  onChange={(ev) => {
                    const c = catalog.find((x) => x.id === ev.target.value);
                    const next = [...lines];
                    next[idx] = {
                      ...next[idx],
                      sku: ev.target.value,
                      name: c?.name || '',
                      category: c?.category || 'Other',
                      price: c?.price ?? 0,
                      cost: c?.cost ?? 0,
                    };
                    setLines(next);
                  }}
                  className="w-full min-h-[38px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Select item</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatMoney(c.price)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 space-y-1">
                <span>Qty</span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={l.qty}
                  onChange={(ev) => {
                    const next = [...lines];
                    next[idx] = { ...next[idx], qty: Number(ev.target.value) };
                    setLines(next);
                  }}
                  className="w-full min-h-[38px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="col-span-2 space-y-1">
                <span>Unit Price</span>
                <input
                  type="number"
                  step="any"
                  value={l.price}
                  onChange={(ev) => {
                    const next = [...lines];
                    next[idx] = { ...next[idx], price: Number(ev.target.value) };
                    setLines(next);
                  }}
                  className="w-full min-h-[38px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <label className="col-span-2 space-y-1">
                <span>Returned</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={l.returned || 0}
                  onChange={(ev) => {
                    const next = [...lines];
                    next[idx] = { ...next[idx], returned: Number(ev.target.value) };
                    setLines(next);
                  }}
                  className="w-full min-h-[38px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </label>
              <button
                type="button"
                onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                className="col-span-1 min-h-[38px] flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-slate-500 font-mono">
            Item-price sum: {formatMoney(lineSum)} — full order value above remains separately editable.
          </p>
        </div>

        {/* Optional Courier & Partial Delivery Details */}
        <details className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs">
          <summary className="font-medium cursor-pointer">
            More details / Courier charges / Partial delivery verification
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
            <label className="space-y-1">
              <span>Thana</span>
              <input
                value={thana}
                onChange={(e) => setThana(e.target.value)}
                className="w-full min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>
            <label className="space-y-1">
              <span>Courier COD Fee</span>
              <input
                type="number"
                step="any"
                value={codCharge}
                onChange={(e) => setCodCharge(e.target.value)}
                className="w-full min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Extra Return Charge</span>
              <input
                type="number"
                step="any"
                value={returnCharge}
                onChange={(e) => setReturnCharge(e.target.value)}
                className="w-full min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Partial Collected Amount</span>
              <input
                type="number"
                step="any"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                className="w-full min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={amountVerified}
                onChange={(e) => setAmountVerified(e.target.checked)}
              />
              <span>Partial amount verified</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={itemsVerified}
                onChange={(e) => setItemsVerified(e.target.checked)}
              />
              <span>Partial items verified</span>
            </label>
            <label className="col-span-full space-y-1">
              <span>Order Note</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>
          </div>
        </details>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            {initial.id && !initial.cid && !initial.tracking && (
              <button
                type="button"
                onClick={() => onBookSteadfast(initial as OrderRecord)}
                className="min-h-[40px] px-3.5 rounded-xl border border-emerald-600 text-emerald-600 dark:text-emerald-400 text-xs font-medium cursor-pointer"
              >
                Send to Steadfast Courier
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
            >
              Close
            </button>
            {canWrite && (
              <button
                type="submit"
                className="min-h-[42px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Save Order
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
