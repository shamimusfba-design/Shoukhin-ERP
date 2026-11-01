export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';

export type OrderStatus =
  | 'Draft'
  | 'Confirmed'
  | 'In Review'
  | 'Pending'
  | 'Shipped'
  | 'Hold'
  | 'Delivered Approval Pending'
  | 'Partial Approval Pending'
  | 'Cancelled Approval Pending'
  | 'Delivered'
  | 'Partial'
  | 'Cancelled'
  | 'Returned'
  | 'Unknown';

export type ErpTableName =
  | 'Orders'
  | 'Products'
  | 'Combos'
  | 'Stock'
  | 'Expenses'
  | 'Budgets'
  | 'Purchases'
  | 'Ledger'
  | 'Months'
  | 'Checks'
  | 'AdDaily'
  | 'Settings'
  | 'Log'
  | 'Tasks'
  | 'ProductMeta';

export interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderComponentSnapshot {
  sku: string;
  qty: number;
  cost: number | null;
}

export interface OrderLineItem {
  sku: string;
  name: string;
  category: string;
  qty: number;
  price: number;
  cost: number | null;
  returned: number;
  components?: OrderComponentSnapshot[];
}

export interface OrderRecord {
  id: string;
  cid?: string;
  tracking?: string;
  invoice: string;
  date: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  districtInferred?: boolean;
  thana?: string;
  total: number | null;
  cod: number | null;
  shippingCharge: number | null;
  codCharge: number | null;
  returnCharge: number;
  status: OrderStatus;
  rawStatus?: string;
  approval?: string;
  approvalConflict?: boolean;
  courierPayment?: string;
  source: string;
  paymentStatus: string;
  paymentMethod?: string;
  note: string;
  createdAt: string;
  deliveredAt?: string;
  approvedAt?: string;
  lines: OrderLineItem[];
  stockReturns: Record<string, number>;
  financialReturns?: Record<string, number>;
  stockReserved: boolean;
  dispatched: boolean;
  revision: number;
  imported?: boolean;
  amountVerified: boolean;
  itemsVerified: boolean;
  finalAmount?: number | null;
  adAttributed?: boolean;
  customerType?: 'New' | 'Repeat' | 'Unknown';
  customerTypeManual?: boolean;
  bookingState?: 'booked' | 'uncertain' | 'retry-confirmed' | '';
  lastSync?: string;
  syncError?: string;
  requestId?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: string;
  cost: number | null;
  price: number;
  legacyStock: number;
  reorder: number;
  leadDays?: number;
  active: boolean;
  created?: string;
}

export interface ComboComponent {
  sku: string;
  qty: number;
}

export interface ComboRecord {
  id: string;
  name: string;
  price: number;
  components: ComboComponent[];
  active: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  cost: number | null;
  price: number;
  stock: number;
  reorder?: number;
  leadDays?: number;
  active: boolean;
  components?: ComboComponent[];
  created?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  qty: number;
  note: string;
}

export interface StockRecord {
  id: string;
  date: string;
  qty: number;
  included: Record<string, number | null>;
  movements: StockMovement[];
  purchaseIds?: string[];
  provisional?: boolean;
  updated?: string;
}

export interface BillPayment {
  id: string;
  date: string;
  amount: number;
  account: string;
  reference?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  category: string;
  marketplace?: string;
  amount: number;
  coverageComplete: boolean;
  note: string;
  void?: boolean;
  dueDate?: string;
  paidBeforeOpening?: number;
  payments?: BillPayment[];
  nonCash?: boolean;
  metaManaged?: boolean;
  damageSku?: string;
  damageQty?: number;
}

export interface BudgetRecord {
  id: string;
  category: string;
  frequency: 'daily' | 'monthly';
  amount: number;
  start: string;
  end?: string;
  active: boolean;
}

export interface PurchaseLine {
  sku: string;
  name: string;
  qty: number;
  cost: number;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  receivedDate: string;
  supplier: string;
  reference: string;
  dueDate?: string;
  lines: PurchaseLine[];
  total: number;
  note: string;
  payments: BillPayment[];
  void?: boolean;
  created: string;
}

export type CashTransactionKind =
  | 'opening'
  | 'investment'
  | 'withdrawal'
  | 'deposit'
  | 'transferPending'
  | 'transferReceived'
  | 'adjustmentIn'
  | 'adjustmentOut'
  | 'customerReceipt';

export interface LedgerRecord {
  id: string;
  date: string;
  kind: CashTransactionKind;
  amount: number;
  signed: number;
  reference: string;
  note: string;
  created: string;
}

export interface MonthCloseRecord {
  id: string; // YYYY-MM
  closed: boolean;
  closedAt?: string;
  reopenedAt?: string;
  reason?: string;
  confirmedExpenses?: boolean;
  gross?: number | null;
  contribution?: number | null;
  expenses?: number;
  net?: number | null;
}

export interface CheckRecord {
  id: string;
  kind?: string;
  date?: string;
  amount?: number;
  updated?: string;
  needsRefresh?: boolean;
  note?: string;
}

export interface AdDailyRecord {
  id: string;
  account: string;
  date: string;
  usd: number;
  rate: number;
  vat: number;
  amount: number;
  messages: number | null;
  origin: string;
  updated: string;
}

export interface SettingsRecord {
  id: string;
  businessName: string;
  subdomain?: string;
  profitRate: number;
  deadDays: number;
  leadDays: number;
  stockTargetDays: number;
  reminderHour: number;
  minSample: number;
  salesTarget: number;
  cashReserve: number;
  metaAccount: string;
  metaVersion: string;
  usdRate: number;
  vatRate: number;
  sfKey?: string;
  sfSecret?: string;
  metaToken?: string;
  logo?: string;
  monthTargets?: Record<string, number>;
}

export interface LogRecord {
  id: string;
  time: string;
  type: string;
  message: string;
  actor?: string;
}

export interface ErpDatabaseState {
  Orders: OrderRecord[];
  Products: ProductRecord[];
  Combos: ComboRecord[];
  Stock: StockRecord[];
  Expenses: ExpenseRecord[];
  Budgets: BudgetRecord[];
  Purchases: PurchaseRecord[];
  Ledger: LedgerRecord[];
  Months: MonthCloseRecord[];
  Checks: CheckRecord[];
  AdDaily: AdDailyRecord[];
  Settings: SettingsRecord[];
  Log: LogRecord[];
}

export interface SuggestionItem {
  id: string;
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  what: string;
  why: string;
  next: string;
  page: string;
  check?: 'orders' | 'ads' | 'bank';
}
