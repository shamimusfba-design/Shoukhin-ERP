import {
  ErpDatabaseState,
  ProductRecord,
  ComboRecord,
  OrderRecord,
  ExpenseRecord,
  BudgetRecord,
  PurchaseRecord,
  MonthCloseRecord,
  StockRecord,
  SettingsRecord,
  LedgerRecord,
  AdDailyRecord,
  CheckRecord,
} from '../types/erp';

export const OMNIFLOW_PRODUCTS: ProductRecord[] = [
  {
    id: 'OMNI-TECH-01',
    name: 'OmniBook Pro 16" - M3 Ultra',
    category: 'Electronics',
    cost: 1450,
    price: 2199,
    legacyStock: 45,
    reorder: 10,
    active: true,
  },
  {
    id: 'OMNI-TECH-02',
    name: 'Aura Wireless ANC Studio Headphones',
    category: 'Audio',
    cost: 110,
    price: 249,
    legacyStock: 120,
    reorder: 25,
    active: true,
  },
  {
    id: 'OMNI-HOME-01',
    name: 'ErgoComfort Executive Mesh Chair',
    category: 'Furniture',
    cost: 180,
    price: 389,
    legacyStock: 60,
    reorder: 15,
    active: true,
  },
  {
    id: 'OMNI-HOME-02',
    name: 'Nordic Solid Oak Minimalist Desk',
    category: 'Furniture',
    cost: 290,
    price: 649,
    legacyStock: 35,
    reorder: 8,
    active: true,
  },
  {
    id: 'OMNI-TECH-03',
    name: 'UltraWide 38" Curved Studio Monitor 144Hz',
    category: 'Electronics',
    cost: 520,
    price: 899,
    legacyStock: 50,
    reorder: 12,
    active: true,
  },
  {
    id: 'OMNI-STYLE-01',
    name: 'Apex Italian Full-Grain Leather Briefcase',
    category: 'Accessories',
    cost: 85,
    price: 219,
    legacyStock: 90,
    reorder: 20,
    active: true,
  },
  {
    id: 'OMNI-TECH-04',
    name: 'OmniCharge 100W GaN Fast Charger Matrix',
    category: 'Accessories',
    cost: 22,
    price: 69,
    legacyStock: 250,
    reorder: 50,
    active: true,
  },
  {
    id: 'OMNI-HOME-03',
    name: 'Smart Ambient LED Bar Light with WiFi',
    category: 'Home Decor',
    cost: 32,
    price: 89,
    legacyStock: 180,
    reorder: 30,
    active: true,
  },
  {
    id: 'OMNI-TECH-05',
    name: 'StudioPro 4K HDR Webcam with Stereo Mic',
    category: 'Electronics',
    cost: 65,
    price: 149,
    legacyStock: 140,
    reorder: 25,
    active: true,
  },
  {
    id: 'OMNI-STYLE-02',
    name: 'Thermal Travel Flask 750ml Titanium Finish',
    category: 'Lifestyle',
    cost: 14,
    price: 39,
    legacyStock: 300,
    reorder: 60,
    active: true,
  },
];

export const OMNIFLOW_COMBOS: ComboRecord[] = [
  {
    id: 'COMBO-WORKSTATION-PRO',
    name: 'Executive Studio Setup Bundle',
    price: 1899,
    active: true,
    components: [
      { sku: 'OMNI-TECH-03', qty: 1 },
      { sku: 'OMNI-HOME-01', qty: 1 },
      { sku: 'OMNI-TECH-05', qty: 1 },
      { sku: 'OMNI-TECH-04', qty: 1 },
    ],
  },
  {
    id: 'COMBO-NOMAD-PACK',
    name: 'Creator Mobile Travel Pack',
    price: 499,
    active: true,
    components: [
      { sku: 'OMNI-TECH-02', qty: 1 },
      { sku: 'OMNI-STYLE-01', qty: 1 },
      { sku: 'OMNI-TECH-04', qty: 1 },
      { sku: 'OMNI-STYLE-02', qty: 1 },
    ],
  },
];

export function generateOmniFlowDemoData(): ErpDatabaseState {
  const customers = [
    { name: 'Alexander Wright', phone: '+1 415-882-9012', city: 'San Francisco, CA', addr: '500 Howard St, Ste 400', courier: 'FedEx Express', trk: 'FDX-882901' },
    { name: 'Sophia Chen', phone: '+1 206-554-1234', city: 'Seattle, WA', addr: '1201 3rd Ave, Fl 18', courier: 'UPS Next Day', trk: '1Z99999999' },
    { name: 'Michael Hernandez', phone: '+1 512-409-7711', city: 'Austin, TX', addr: '100 Congress Ave', courier: 'DHL Express', trk: 'DHL-409771' },
    { name: 'Emily Davis', phone: '+1 212-701-3344', city: 'New York, NY', addr: '350 5th Ave, Fl 24', courier: 'FedEx Ground', trk: 'FDX-701334' },
    { name: 'David Miller', phone: '+1 312-689-5520', city: 'Chicago, IL', addr: '233 S Wacker Dr', courier: 'UPS Ground', trk: '1Z88888888' },
    { name: 'Olivia Taylor', phone: '+1 305-920-4100', city: 'Miami, FL', addr: '701 Brickell Ave', courier: 'FedEx Express', trk: 'FDX-920410' },
    { name: 'James Anderson', phone: '+1 617-331-8900', city: 'Boston, MA', addr: '200 Clarendon St', courier: 'UPS 2-Day Air', trk: '1Z77777777' },
    { name: 'Lucas Martin', phone: '+1 720-491-6677', city: 'Denver, CO', addr: '1801 California St', courier: 'FedEx Ground', trk: 'FDX-491667' },
  ];

  const now = new Date();
  const orders: OrderRecord[] = [];

  const statuses: OrderRecord['status'][] = [
    'Delivered', 'Delivered', 'Delivered', 'Delivered',
    'Shipped', 'Confirmed', 'Pending', 'Returned'
  ];

  for (let i = 1; i <= 60; i++) {
    const cust = customers[i % customers.length];
    const daysAgo = Math.floor(Math.random() * 25);
    const orderDate = new Date(now.getTime() - daysAgo * 86400000);
    const dateStr = orderDate.toISOString().split('T')[0];
    const isCombo = i % 5 === 0;
    const prod = OMNIFLOW_PRODUCTS[i % OMNIFLOW_PRODUCTS.length];
    const combo = OMNIFLOW_COMBOS[i % OMNIFLOW_COMBOS.length];

    const lines = isCombo
      ? [{
          sku: combo.id,
          name: combo.name,
          category: 'Bundle',
          qty: 1,
          price: combo.price,
          cost: 750,
          returned: 0,
        }]
      : [{
          sku: prod.id,
          name: prod.name,
          category: prod.category,
          qty: Math.random() > 0.7 ? 2 : 1,
          price: prod.price,
          cost: prod.cost,
          returned: 0,
        }];

    const subtotal = lines.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = 25;
    const total = subtotal + shipping;
    const status = statuses[i % statuses.length];

    // For booked orders
    const isBooked = i <= 50;

    orders.push({
      id: `ORD-2026-${String(1000 + i)}`,
      cid: isBooked ? `CID-${800000 + i}` : undefined,
      tracking: isBooked ? `${cust.trk}-${100 + i}` : undefined,
      invoice: `INV-US-${202600 + i}`,
      date: dateStr,
      deliveredAt: status === 'Delivered' ? dateStr : undefined,
      approvedAt: status !== 'Pending' ? dateStr : undefined,
      name: cust.name,
      phone: cust.phone,
      address: cust.addr,
      district: cust.city,
      total,
      cod: status === 'Delivered' ? total : (status === 'Returned' ? 0 : total),
      shippingCharge: shipping,
      codCharge: 5,
      returnCharge: 0,
      status,
      source: i % 2 === 0 ? 'Online Web Store' : 'Wholesale Direct',
      paymentStatus: status === 'Delivered' ? 'Paid' : 'Pending',
      paymentMethod: 'Credit Card (Stripe)',
      note: 'Processed via OmniFlow Global Enterprise',
      createdAt: dateStr,
      lines,
      stockReturns: {},
      stockReserved: true,
      dispatched: status === 'Delivered' || status === 'Shipped',
      revision: 1,
      amountVerified: true,
      itemsVerified: true,
      bookingState: isBooked ? 'booked' : '',
    });
  }

  // Generate Ad Daily Data for the last 30 days
  const adDaily: AdDailyRecord[] = [];
  for (let d = 29; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];
    const usd = Math.round(180 + Math.random() * 120);
    const messages = Math.round(35 + Math.random() * 45);
    adDaily.push({
      id: `AD-${dayDate}`,
      account: 'OmniFlow US Performance Matrix',
      date: dayDate,
      usd,
      rate: 1,
      vat: 0,
      amount: usd,
      messages,
      origin: 'Meta Graph API',
      updated: dayDate,
    });
  }

  const expenses: ExpenseRecord[] = [
    { id: 'EXP-01', date: now.toISOString().split('T')[0], periodStart: now.toISOString().split('T')[0], periodEnd: now.toISOString().split('T')[0], category: 'Ads', amount: 3500, coverageComplete: true, note: 'Meta & Google Ads Campaign USA' },
    { id: 'EXP-02', date: now.toISOString().split('T')[0], periodStart: now.toISOString().split('T')[0], periodEnd: now.toISOString().split('T')[0], category: 'Logistics', amount: 1450, coverageComplete: true, note: 'FedEx Commercial Fulfillment Fee' },
    { id: 'EXP-03', date: now.toISOString().split('T')[0], periodStart: now.toISOString().split('T')[0], periodEnd: now.toISOString().split('T')[0], category: 'Cloud Infrastructure', amount: 620, coverageComplete: true, note: 'AWS & Firebase Dedicated Instances' },
    { id: 'EXP-04', date: now.toISOString().split('T')[0], periodStart: now.toISOString().split('T')[0], periodEnd: now.toISOString().split('T')[0], category: 'Rent', amount: 2800, coverageComplete: true, note: 'Silicon Valley Innovation Hub Lease' },
    { id: 'EXP-05', date: now.toISOString().split('T')[0], periodStart: now.toISOString().split('T')[0], periodEnd: now.toISOString().split('T')[0], category: 'Salaries', amount: 12500, coverageComplete: true, note: 'Core Operations & Support Team' },
  ];

  const budgets: BudgetRecord[] = [
    { id: 'BUD-01', category: 'Marketing', frequency: 'monthly', amount: 8000, start: now.toISOString().slice(0, 7) + '-01', active: true },
    { id: 'BUD-02', category: 'Logistics', frequency: 'monthly', amount: 4000, start: now.toISOString().slice(0, 7) + '-01', active: true },
    { id: 'BUD-03', category: 'Software & Tools', frequency: 'monthly', amount: 1500, start: now.toISOString().slice(0, 7) + '-01', active: true },
  ];

  const purchases: PurchaseRecord[] = [
    {
      id: 'PO-01',
      date: now.toISOString().split('T')[0],
      receivedDate: now.toISOString().split('T')[0],
      supplier: 'Apex Silicon Tech',
      reference: 'PO-2026-US1',
      lines: [
        { sku: 'OMNI-TECH-01', name: 'OmniBook Pro 16"', qty: 10, cost: 1450 },
        { sku: 'OMNI-TECH-03', name: 'UltraWide 38" Curved Monitor', qty: 15, cost: 520 },
      ],
      total: 22300,
      note: 'Hardware supply Q1 invoice paid',
      payments: [
        { id: 'PAY-PO-01', date: now.toISOString().split('T')[0], amount: 22300, account: 'Silicon Valley Bank (SVB)' }
      ],
      created: now.toISOString().split('T')[0],
    },
    {
      id: 'PO-02',
      date: now.toISOString().split('T')[0],
      receivedDate: now.toISOString().split('T')[0],
      supplier: 'Nordic Designs Seattle',
      reference: 'PO-2026-US2',
      lines: [
        { sku: 'OMNI-HOME-01', name: 'ErgoComfort Executive Mesh Chair', qty: 25, cost: 180 },
        { sku: 'OMNI-HOME-02', name: 'Nordic Solid Oak Minimalist Desk', qty: 15, cost: 290 },
      ],
      total: 8850,
      note: 'Executive furniture batch replenishment',
      payments: [
        { id: 'PAY-PO-02', date: now.toISOString().split('T')[0], amount: 8850, account: 'JPMorgan Chase Operating' }
      ],
      created: now.toISOString().split('T')[0],
    },
  ];

  const ledger: LedgerRecord[] = [
    {
      id: 'LED-01',
      date: now.toISOString().slice(0, 7) + '-01',
      kind: 'opening',
      amount: 85000,
      signed: 85000,
      reference: 'SVB-OPEN-2026',
      note: 'Opening operating bank balance',
      created: now.toISOString().slice(0, 7) + '-01',
    },
    {
      id: 'LED-02',
      date: now.toISOString().split('T')[0],
      kind: 'customerReceipt',
      amount: 42500,
      signed: 42500,
      reference: 'STRIPE-PAYOUT-01',
      note: 'Online merchant checkout settlements',
      created: now.toISOString().split('T')[0],
    },
    {
      id: 'LED-03',
      date: now.toISOString().split('T')[0],
      kind: 'deposit',
      amount: 15000,
      signed: 15000,
      reference: 'WIRE-INV-SERIES-A',
      note: 'Enterprise capital buffer deposit',
      created: now.toISOString().split('T')[0],
    },
  ];

  const checks: CheckRecord[] = [
    { id: 'courier-balance', amount: 8450, date: now.toISOString().split('T')[0], note: 'FedEx & UPS Commercial balance ready for disbursement' },
  ];

  const months: MonthCloseRecord[] = [
    { id: now.toISOString().slice(0, 7), closed: false, gross: 85000, net: 42000 },
  ];

  // Map product inventory
  const stockIncluded: Record<string, number> = {};
  OMNIFLOW_PRODUCTS.forEach((p) => {
    stockIncluded[p.id] = p.legacyStock;
  });

  const stockRecords: StockRecord[] = [
    {
      id: 'STOCK-AUDIT-01',
      date: now.toISOString().split('T')[0],
      qty: 1280,
      included: stockIncluded,
      movements: [
        { id: 'MOV-01', date: now.toISOString().split('T')[0], qty: 25, note: 'Warehouse intake batch verified' }
      ],
    },
  ];

  const settingsRecord: SettingsRecord = {
    id: 'SET-MAIN',
    businessName: 'OmniFlow Global Enterprise',
    subdomain: 'apex-erp-demo.web.app',
    profitRate: 35,
    deadDays: 45,
    leadDays: 7,
    stockTargetDays: 21,
    reminderHour: 10,
    minSample: 5,
    salesTarget: 100000,
    cashReserve: 25000,
    metaAccount: 'act_omniflow_global',
    metaVersion: 'v19.0',
    usdRate: 1,
    vatRate: 0,
  };

  return {
    Orders: orders,
    Products: OMNIFLOW_PRODUCTS,
    Combos: OMNIFLOW_COMBOS,
    Stock: stockRecords,
    Expenses: expenses,
    Budgets: budgets,
    Purchases: purchases,
    Ledger: ledger,
    Months: months,
    Checks: checks,
    AdDaily: adDaily,
    Settings: [settingsRecord],
    Log: [],
  };
}
