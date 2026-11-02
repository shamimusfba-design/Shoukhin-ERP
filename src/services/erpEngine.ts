import {
  AdDailyRecord,
  BudgetRecord,
  CatalogItem,
  CheckRecord,
  ComboRecord,
  ErpDatabaseState,
  ExpenseRecord,
  LedgerRecord,
  MonthCloseRecord,
  OrderLineItem,
  OrderRecord,
  OrderStatus,
  ProductRecord,
  PurchaseRecord,
  SettingsRecord,
  StockRecord,
  SuggestionItem,
} from '../types/erp';
import { REAL_SHOUKHIN_PRODUCTS } from '../data/realProducts';
import { REAL_SHOUKHIN_ORDERS } from '../data/realOrders';

export const V2_CONFIG = {
  version: '2.2.0',
  tz: 'Asia/Dhaka',
  cutoff: '2026-09-01',
  historicalRate: 15,
};

export const ORDER_STATUSES: OrderStatus[] = [
  'Draft',
  'Confirmed',
  'In Review',
  'Pending',
  'Shipped',
  'Hold',
  'Delivered Approval Pending',
  'Partial Approval Pending',
  'Cancelled Approval Pending',
  'Delivered',
  'Partial',
  'Cancelled',
  'Returned',
  'Unknown',
];

export const ORDER_SOURCES = ['Facebook', 'WhatsApp', 'Website', 'Phone', 'Walk-in', 'Old Data', 'Other'];

export const QUICK_DATES = [
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 30 Days',
  'This Month',
  'Last Month',
  'Last 3 Months',
  'This Year',
  'All Time',
  'Custom',
];

export function dhakaToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatNum(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return formatNum(n) + '%';
}

export function normalizePhone(x: unknown): string {
  const s = String(x ?? '').trim();
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  return s
    .replace(/[০-৯]/g, (c) => String(banglaDigits.indexOf(c)))
    .replace(/[^0-9]/g, '')
    .replace(/^880/, '0');
}

export function normalizeStatus(s: unknown): OrderStatus {
  const k = String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[ _-]+/g, ' ');
  const map: Record<string, OrderStatus> = {
    delivered: 'Delivered',
    'partially delivered': 'Partial',
    'partial delivered': 'Partial',
    partial: 'Partial',
    cancelled: 'Cancelled',
    returned: 'Returned',
    pending: 'Pending',
    hold: 'Hold',
    'in review': 'In Review',
    'no defined': 'Unknown',
    unknown: 'Unknown',
    draft: 'Draft',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    'delivered approval pending': 'Delivered Approval Pending',
    'partial delivered approval pending': 'Partial Approval Pending',
    'cancelled approval pending': 'Cancelled Approval Pending',
    'unknown approval pending': 'Unknown',
  };
  return map[k] || 'Unknown';
}

const DISTRICT_ALIASES =
  'Dhaka:ঢাকা|Gazipur:গাজীপুর|Narayanganj:নারায়ণগঞ্জ,নারায়ণগঞ্জ|Narsingdi:নরসিংদী|Manikganj:মানিকগঞ্জ|Munshiganj:মুন্সিগঞ্জ|Tangail:টাঙ্গাইল|Kishoreganj:কিশোরগঞ্জ|Faridpur:ফরিদপুর|Gopalganj:গোপালগঞ্জ|Madaripur:মাদারীপুর|Rajbari:রাজবাড়ী,রাজবাড়ী|Shariatpur:শরীয়তপুর,শরীয়তপুর|Chattogram:চট্টগ্রাম,Chittagong|Cox’s Bazar:কক্সবাজার,Coxs Bazar,Cox Bazar|Cumilla:কুমিল্লা,Comilla|Brahmanbaria:ব্রাহ্মণবাড়িয়া,ব্রাহ্মণবাড়িয়া|Chandpur:চাঁদপুর|Feni:ফেনী|Noakhali:নোয়াখালী,নোয়াখালী|Lakshmipur:লক্ষ্মীপুর|Rangamati:রাঙ্গামাটি|Khagrachhari:খাগড়াছড়ি,খাগড়াছড়ি|Bandarban:বান্দরবান|Rajshahi:রাজশাহী|Bogura:বগুড়া,বগুড়া,Bogra|Pabna:পাবনা|Sirajganj:সিরাজগঞ্জ|Naogaon:নওগাঁ|Natore:নাটোর|Joypurhat:জয়পুরহাট,জয়পুরহাট|Chapainawabganj:চাঁপাইনবাবগঞ্জ|Khulna:খুলনা|Jashore:যশোর,Jessore|Satkhira:সাতক্ষীরা|Bagerhat:বাগেরহাট|Kushtia:কুষ্টিয়া,কুষ্টিয়া|Jhenaidah:ঝিনাইদহ|Magura:মাগুরা|Narail:নড়াইল,নড়াইল|Chuadanga:চুয়াডাঙ্গা,চুয়াডাঙ্গা|Meherpur:মেহেরপুর|Barishal:বরিশাল,Barisal|Patuakhali:পটুয়াখালী,পটুয়াখালী|Bhola:ভোলা|Pirojpur:পিরোজপুর|Barguna:বরগুনা|Jhalokathi:ঝালকাঠি|Sylhet:সিলেট|Moulvibazar:মৌলভীবাজার|Habiganj:হবিগঞ্জ|Sunamganj:সুনামগঞ্জ|Rangpur:রংপুর|Dinajpur:দিনাজপুর|Kurigram:কুড়িগ্রাম,কুড়িগ্রাম|Gaibandha:গাইবান্ধা|Nilphamari:নীলফামারী|Lalmonirhat:লালমনিরহাট|Panchagarh:পঞ্চগড়,পঞ্চগড়|Thakurgaon:ঠাকুরগাঁও|Mymensingh:ময়মনসিংহ,ময়মনসিংহ|Jamalpur:জামালপুর|Sherpur:শেরপুর|Netrokona:নেত্রকোনা';

export const BANGLADESH_DISTRICTS: string[] = DISTRICT_ALIASES.split('|')
  .map((e) => e.split(':')[0])
  .sort();

export function districtHint(address: string): string {
  const a = String(address || '').toLowerCase();
  if (!a) return '';
  const candidates: string[] = [];
  DISTRICT_ALIASES.split('|').forEach((entry) => {
    const [name, other] = entry.split(':');
    const terms = [name].concat(other.split(','));
    if (
      terms.some((term) => {
        const t = term.toLowerCase();
        return /[a-z]/.test(t)
          ? new RegExp('(^|[^a-z])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(a)
          : a.includes(t);
      })
    ) {
      candidates.push(name);
    }
  });
  return candidates.length === 1 ? candidates[0] : '';
}

export function addDays(dateStr: string, days: number): string {
  return new Date(Date.parse(dateStr + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
}

export function monthEnd(m: string): string {
  return new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10);
}

export function monthLabel(m: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    })
      .format(new Date(m + '-01T00:00:00Z'))
      .replace(' ', '-');
  } catch {
    return m;
  }
}

export function listDates(start: string, end: string): string[] {
  if (!start || !end || end < start) return [];
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    out.push(d);
    if (out.length > 3660) break;
  }
  return out;
}

export function getDateRange(kind: string, today: string, allMonths: string[]): [string, string] {
  const first = today.slice(0, 7) + '-01';
  const prev = addDays(first, -1);
  switch (kind) {
    case 'Today':
      return [today, today];
    case 'Yesterday':
      return [addDays(today, -1), addDays(today, -1)];
    case 'Last 7 Days':
      return [addDays(today, -6), today];
    case 'Last 30 Days':
      return [addDays(today, -29), today];
    case 'This Month':
      return [first, today];
    case 'Last Month':
      return [prev.slice(0, 7) + '-01', prev];
    case 'Last 3 Months': {
      const d = new Date(first + 'T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth() - 2);
      return [d.toISOString().slice(0, 10), today];
    }
    case 'This Year':
      return [today.slice(0, 4) + '-01-01', today];
    case 'All Time': {
      const earliest = allMonths.slice().sort()[0];
      return [earliest ? earliest + '-01' : first, today];
    }
    default:
      return [first, today];
  }
}

export function defaultSettings(existing?: Partial<SettingsRecord>): SettingsRecord {
  return {
    id: 'main',
    businessName: 'Shoukhin Home Decor',
    subdomain: 'erp.shoukhinhd.com',
    profitRate: 15,
    deadDays: 60,
    leadDays: 7,
    stockTargetDays: 30,
    reminderHour: 20,
    minSample: 10,
    salesTarget: 250000,
    cashReserve: 25000,
    metaAccount: '1430584315368882',
    metaVersion: 'v23.0',
    usdRate: 122,
    vatRate: 15,
    sfKey: 'hp465esy0vg4qfhh2tmc64kthtczvrfe',
    sfSecret: 'tij9eaqybg07fndan7jniisz',
    monthTargets: {},
    ...existing,
  };
}

export function isFinalStatus(status: OrderStatus): boolean {
  return ['Delivered', 'Partial', 'Cancelled', 'Returned'].includes(status);
}

export function getDeliveryDay(o: OrderRecord): string {
  const v = String(o.deliveredAt || '').trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return '';
}

export function getEventDate(o: OrderRecord): string {
  return ['Delivered', 'Partial'].includes(o.status) ? getDeliveryDay(o) : o.date;
}

export function getOrderComponents(lines: OrderLineItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  (lines || []).forEach((l) => {
    (l.components || [{ sku: l.sku, qty: 1, cost: l.cost }]).forEach((c) => {
      out[c.sku] = (out[c.sku] || 0) + c.qty * l.qty;
    });
  });
  return out;
}

export function getUsedComponents(o: OrderRecord): Record<string, number> {
  if (
    o.date < V2_CONFIG.cutoff ||
    o.status === 'Draft' ||
    (['Unknown', 'In Review'].includes(o.status) && !o.stockReserved)
  ) {
    return {};
  }
  const all = getOrderComponents(o.lines || []);
  if (o.status === 'Cancelled' && !o.dispatched) return {};
  const restored = o.stockReturns || {};
  Object.keys(all).forEach((k) => {
    all[k] = Math.max(0, all[k] - (restored[k] || 0));
  });
  return all;
}

export function calculateStocks(
  products: ProductRecord[],
  orders: OrderRecord[],
  records: StockRecord[],
  purchases: PurchaseRecord[],
  today: string
): Record<string, { qty: number; date: string; verified: boolean; base: number }> {
  const out: Record<string, { qty: number; date: string; verified: boolean; base: number }> = {};
  const validPurchases = purchases.filter((x) => !x.void && x.receivedDate && x.receivedDate <= today);

  products.forEach((p) => {
    const b = records.find((x) => x.id === p.id);
    const base = b || { id: p.id, qty: p.legacyStock || 0, date: today, included: {}, movements: [], provisional: true };
    let q = Number(base.qty || 0) + (base.movements || []).reduce((a, m) => a + Number(m.qty || 0), 0);

    orders.forEach((o) => {
      const u = getUsedComponents(o)[p.id] || 0;
      const inc = (base.included || {})[o.id];
      if (inc === null) {
        q += (o.stockReturns || {})[p.id] || 0;
      } else if (inc !== undefined) {
        q -= u - inc;
      } else if (o.date >= base.date) {
        q -= u;
      }
    });

    validPurchases.forEach((pur) => {
      const included =
        b && Array.isArray(b.purchaseIds)
          ? b.purchaseIds.includes(pur.id)
          : b && pur.receivedDate <= b.date;
      if (!included && (b ? pur.receivedDate >= b.date : true)) {
        q += (pur.lines || []).filter((l) => l.sku === p.id).reduce((a, l) => a + Number(l.qty || 0), 0);
      }
    });

    out[p.id] = {
      qty: q,
      date: base.date,
      verified: !!b && !b.provisional,
      base: base.qty,
    };
  });

  return out;
}

export function buildCatalog(
  products: ProductRecord[],
  combos: ComboRecord[],
  orders: OrderRecord[],
  stockRecords: StockRecord[],
  purchases: PurchaseRecord[],
  today: string
): CatalogItem[] {
  const st = calculateStocks(products, orders, stockRecords, purchases, today);
  const productItems: CatalogItem[] = products.map((p) => ({
    ...p,
    stock: st[p.id]?.qty ?? 0,
  }));

  const comboItems: CatalogItem[] = combos.map((c) => {
    const missingCost = c.components.some((x) => {
      const found = products.find((p) => p.id === x.sku);
      return !found || found.cost === null || found.cost === undefined;
    });
    const cost = missingCost
      ? null
      : c.components.reduce((a, x) => {
          const found = products.find((p) => p.id === x.sku);
          return a + (found?.cost || 0) * x.qty;
        }, 0);
    const stock = c.components.length
      ? Math.min(
          ...c.components.map((x) => Math.floor((st[x.sku]?.qty ?? 0) / Math.max(0.01, x.qty)))
        )
      : 0;
    return {
      id: c.id,
      name: c.name,
      category: 'Combo',
      cost,
      price: c.price,
      stock,
      active: c.active,
      components: c.components,
    };
  });

  return productItems.concat(comboItems);
}

export function computeCustomerTypes(orders: OrderRecord[]): Record<string, 'New' | 'Repeat' | 'Unknown'> {
  const types: Record<string, 'New' | 'Repeat' | 'Unknown'> = {};
  const seen = new Set<string>();
  orders
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id))
    .forEach((o) => {
      const ph = normalizePhone(o.phone);
      types[o.id] = o.customerTypeManual && o.customerType
        ? o.customerType
        : ph
        ? seen.has(ph)
          ? 'Repeat'
          : 'New'
        : o.imported
        ? 'Unknown'
        : 'New';
      if (ph) seen.add(ph);
    });
  return types;
}

export function calculateLineFacts(o: OrderRecord) {
  const totalComponents = getOrderComponents(o.lines || []);
  const part = o.status === 'Partial';
  const sold = ['Delivered', 'Partial'].includes(o.status);
  const hasParts = part && Object.values(o.financialReturns || {}).some((q) => q > 0);

  return (o.lines || []).map((l) => {
    let returned: number | null = part ? l.returned || 0 : o.status === 'Returned' ? l.qty : 0;
    const qty = sold ? l.qty - (returned || 0) : 0;
    let cost = l.cost !== null && l.cost !== undefined ? Number(l.cost) : null;
    let retCost = 0;

    if (hasParts) {
      (l.components || []).forEach((c) => {
        const r = ((o.financialReturns || {})[c.sku] || 0) * ((c.qty * l.qty) / (totalComponents[c.sku] || 1));
        if (r && (c.cost === null || c.cost === undefined)) cost = null;
        retCost += r * Number(c.cost || 0);
      });
      returned = null;
    }

    const cogs = !sold
      ? 0
      : cost === null || (part && !o.itemsVerified)
      ? null
      : hasParts
      ? Math.max(0, l.qty * cost - retCost)
      : qty * cost;

    const weight = sold
      ? hasParts
        ? cost && cost > 0
          ? l.price * l.qty * Math.max(0, 1 - retCost / (cost * l.qty))
          : l.price * l.qty
        : l.price * qty
      : l.price * l.qty;

    return {
      sku: l.sku,
      name: l.name,
      category: l.category || 'Other',
      qty,
      returned,
      originalQty: l.qty,
      cogs,
      weight: Math.max(0, weight || 0),
    };
  });
}

export function calculateOrderFinance(o: OrderRecord) {
  const sold = ['Delivered', 'Partial'].includes(o.status);
  const sales = !sold
    ? 0
    : o.status === 'Partial'
    ? o.amountVerified && o.finalAmount !== null && o.finalAmount !== undefined
      ? Number(o.finalAmount)
      : null
    : o.total !== null && o.total !== undefined
    ? Number(o.total)
    : null;

  const fees = [o.shippingCharge, o.codCharge, o.returnCharge];
  const fee = fees.some((x) => x === null || x === undefined)
    ? null
    : fees.reduce((a: number, x) => a + Number(x || 0), 0);

  const facts = calculateLineFacts(o);
  const missing = !facts.length || facts.some((x) => x.cogs === null);
  const cogs = sold ? (missing ? null : facts.reduce((s, x) => s + (x.cogs || 0), 0)) : 0;
  const historical = o.date < V2_CONFIG.cutoff;
  const known = isFinalStatus(o.status) && sales !== null && fee !== null && (historical || cogs !== null);
  const gross = sales !== null && cogs !== null ? sales - cogs : null;
  const contribution = gross !== null && fee !== null ? gross - fee : null;
  const estimate = historical && known ? (((sold ? sales : 0) - fee) * V2_CONFIG.historicalRate) / 100 : null;

  return {
    sales,
    fee,
    cogs,
    gross,
    contribution,
    estimate,
    historical,
    known,
    missingProducts: missing,
    reason: !isFinalStatus(o.status)
      ? 'Not final'
      : sales === null
      ? 'Collected amount missing/unverified'
      : fee === null
      ? 'Courier charge missing'
      : !historical && cogs === null
      ? 'Product/cost verification pending'
      : '',
  };
}

export function calculateOrderParts(o: OrderRecord) {
  const f = calculateOrderFinance(o);
  const facts = calculateLineFacts(o);
  const weight = facts.reduce((a, l) => a + l.weight, 0);
  const fallback = facts.reduce((a, l) => a + l.originalQty, 0);

  return facts.map((l) => {
    const share = weight ? l.weight / weight : fallback ? l.originalQty / fallback : 0;
    return {
      ...l,
      share,
      sales: f.sales === null ? null : f.sales * share,
      fees: f.fee === null ? null : f.fee * share,
      gross: f.sales === null || l.cogs === null ? null : f.sales * share - l.cogs,
      estimate: f.estimate === null ? null : f.estimate * share,
    };
  });
}

export function calculateExpenseTotals(
  expenses: ExpenseRecord[],
  budgets: BudgetRecord[],
  start: string,
  end: string,
  today: string
) {
  if (end < start) return { rows: [], actual: 0, projection: 0, used: 0, daily: [] };
  const canonicalCategory = (cat: string) => (/^(ads?|advertising)$/i.test(String(cat || '').trim()) ? 'Ads' : String(cat || 'Other').trim());

  const map: Record<string, { date: string; category: string; actual: number; projection: number; covered: boolean }> = {};
  function cell(d: string, c: string) {
    const cat = canonicalCategory(c);
    const key = d + '|' + cat.toLowerCase();
    return map[key] || (map[key] = { date: d, category: cat, actual: 0, projection: 0, covered: false });
  }

  const last = end < today ? end : today;
  budgets
    .filter((b) => b.active)
    .forEach((b) => {
      const from = [start, b.start].sort().pop()!;
      const to = [last, b.end || last].sort()[0];
      listDates(from, to).forEach((d) => {
        const daysInMonth = Number(monthEnd(d.slice(0, 7)).slice(8));
        cell(d, b.category).projection += b.frequency === 'daily' ? b.amount : b.amount / daysInMonth;
      });
    });

  expenses
    .filter((x) => !x.void)
    .forEach((x) => {
      const a = x.periodStart || x.date;
      const b = x.periodEnd || x.date;
      const n = Math.max(1, daysBetween(a, b));
      if (b < start || a > last) return;
      listDates(a > start ? a : start, b < last ? b : last).forEach((d) => {
        const v = cell(d, x.category);
        v.actual += Number(x.amount || 0) / n;
        if (x.coverageComplete !== false) v.covered = true;
      });
    });

  const daily = Object.values(map).map((x) => ({
    ...x,
    used: x.actual + (x.covered ? 0 : x.projection),
  }));

  const groups: Record<string, { month: string; category: string; actual: number; projection: number; used: number }> = {};
  daily.forEach((x) => {
    const key = x.date.slice(0, 7) + '|' + x.category.toLowerCase();
    const g = groups[key] || (groups[key] = { month: x.date.slice(0, 7), category: x.category, actual: 0, projection: 0, used: 0 });
    g.actual += x.actual;
    g.projection += x.projection;
    g.used += x.used;
  });

  const rows = Object.values(groups);
  return {
    rows,
    daily,
    actual: rows.reduce((a, x) => a + x.actual, 0),
    projection: rows.reduce((a, x) => a + x.projection, 0),
    used: rows.reduce((a, x) => a + x.used, 0),
  };
}

export function calculateCashView(state: ErpDatabaseState, today: string) {
  const ledger = state.Ledger || [];
  const expenses = (state.Expenses || []).filter((x) => !x.void && !x.nonCash);
  const purchases = (state.Purchases || []).filter((x) => !x.void);
  const opening = ledger.find((x) => x.kind === 'opening');

  const bills = [
    ...expenses.map((x) => ({
      id: x.id,
      date: x.date,
      category: x.category,
      supplier: '',
      total: x.amount,
      paidBeforeOpening: x.paidBeforeOpening || 0,
      payments: x.payments || [],
      kind: 'expense' as const,
    })),
    ...purchases.map((x) => ({
      id: x.id,
      date: x.date,
      category: '',
      supplier: x.supplier || 'Supplier',
      total: x.total,
      paidBeforeOpening: 0,
      payments: x.payments || [],
      kind: 'purchase' as const,
    })),
  ];

  const payments = bills.flatMap((x) =>
    (x.payments || []).map((y) => ({
      ...y,
      bill: x.id,
      category: x.category || 'Stock purchase',
    }))
  );

  const bank = opening
    ? ledger
        .filter((x) => x.date >= opening.date && x.date <= today)
        .reduce((s, x) => s + Number(x.signed || 0), 0) -
      payments
        .filter((x) => x.date >= opening.date && x.date <= today)
        .reduce((s, x) => s + Number(x.amount || 0), 0)
    : null;

  const pending = ledger
    .filter(
      (x) =>
        x.kind === 'transferPending' &&
        !ledger.some((y) => y.kind === 'transferReceived' && y.reference === x.reference)
    )
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const balance = (state.Checks || []).find((x) => x.id === 'courier-balance');
  const courier = balance?.needsRefresh ? null : balance?.amount ?? null;
  const upcoming = bills
    .map((x) => ({
      ...x,
      outstanding: Math.max(
        0,
        x.total -
          (x.paidBeforeOpening || 0) -
          (x.payments || []).reduce((a, y) => a + Number(y.amount || 0), 0)
      ),
    }))
    .filter((x) => x.outstanding > 0.005);

  return {
    bank,
    courier,
    balanceUpdated: balance?.updated || '',
    balanceNeedsRefresh: !!balance?.needsRefresh,
    available: bank !== null && courier !== null ? bank + courier : null,
    pending,
    upcoming,
    upcomingTotal: upcoming.reduce((a, x) => a + x.outstanding, 0),
    ledger: ledger.slice().reverse(),
    payments,
    purchases: purchases.slice().reverse(),
    openingDate: opening?.date || '',
  };
}

export function calculateInventoryMetrics(
  state: ErpDatabaseState,
  filter: { product?: string; category?: string },
  today: string
) {
  const settings = defaultSettings(state.Settings?.[0]);
  const cat = buildCatalog(state.Products, state.Combos, state.Orders, state.Stock, state.Purchases, today);
  const st = calculateStocks(state.Products, state.Orders, state.Stock, state.Purchases, today);
  const start30 = addDays(today, -29);
  const usage: Record<string, number> = {};
  const lastSale: Record<string, string> = {};

  (state.Orders || [])
    .filter(
      (o) =>
        o.date >= V2_CONFIG.cutoff &&
        o.date <= today &&
        ['Delivered', 'Partial'].includes(o.status) &&
        !(o.status === 'Partial' && !o.itemsVerified)
    )
    .forEach((o) => {
      const parts = calculateOrderParts(o);
      parts.forEach((l) => {
        if (l.qty > 0) {
          lastSale[l.sku] = !lastSale[l.sku] || lastSale[l.sku] < o.date ? o.date : lastSale[l.sku];
          if (o.date >= start30) usage[l.sku] = (usage[l.sku] || 0) + l.qty;
        }
      });

      (o.lines || [])
        .filter((l) => (l.components || []).some((c) => c.sku !== l.sku))
        .forEach((l) => {
          (l.components || []).forEach((c) => {
            const qty = c.qty * (l.qty - (o.status === 'Partial' ? l.returned || 0 : 0));
            const cap = getOrderComponents(o.lines)[c.sku] || 1;
            const ret =
              o.status === 'Partial'
                ? (((o.financialReturns || {})[c.sku] || 0) * c.qty * l.qty) / cap
                : 0;
            const net = Math.max(0, qty - ret);
            if (net > 0) {
              lastSale[c.sku] = !lastSale[c.sku] || lastSale[c.sku] < o.date ? o.date : lastSale[c.sku];
              if (o.date >= start30) usage[c.sku] = (usage[c.sku] || 0) + net;
            }
          });
        });
    });

  const firstDate =
    (state.Orders || [])
      .filter((o) => o.date >= V2_CONFIG.cutoff)
      .map((o) => o.date)
      .sort()[0] || today;

  const rows = cat
    .filter(
      (x) =>
        x.active !== false &&
        (!filter.product || x.id === filter.product) &&
        (!filter.category || x.category === filter.category)
    )
    .map((x) => {
      const base = st[x.id];
      const lead = x.leadDays ?? settings.leadDays;
      const qty = x.stock;
      const cost = x.cost !== null && x.cost !== undefined ? Number(x.cost) : null;
      const rate = (usage[x.id] || 0) / Math.max(1, Math.min(30, daysBetween(firstDate, today)));
      const coverage = rate ? qty / rate : null;
      const observedFrom = x.created ? x.created.slice(0, 10) : firstDate;
      const noSaleSince = lastSale[x.id] || observedFrom;
      const dead = qty > 0 && daysBetween(noSaleSince, today) > settings.deadDays;
      const verified = base
        ? base.verified
        : (x.components || []).every((c) => st[c.sku]?.verified);

      return {
        ...x,
        qty,
        value: cost === null ? null : qty * cost,
        coverage,
        lead,
        low: qty <= (x.reorder || 0),
        dead,
        lastSale: lastSale[x.id] || '',
        reorderNow: qty <= (x.reorder || 0) || (coverage !== null && coverage <= lead),
        recommended: rate ? Math.max(0, Math.ceil(rate * (lead + settings.stockTargetDays) - qty)) : null,
        verified,
      };
    });

  const physical = rows.filter((x) => !x.components);
  return {
    rows,
    totalItems: physical.length,
    activeProducts: rows.length,
    comboCount: rows.length - physical.length,
    totalQty: physical.reduce((a, x) => a + Number(x.qty || 0), 0),
    value: physical.some((x) => x.value === null)
      ? null
      : physical.reduce((a, x) => a + Number(x.value || 0), 0),
    low: rows.filter((x) => x.low).length,
    dead: physical.filter((x) => x.dead).length,
    deadValue: physical.filter((x) => x.dead).reduce((a, x) => a + Number(x.value || 0), 0),
    unverified: rows.filter((x) => !x.verified).length,
    componentValueOnly: !!(filter.product && rows.some((x) => x.components)),
  };
}

export interface DashboardFilter {
  start: string;
  end: string;
  district?: string;
  category?: string;
  product?: string;
  marketplace?: string;
  customerType?: string;
  query?: string;
  groupBy?: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
}

interface StatBucket {
  id?: string;
  name: string;
  orders: number;
  sales: number;
  modernSales: number;
  qty: number;
  returnQty: number;
  returnQtyUnknown: boolean;
  fees: number;
  gross: number | null;
  contribution: number;
  estimate: number;
  incomplete: number;
  delivered: number;
  partial: number;
  returned: number;
  cancelled: number;
  pending: number;
  finalized: number;
  soldOrders: number;
  partialUnverified: number;
  conflicts: number;
  historyIncomplete: number;
  customers: Record<string, boolean>;
  returnRate: number | null;
  cancelRate: number | null;
  problemRate: number | null;
  partialRate: number | null;
  aov: number | null;
  repeatRate: number | null;
  net?: number | null;
  projectedNet?: number | null;
  displayNet?: number | null;
  historical?: boolean;
  closed?: boolean;
  actualExpense?: number;
  estimatedExpense?: number;
  byMonth?: Record<string, StatBucket>;
}

function makeStatBucket(name: string): StatBucket {
  return {
    name,
    orders: 0,
    sales: 0,
    modernSales: 0,
    qty: 0,
    returnQty: 0,
    returnQtyUnknown: false,
    fees: 0,
    gross: 0,
    contribution: 0,
    estimate: 0,
    incomplete: 0,
    delivered: 0,
    partial: 0,
    returned: 0,
    cancelled: 0,
    pending: 0,
    finalized: 0,
    soldOrders: 0,
    partialUnverified: 0,
    conflicts: 0,
    historyIncomplete: 0,
    customers: {},
    returnRate: null,
    cancelRate: null,
    problemRate: null,
    partialRate: null,
    aov: null,
    repeatRate: null,
  };
}

function finalizeBucketMetrics(g: StatBucket): StatBucket {
  g.returnRate = g.finalized ? (g.returned / g.finalized) * 100 : null;
  g.cancelRate = g.finalized ? (g.cancelled / g.finalized) * 100 : null;
  g.problemRate = g.finalized ? ((g.returned + g.cancelled) / g.finalized) * 100 : null;
  g.partialRate = g.finalized ? (g.partial / g.finalized) * 100 : null;
  g.aov = g.soldOrders ? g.sales / g.soldOrders : null;
  const vals = Object.values(g.customers || {});
  g.repeatRate = vals.length ? (vals.filter(Boolean).length / vals.length) * 100 : null;
  return g;
}

export function computeDashboardAnalytics(state: ErpDatabaseState, filter: DashboardFilter, today: string) {
  const settings = defaultSettings(state.Settings?.[0]);
  const allOrders = state.Orders || [];
  const types = computeCustomerTypes(allOrders);
  const catalog = buildCatalog(state.Products, state.Combos, state.Orders, state.Stock, state.Purchases, today);
  const closedMonths = new Set((state.Months || []).filter((m) => m.closed).map((m) => m.id));

  const p = {
    start: filter.start || today.slice(0, 7) + '-01',
    end: filter.end || today,
    district: filter.district || '',
    category: filter.category || '',
    product: filter.product || '',
    marketplace: filter.marketplace || '',
    customerType: filter.customerType || '',
    query: (filter.query || '').toLowerCase().trim(),
    groupBy: filter.groupBy || 'Daily',
  };

  const filteredLines = !!(p.product || p.category);
  const segmented = filteredLines || !!(p.district || p.marketplace || p.customerType || p.query);

  const maps: Record<'days' | 'months' | 'districts' | 'products' | 'statuses' | 'marketplaces', Record<string, StatBucket>> = {
    days: {},
    months: {},
    districts: {},
    products: {},
    statuses: {},
    marketplaces: {},
  };

  const group = (k: keyof typeof maps, n: string) => maps[k][n] || (maps[k][n] = makeStatBucket(n));
  const totalBucket = makeStatBucket('Total');
  const globalByMonth: Record<string, number> = {};

  const matchOrder = (o: OrderRecord) => {
    const src = o.source === 'Steadfast import' ? 'Old Data' : o.source || 'Unknown';
    const cType = types[o.id] || 'Unknown';
    if (p.district && (o.district || 'Unknown') !== p.district) return false;
    if (p.marketplace && src !== p.marketplace) return false;
    if (p.customerType && cType !== p.customerType) return false;
    if (
      p.query &&
      ![o.name, o.phone, o.invoice, o.cid, o.tracking, o.id, o.district].join(' ').toLowerCase().includes(p.query)
    ) {
      return false;
    }
    return true;
  };

  const matchPart = (l: { sku: string; category: string }) =>
    (!p.product || l.sku === p.product) && (!p.category || l.category === p.category);

  function addOrderToBucket(g: StatBucket, o: OrderRecord, eventDate: string, partsSlice: ReturnType<typeof calculateOrderParts> | null) {
    const f = calculateOrderFinance(o);
    const allParts = calculateOrderParts(o);
    const ratio = partsSlice ? partsSlice.reduce((a, l) => a + Number(l.share || 0), 0) : 1;

    g.orders++;
    const ph = normalizePhone(o.phone);
    if (ph) {
      if (!(ph in g.customers)) g.customers[ph] = false;
      if (types[o.id] === 'Repeat') g.customers[ph] = true;
    }
    if (isFinalStatus(o.status)) g.finalized++;
    const stKey = ({ Delivered: 'delivered', Partial: 'partial', Returned: 'returned', Cancelled: 'cancelled' } as const)[
      o.status as 'Delivered' | 'Partial' | 'Returned' | 'Cancelled'
    ];
    if (stKey) g[stKey]++;
    else g.pending++;

    if (['Delivered', 'Partial'].includes(o.status) && f.sales !== null) g.soldOrders++;
    if (o.status === 'Partial' && (!o.amountVerified || !o.itemsVerified)) g.partialUnverified++;
    if (o.approvalConflict) g.conflicts++;
    if (f.historical && isFinalStatus(o.status) && !f.known) g.historyIncomplete++;

    g.sales += Number(f.sales || 0) * ratio;
    g.modernSales += f.historical ? 0 : Number(f.sales || 0) * ratio;
    g.fees += Number(f.fee || 0) * ratio;

    const facts = partsSlice || allParts;
    g.qty += facts.reduce((a, l) => a + Number(l.qty || 0), 0);
    facts.forEach((l) => {
      g.returnQty += Number(l.returned || 0);
      if (l.returned === null) g.returnQtyUnknown = true;
    });

    if (!f.historical && isFinalStatus(o.status)) {
      const known =
        f.sales !== null &&
        f.fee !== null &&
        (partsSlice ? partsSlice.length > 0 && partsSlice.every((l) => l.cogs !== null) : f.cogs !== null);
      if (!known || o.approvalConflict) {
        g.incomplete++;
      } else {
        const gross = partsSlice ? partsSlice.reduce((a, l) => a + Number(l.gross || 0), 0) : Number(f.gross || 0);
        g.gross = (g.gross || 0) + gross;
        g.contribution += gross - Number(f.fee || 0) * ratio;
      }
    }
    g.estimate += Number(f.estimate || 0) * ratio;
  }

  // Event-dated orders for sales/profit recognition
  allOrders.forEach((o) => {
    const evDate = getEventDate(o);
    if (!evDate || evDate < p.start || evDate > p.end) return;
    const f = calculateOrderFinance(o);
    const m = evDate.slice(0, 7);
    if (!f.historical) {
      globalByMonth[m] = (globalByMonth[m] || 0) + Number(f.sales || 0);
    }
    if (!matchOrder(o)) return;
    const allParts = calculateOrderParts(o);
    const parts = allParts.filter(matchPart);
    if (filteredLines && !parts.length) return;
    const slice = filteredLines ? parts : null;

    addOrderToBucket(totalBucket, o, evDate, slice);
    addOrderToBucket(group('days', evDate), o, evDate, slice);
    addOrderToBucket(group('months', m), o, evDate, slice);
    addOrderToBucket(group('statuses', o.status), o, evDate, slice);

    const src = o.source === 'Steadfast import' ? 'Old Data' : o.source || 'Unknown';
    const distBucket = group('districts', o.district || 'Unknown');
    addOrderToBucket(distBucket, o, evDate, slice);
    distBucket.byMonth = distBucket.byMonth || {};
    addOrderToBucket(distBucket.byMonth[m] || (distBucket.byMonth[m] = makeStatBucket(m)), o, evDate, slice);

    const mktBucket = group('marketplaces', src);
    addOrderToBucket(mktBucket, o, evDate, slice);
    mktBucket.byMonth = mktBucket.byMonth || {};
    addOrderToBucket(mktBucket.byMonth[m] || (mktBucket.byMonth[m] = makeStatBucket(m)), o, evDate, slice);

    parts.forEach((l) => {
      const prodBucket = group('products', l.sku);
      addOrderToBucket(prodBucket, o, evDate, [l]);
      prodBucket.byMonth = prodBucket.byMonth || {};
      addOrderToBucket(prodBucket.byMonth[m] || (prodBucket.byMonth[m] = makeStatBucket(m)), o, evDate, [l]);
    });
  });

  const dateList = listDates(p.start, p.end);
  dateList.forEach((dt) => group('days', dt));
  [...new Set(dateList.map((x) => x.slice(0, 7)))].forEach((m) => group('months', m));

  // Created orders count by creation date
  const createdOrders = allOrders.filter((o) => {
    if (o.date < p.start || o.date > p.end) return false;
    if (!matchOrder(o)) return false;
    if (filteredLines) {
      const parts = calculateOrderParts(o).filter(matchPart);
      if (!parts.length) return false;
    }
    return true;
  });

  totalBucket.orders = createdOrders.length;
  Object.values(maps.days).forEach((d) => {
    d.orders = 0;
  });
  createdOrders.forEach((o) => {
    if (maps.days[o.date]) maps.days[o.date].orders++;
  });

  // Expenses & monthly allocation
  const expTotals = calculateExpenseTotals(
    state.Expenses || [],
    state.Budgets || [],
    p.start < V2_CONFIG.cutoff ? V2_CONFIG.cutoff : p.start,
    p.end,
    today
  );

  const monthExpenses: Record<string, { actual: number; used: number }> = {};
  expTotals.daily
    .filter((x) => x.date >= p.start && x.date <= p.end)
    .forEach((x) => {
      const mk = x.date.slice(0, 7);
      const g = monthExpenses[mk] || (monthExpenses[mk] = { actual: 0, used: 0 });
      g.actual += Number(x.actual || 0);
      g.used += closedMonths.has(mk) ? Number(x.actual || 0) : Number(x.used || 0);
    });

  const months = Object.values(maps.months).sort((a, b) => a.name.localeCompare(b.name));
  let allocatedActual = 0;
  let allocatedUsed = 0;

  const getAllocated = (gm: StatBucket, m: string, isSegment: boolean) => {
    const x = monthExpenses[m] || { actual: 0, used: 0 };
    const share = isSegment ? (globalByMonth[m] > 0 ? (gm.modernSales || 0) / globalByMonth[m] : 0) : 1;
    return { actual: x.actual * share, used: x.used * share };
  };

  months.forEach((m) => {
    const a = getAllocated(m, m.name, segmented);
    const historical = m.name < V2_CONFIG.cutoff.slice(0, 7);
    const isClosed = closedMonths.has(m.name);
    m.historical = historical;
    m.closed = isClosed;
    m.actualExpense = a.actual;
    m.estimatedExpense = a.used;
    m.net = historical || !isClosed || m.incomplete ? null : m.contribution - a.actual;
    m.projectedNet = historical ? null : m.contribution - a.used;
    m.displayNet = historical
      ? m.estimate
      : isClosed && !m.incomplete
      ? m.contribution - a.actual
      : m.contribution - a.used;
    allocatedActual += a.actual;
    allocatedUsed += a.used;
    finalizeBucketMetrics(m);
  });

  const modernMonths = months.filter((m) => !m.historical);
  const historyMonths = months.filter((m) => m.historical);
  const modernComplete = modernMonths.length > 0 && modernMonths.every((m) => m.closed && !m.incomplete);
  const modernActual = modernComplete
    ? modernMonths.reduce((a, m) => a + m.contribution - (m.actualExpense || 0), 0)
    : null;
  const modernEstimated = modernMonths.length
    ? modernMonths.reduce((a, m) => a + m.contribution - (m.estimatedExpense || 0), 0)
    : 0;
  const historyEstimate = historyMonths.reduce((a, m) => a + m.estimate, 0);

  let displayNet: number | null = historyMonths.length
    ? historyEstimate + (modernComplete && modernActual !== null ? modernActual : modernEstimated)
    : modernComplete
    ? modernActual
    : modernEstimated;

  let displayNetLabel = historyMonths.length
    ? modernMonths.length
      ? 'Includes historical estimates'
      : `Historical data estimated at ${V2_CONFIG.historicalRate}%`
    : modernComplete
    ? 'Actual'
    : 'Estimated';

  // Selected delivered & pending amounts
  const selectedEventOrders = allOrders.filter((o) => {
    const ev = getEventDate(o);
    return ev >= p.start && ev <= p.end && matchOrder(o) && (!filteredLines || calculateOrderParts(o).some(matchPart));
  });

  const getRatio = (o: OrderRecord) =>
    filteredLines
      ? calculateOrderParts(o)
          .filter(matchPart)
          .reduce((a, l) => a + l.share, 0)
      : 1;

  const deliveredAmount = selectedEventOrders
    .filter((o) => o.status === 'Delivered')
    .reduce((a, o) => a + Number(calculateOrderFinance(o).sales || 0) * getRatio(o), 0);

  const pendingOrders = createdOrders.filter(
    (o) => !['Delivered', 'Partial', 'Returned', 'Cancelled', 'Draft'].includes(o.status)
  );
  const pendingAmount = pendingOrders.some((o) => o.cod === null)
    ? null
    : pendingOrders.reduce((a, o) => a + Number(o.cod || 0) * getRatio(o), 0);

  const missingDelivery = allOrders.filter(
    (o) =>
      ['Delivered', 'Partial'].includes(o.status) &&
      !getDeliveryDay(o) &&
      matchOrder(o) &&
      o.date <= p.end
  ).length;

  const finalRows = selectedEventOrders.filter((o) => isFinalStatus(o.status));
  const chargeMissing = finalRows.filter((o) => calculateOrderFinance(o).fee === null).length;

  if (totalBucket.incomplete || totalBucket.historyIncomplete || missingDelivery) {
    displayNet = null;
    displayNetLabel = 'Incomplete data';
    if (totalBucket.incomplete || missingDelivery) {
      totalBucket.gross = null;
    }
  }

  (['districts', 'products', 'marketplaces'] as const).forEach((k) => {
    Object.values(maps[k]).forEach((g) => {
      let act = 0;
      let est = 0;
      Object.entries(g.byMonth || {}).forEach(([m, gm]) => {
        const a = getAllocated(gm, m, true);
        act += a.actual;
        est += a.used;
      });
      g.net = g.incomplete ? null : g.contribution - act;
      g.projectedNet = g.incomplete ? null : g.contribution - est;
      finalizeBucketMetrics(g);
    });
  });

  const days = Object.values(maps.days)
    .map(finalizeBucketMetrics)
    .sort((a, b) => a.name.localeCompare(b.name));
  const districts = Object.values(maps.districts)
    .map(finalizeBucketMetrics)
    .sort((a, b) => b.sales - a.sales);
  const products = Object.values(maps.products)
    .map((g) => {
      g.id = g.name;
      g.name = catalog.find((c) => c.id === g.id)?.name || g.id;
      return finalizeBucketMetrics(g);
    })
    .sort((a, b) => b.sales - a.sales);
  const statuses = Object.values(maps.statuses).map(finalizeBucketMetrics);
  const marketplaces = Object.values(maps.marketplaces)
    .map(finalizeBucketMetrics)
    .sort((a, b) => b.sales - a.sales);

  finalizeBucketMetrics(totalBucket);

  // Target calculations for current month
  const currentMonth = today.slice(0, 7);
  const targetAmount = Number(
    settings.monthTargets?.[currentMonth] ?? settings.salesTarget ?? 0
  );
  const achievedThisMonth = allOrders
    .filter(
      (o) =>
        getDeliveryDay(o).slice(0, 7) === currentMonth &&
        getDeliveryDay(o) <= today &&
        ['Delivered', 'Partial'].includes(o.status)
    )
    .reduce((a, o) => a + Number(calculateOrderFinance(o).sales || 0), 0);
  const remainingTarget = Math.max(0, targetAmount - achievedThisMonth);
  const remainingDays = Math.max(1, listDates(today, monthEnd(currentMonth)).length);
  const requiredPerDay = remainingTarget / remainingDays;

  // Group chart days
  const chartDays = groupChartPeriods(days, p.groupBy, requiredPerDay);

  // Options for dropdowns
  const options = {
    districts: [...new Set(allOrders.map((o) => o.district || 'Unknown').filter(Boolean))].sort(),
    categories: [...new Set(catalog.map((x) => x.category).filter(Boolean))].sort(),
    marketplaces: [...new Set(['Facebook', 'Website', 'WhatsApp', 'Phone', 'Walk-in', 'Old Data', 'Other'])].sort(),
    months: [...new Set(allOrders.map((o) => o.date.slice(0, 7)).concat(today.slice(0, 7)))].sort().reverse(),
  };

  return {
    ...totalBucket,
    deliveredAmount,
    pending: pendingOrders.length,
    pendingAmount,
    missingDelivery,
    chargeMissing,
    displayNet,
    displayNetLabel,
    displayMargin: totalBucket.sales && displayNet !== null ? (displayNet / totalBucket.sales) * 100 : null,
    historicalRate: V2_CONFIG.historicalRate,
    days,
    chartDays,
    months,
    districts,
    products,
    statuses,
    marketplaces,
    expenses: {
      rows: expTotals.rows,
      allocatedActual,
      allocatedUsed,
    },
    inventory: calculateInventoryMetrics(state, p, today),
    cash: calculateCashView(state, today),
    target: {
      month: currentMonth,
      amount: targetAmount,
      achieved: achievedThisMonth,
      remaining: remainingTarget,
      required: requiredPerDay,
      days: remainingDays,
    },
    options,
    filter: p,
    segmented,
  };
}

function groupChartPeriods(
  rows: StatBucket[],
  kind: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly',
  requiredPerDay: number
) {
  if (kind === 'Daily') {
    return rows.map((x) => ({
      name: x.name,
      label: x.name.slice(5),
      range: x.name,
      sales: x.sales,
      orders: x.orders,
      required: requiredPerDay,
    }));
  }
  const by = new Map<
    string,
    { name: string; first: string; last: string; sales: number; orders: number; daysCount: number }
  >();
  rows.forEach((r) => {
    const day = new Date(r.name + 'T00:00:00Z');
    const year = r.name.slice(0, 4);
    const month = r.name.slice(0, 7);
    let key: string;
    if (kind === 'Weekly') {
      const offset = (day.getUTCDay() + 6) % 7;
      key = addDays(r.name, -offset);
    } else if (kind === 'Monthly') {
      key = month;
    } else if (kind === 'Quarterly') {
      key = year + '-Q' + Math.ceil(Number(r.name.slice(5, 7)) / 3);
    } else {
      key = year;
    }
    if (!by.has(key)) {
      by.set(key, { name: key, first: r.name, last: r.name, sales: 0, orders: 0, daysCount: 0 });
    }
    const g = by.get(key)!;
    g.last = r.name;
    g.sales += r.sales || 0;
    g.orders += r.orders || 0;
    g.daysCount += 1;
  });
  return [...by.values()].map((g, i) => ({
    name: g.name,
    label:
      kind === 'Weekly'
        ? 'W' + (i + 1)
        : kind === 'Monthly'
        ? monthLabel(g.name)
        : kind === 'Quarterly'
        ? g.name.slice(5) + '-' + g.name.slice(2, 4)
        : g.name,
    range: `${g.first} to ${g.last}`,
    sales: g.sales,
    orders: g.orders,
    required: requiredPerDay * g.daysCount,
  }));
}

export function computeMonthReview(state: ErpDatabaseState, month: string, today: string) {
  const start = month + '-01';
  const end = monthEnd(month);
  const all = state.Orders || [];
  const relevant = all.filter(
    (o) =>
      ((getEventDate(o) >= start && getEventDate(o) <= end) ||
        (['Delivered', 'Partial'].includes(o.status) && !getDeliveryDay(o) && o.date <= end)) &&
      o.status !== 'Draft'
  );
  const incomplete = relevant
    .filter((o) => !calculateOrderFinance(o).known || o.approvalConflict || !getEventDate(o))
    .map((o) => ({
      id: o.id,
      name: o.name,
      invoice: o.invoice,
      status: o.status,
      reason: !getEventDate(o)
        ? 'Delivery date missing'
        : calculateOrderFinance(o).reason || 'Approval conflict',
    }));

  const expenses = calculateExpenseTotals(state.Expenses || [], state.Budgets || [], start, end, today);
  const summary = computeDashboardAnalytics(state, { start, end }, today);
  const existing = (state.Months || []).find((m) => m.id === month) || null;

  return {
    month,
    start,
    end,
    canClose: today >= end && incomplete.length === 0,
    openTooEarly: today < end,
    incomplete,
    expenses,
    existing,
    summary,
  };
}

export function computeGuidanceSuggestions(
  state: ErpDatabaseState,
  filter: DashboardFilter,
  today: string
): SuggestionItem[] {
  const d = computeDashboardAnalytics(state, filter, today);
  const items: SuggestionItem[] = [];
  const add = (
    id: string,
    priority: 'High' | 'Medium' | 'Low',
    title: string,
    what: string,
    why: string,
    next: string,
    page: string,
    check?: 'orders' | 'ads' | 'bank'
  ) => {
    items.push({ id, priority, title, what, why, next, page, check });
  };

  const missingDate = (state.Orders || []).filter(
    (o) => ['Delivered', 'Partial'].includes(o.status) && !getDeliveryDay(o)
  );
  if (missingDate.length) {
    add(
      'missing-delivery',
      'High',
      'Delivery dates are missing',
      `${missingDate.length} delivered/partial orders have no verified delivery date.`,
      'They cannot be placed in the correct sales day or month.',
      'Import the delivery-date column or enter the verified date in the order.',
      'Orders'
    );
  }

  if (d.incomplete) {
    add(
      'incomplete-profit',
      'High',
      'Complete profit inputs',
      `${d.incomplete} finalized orders have incomplete costs, charges or approval information.`,
      'A complete profit figure cannot be calculated from those records.',
      'Assign products, verify courier charges and review partial collections.',
      'Orders'
    );
  }

  if (d.inventory.low) {
    add(
      'low-stock',
      'High',
      'Review low stock items',
      `${d.inventory.low} products/combos are at or below the reorder point.`,
      'Availability may limit new order fulfillment.',
      'Check physical quantities and reorder items with high velocity.',
      'Inventory'
    );
  }

  if (d.inventory.dead) {
    add(
      'dead-stock',
      'Medium',
      'Review slow / dead stock',
      `${d.inventory.dead} items hold ${formatMoney(d.inventory.deadValue)} without recent recorded sales.`,
      'Working capital remains tied up in slow-moving home decor inventory.',
      'Test a combo bundle or promotional clearance offer.',
      'Inventory'
    );
  }

  if (d.problemRate !== null && d.problemRate > 10) {
    add(
      'high-returns',
      'High',
      'Review returns and cancellations',
      `${d.problemRate.toFixed(1)}% of finalized selected orders were returned or cancelled.`,
      'Returns consume courier charges and delay stock availability.',
      'Review district performance, packaging protection, and customer phone confirmation.',
      'Orders'
    );
  }

  if (d.cash.bank === null) {
    add(
      'opening-bank',
      'Medium',
      'Enter opening bank balance',
      'Bank balance tracking is not initialized yet.',
      'Courier COD collections do not automatically reflect actual cash in bank.',
      'Record your verified opening bank balance and date in Purchases & Bank.',
      'Purchases & Bank'
    );
  }

  if (!d.cash.balanceUpdated) {
    add(
      'courier-balance',
      'Low',
      'Refresh Steadfast courier balance',
      'No recent courier requestable balance has been synced.',
      'Available cash combines bank funds and requestable courier balance.',
      'Use Check Balance in Courier or Purchases & Bank.',
      'Courier'
    );
  }

  const prevMonth = addDays(today.slice(0, 7) + '-01', -1).slice(0, 7);
  if (
    prevMonth >= '2026-09' &&
    !(state.Months || []).some((m) => m.id === prevMonth && m.closed)
  ) {
    add(
      'close-month-' + prevMonth,
      'High',
      `Review & close month: ${monthLabel(prevMonth)}`,
      `${monthLabel(prevMonth)} accounts are still open.`,
      'Closing locks reconciled expenses and finalizes monthly net profit.',
      'Open Month Closing to review unresolved orders and lock the period.',
      'Month Closing'
    );
  }

  return items;
}

export function buildCustomersList(orders: OrderRecord[]) {
  const map: Record<
    string,
    {
      id: string;
      name: string;
      phone: string;
      district: string;
      orders: number;
      delivered: number;
      sales: number;
      lastDate: string;
      type: 'New' | 'Repeat';
    }
  > = {};

  orders.forEach((o) => {
    const ph = normalizePhone(o.phone);
    const id = ph ? 'PHONE-' + ph : 'GUEST-' + o.id;
    const c =
      map[id] ||
      (map[id] = {
        id,
        name: o.name,
        phone: ph,
        district: o.district || 'Unknown',
        orders: 0,
        delivered: 0,
        sales: 0,
        lastDate: o.date,
        type: 'New',
      });
    c.orders++;
    c.type = c.orders > 1 ? 'Repeat' : 'New';
    const f = calculateOrderFinance(o);
    if (f.sales !== null) c.sales += f.sales;
    if (o.status === 'Delivered') c.delivered++;
    if (o.date >= c.lastDate) {
      c.name = o.name;
      c.lastDate = o.date;
      if (o.district) c.district = o.district;
    }
  });

  return Object.values(map).sort((a, b) => b.orders - a.orders || b.sales - a.sales);
}

// Minimal CSV & XLSX Parser + Safe Merge Preview from Shoukhin v2.2.0
export function parseCsvString(csvText: string): Record<string, string>[] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows.shift()!.map((h) => h.trim());
  return rows.map((r) => Object.fromEntries(headers.map((k, idx) => [k, r[idx] ?? ''])));
}

export async function readXlsxFile(file: File): Promise<Record<string, string>[]> {
  if (file.size > 10_000_000) throw new Error('XLSX exceeds 10 MB');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const v = new DataView(bytes.buffer);
  const decoder = new TextDecoder();
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('Invalid XLSX ZIP file');
  let at = v.getUint32(end + 16, true);
  const count = v.getUint16(end + 10, true);
  const entries: Record<string, { method: number; size: number; uncompressed: number; offset: number }> = {};

  for (let i = 0; i < count; i++) {
    if (v.getUint32(at, true) !== 0x02014b50) throw new Error('Invalid ZIP index');
    const method = v.getUint16(at + 10, true);
    const size = v.getUint32(at + 20, true);
    const uncompressed = v.getUint32(at + 24, true);
    const nl = v.getUint16(at + 28, true);
    const el = v.getUint16(at + 30, true);
    const cl = v.getUint16(at + 32, true);
    const offset = v.getUint32(at + 42, true);
    const name = decoder.decode(bytes.slice(at + 46, at + 46 + nl));
    entries[name] = { method, size, uncompressed, offset };
    at += 46 + nl + el + cl;
  }

  async function xml(name: string) {
    const entry = entries[name];
    if (!entry) return null;
    const o = entry.offset;
    const begin = o + 30 + v.getUint16(o + 26, true) + v.getUint16(o + 28, true);
    let data: Uint8Array = bytes.slice(begin, begin + entry.size);
    if (entry.method === 8) {
      data = new Uint8Array(
        await new Response(new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
      );
    } else if (entry.method !== 0) {
      throw new Error('Unsupported XLSX compression. Please export as CSV.');
    }
    return new DOMParser().parseFromString(decoder.decode(data), 'application/xml');
  }

  const shared = await xml('xl/sharedStrings.xml');
  const strings = shared
    ? Array.from(shared.getElementsByTagName('si')).map((si) =>
        Array.from(si.getElementsByTagName('t'))
          .map((t) => t.textContent)
          .join('')
      )
    : [];
  const sheet = await xml('xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('First worksheet missing in XLSX.');

  const rows = Array.from(sheet.getElementsByTagName('row')).map((rowEl) => {
    const out: string[] = [];
    Array.from(rowEl.getElementsByTagName('c')).forEach((c) => {
      const ref = c.getAttribute('r')?.replace(/\d/g, '') || 'A';
      let col = 0;
      for (const ch of ref) col = col * 26 + ch.charCodeAt(0) - 64;
      const t = c.getAttribute('t');
      const value = c.getElementsByTagName('v')[0]?.textContent || '';
      out[col - 1] =
        t === 's'
          ? strings[Number(value)] || ''
          : t === 'inlineStr'
          ? Array.from(c.getElementsByTagName('t'))
              .map((x) => x.textContent)
              .join('')
          : value;
    });
    return out;
  });

  const h = rows.shift() || [];
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) =>
      Object.fromEntries(
        h.map((k, i) => {
          let x = r[i] ?? '';
          if (['Created At', 'Approved At', 'Delivery Time'].includes(k) && /^\d+(\.\d+)?$/.test(x)) {
            x = new Date((Number(x) - 25569) * 86400000).toISOString().replace('T', ' ').replace('Z', '');
          }
          return [k, x];
        })
      )
    );
}

export function previewSteadfastImport(
  rawRows: Record<string, string>[],
  existingOrders: OrderRecord[]
) {
  const errors: { row: number; error: string }[] = [];
  const problems: { row: number; error: string }[] = [];
  const stage: OrderRecord[] = [];
  const seen = new Set<string>();
  const trackingSeen = new Set<string>();
  let duplicates = 0;

  rawRows.forEach((r, idx) => {
    try {
      const cid = String(r['Order ID'] || r['Consignment ID'] || '').trim();
      const tracking = String(r['Tracking Code'] || '').trim();
      if (!cid && !tracking) throw new Error('Consignment ID and tracking code both missing');
      const createdRaw = String(r['Created At'] || r['Date'] || '').trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(createdRaw)) throw new Error('Invalid Created At date: ' + createdRaw);

      const delivered = normalizeStatus(r['Delivery Status'] || r['Status']);
      const approval = normalizeStatus(r['Approval Status'] || r['Delivery Status'] || r['Status']);
      const id = cid ? 'SF-' + cid : 'SF-T-' + tracking;

      if (seen.has(id) || (tracking && trackingSeen.has(tracking))) {
        duplicates++;
        return;
      }
      seen.add(id);
      if (tracking) trackingSeen.add(tracking);

      const parseOptNum = (v: string | undefined) => {
        if (v === undefined || v === '' || /^null$/i.test(v)) return null;
        const n = Number(String(v).replace(/,/g, ''));
        return Number.isFinite(n) ? n : null;
      };

      const address = String(r['Recipient Address'] || r['Address'] || '').trim();
      const deliveredAtRaw = String(r['Delivery Time'] || r['Delivered At'] || r['Delivery Date'] || '').trim();

      stage.push({
        id,
        cid,
        tracking,
        invoice: String(r['Invoice'] || id).trim(),
        date: createdRaw,
        name: String(r['Recipient Name'] || r['Customer Name'] || 'Guest').trim(),
        phone: normalizePhone(r['Recipient Phone'] || r['Phone']),
        address,
        district: String(r['District'] || '').trim() || districtHint(address),
        districtInferred: !String(r['District'] || '').trim(),
        thana: String(r['Thana'] || '').trim(),
        total: parseOptNum(r['COD Amount']),
        cod: parseOptNum(r['COD Amount']),
        shippingCharge: parseOptNum(r['Shipping Charge']),
        codCharge: parseOptNum(r['COD Charge']),
        returnCharge: parseOptNum(r['Return Charge']) ?? 0,
        status: delivered,
        approval: String(r['Approval Status'] || ''),
        approvalConflict: Boolean(r['Approval Status']) && delivered !== approval,
        courierPayment: String(r['Payment Status'] || ''),
        source: 'Old Data',
        paymentStatus: 'Unknown',
        paymentMethod: 'Cash on Delivery',
        note: String(r['Note'] || '').trim(),
        createdAt: String(r['Created At'] || createdRaw),
        deliveredAt: deliveredAtRaw ? deliveredAtRaw.slice(0, 10) : '',
        approvedAt: String(r['Approved At'] || ''),
        lines: [],
        stockReturns: {},
        stockReserved: true,
        dispatched: ['Delivered', 'Partial', 'Returned'].includes(delivered),
        revision: 1,
        imported: true,
        amountVerified: false,
        itemsVerified: false,
      });
    } catch (e) {
      errors.push({ row: idx + 2, error: e instanceof Error ? e.message : String(e) });
    }
  });

  const byCid: Record<string, OrderRecord> = {};
  const byTracking: Record<string, OrderRecord> = {};
  const byId: Record<string, OrderRecord> = {};
  existingOrders.forEach((o) => {
    if (o.cid) byCid[o.cid] = o;
    if (o.tracking) byTracking[o.tracking] = o;
    byId[o.id] = o;
  });

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  const mergedOrders: OrderRecord[] = [];

  stage.forEach((n, i) => {
    const a = n.cid ? byCid[n.cid] : null;
    const b = n.tracking ? byTracking[n.tracking] : null;
    const c = byId[n.id] || null;
    const found = [a, b, c].filter(Boolean) as OrderRecord[];
    const ids = [...new Set(found.map((x) => x.id))];
    if (ids.length > 1) {
      problems.push({ row: i + 2, error: 'Consignment ID / tracking code match different saved orders.' });
      return;
    }
    const existing = found[0] || null;
    if (!existing) {
      added++;
      mergedOrders.push(n);
      return;
    }

    const merged: OrderRecord = {
      ...existing,
      ...n,
      id: existing.id,
      lines: existing.lines || [],
      stockReturns: existing.stockReturns || {},
      district: existing.district || n.district,
      thana: existing.thana || n.thana,
      amountVerified: !!existing.amountVerified,
      financialReturns: existing.financialReturns || {},
      itemsVerified: !!existing.itemsVerified,
      finalAmount: existing.finalAmount,
      lastSync: existing.lastSync,
      bookingState: existing.bookingState,
      source: existing.source,
      customerType: existing.customerType,
      customerTypeManual: existing.customerTypeManual,
      adAttributed: existing.adAttributed,
      dispatched: existing.dispatched || n.dispatched,
      total: n.total ?? existing.total,
      cod: n.cod ?? existing.cod,
      shippingCharge: n.shippingCharge ?? existing.shippingCharge,
      codCharge: n.codCharge ?? existing.codCharge,
      deliveredAt: n.deliveredAt || existing.deliveredAt || '',
      returnCharge: n.returnCharge || existing.returnCharge || 0,
      revision: (existing.revision || 1) + 1,
    };

    const diffKeys: (keyof OrderRecord)[] = [
      'cid',
      'tracking',
      'invoice',
      'date',
      'name',
      'phone',
      'address',
      'district',
      'total',
      'cod',
      'shippingCharge',
      'codCharge',
      'returnCharge',
      'status',
      'deliveredAt',
    ];
    const hasDiff = diffKeys.some((k) => JSON.stringify(existing[k] ?? null) !== JSON.stringify(merged[k] ?? null));
    if (hasDiff) {
      updated++;
      mergedOrders.push(merged);
    } else {
      unchanged++;
    }
  });

  const dates = stage.map((o) => o.date).sort();
  return {
    count: stage.length,
    duplicates,
    errors,
    problems,
    newCount: added,
    updatedCount: updated,
    unchangedCount: unchanged,
    start: dates[0] || '',
    end: dates[dates.length - 1] || '',
    mergedOrders,
  };
}

// Real Shoukhin Home Decor Data Seeder (111 Real Products & 1,731 Real Orders)
export function generateShoukhinDemoData(today: string): Partial<ErpDatabaseState> {
  const monthStart = today.slice(0, 7) + '-01';

  const combos: ComboRecord[] = [
    {
      id: 'COMBO-a77ed91c',
      name: '1000tk 11item combo',
      price: 1000,
      active: true,
      components: [
        { sku: 'SKU-70e12cf5', qty: 1 },
        { sku: 'LIGHT-7-FT', qty: 1 },
        { sku: 'SKU-9fe677dc', qty: 3 },
        { sku: 'SKU-03d0e66b', qty: 1 },
        { sku: 'SKU-4a797a95', qty: 3 },
        { sku: 'SKU-4d4022d3', qty: 3 },
        { sku: 'SWEET-HOME-SQUIR', qty: 1 },
        { sku: 'PVC-SINGLE', qty: 1 },
      ],
    },
  ];

  const stock: StockRecord[] = REAL_SHOUKHIN_PRODUCTS.map((p) => ({
    id: p.id,
    date: monthStart,
    qty: p.legacyStock || 50,
    included: {},
    movements: [],
    provisional: false,
    updated: new Date().toISOString(),
  }));

  const checks: CheckRecord[] = [
    {
      id: 'courier-balance',
      amount: 41634,
      updated: new Date().toISOString(),
      needsRefresh: false,
    },
    {
      id: 'bank-balance',
      amount: 154200,
      updated: new Date().toISOString(),
      needsRefresh: false,
    },
  ];

  return {
    Products: REAL_SHOUKHIN_PRODUCTS,
    Combos: combos,
    Stock: stock,
    Orders: REAL_SHOUKHIN_ORDERS,
    Budgets: [],
    Expenses: [],
    AdDaily: [],
    Ledger: [],
    Checks: checks,
    Settings: [defaultSettings()],
  };
}
