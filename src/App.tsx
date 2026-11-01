import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  Receipt,
  Landmark,
  CalendarCheck,
  Lightbulb,
  Users,
  Megaphone,
  Upload,
  Truck,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Moon,
  Bell,
  Plus,
  Search,
  Printer,
  RefreshCw,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Globe,
  HelpCircle,
} from 'lucide-react';
import {
  auth,
  db,
  ORG_ID,
  OWNER_EMAIL,
  OperationType,
  handleFirestoreError,
  saveErpRecord,
  batchSaveErpRecords,
  ensureUserProfile,
  updateTeamMemberRole,
  loginWithGoogle,
  logoutUser,
  makeErpDocId,
} from './firebase';
import {
  AdDailyRecord,
  BudgetRecord,
  CashTransactionKind,
  CatalogItem,
  ComboRecord,
  ErpDatabaseState,
  ErpTableName,
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
  TeamMember,
  UserRole,
} from './types/erp';
import {
  BANGLADESH_DISTRICTS,
  ORDER_SOURCES,
  ORDER_STATUSES,
  QUICK_DATES,
  V2_CONFIG,
  addDays,
  buildCatalog,
  buildCustomersList,
  calculateCashView,
  calculateInventoryMetrics,
  calculateOrderFinance,
  computeCustomerTypes,
  computeDashboardAnalytics,
  computeGuidanceSuggestions,
  computeMonthReview,
  defaultSettings,
  dhakaToday,
  districtHint,
  formatMoney,
  formatNum,
  formatPct,
  generateShoukhinDemoData,
  getDateRange,
  getOrderComponents,
  listDates,
  monthEnd,
  monthLabel,
  normalizePhone,
  normalizeStatus,
  parseCsvString,
  previewSteadfastImport,
  readXlsxFile,
} from './services/erpEngine';
import { PWAInstallButton, OfflineSyncBanner } from './components/PWAInstallButton';
import { DualAdGraph, ExpenseBars, Graph21 } from './components/Charts';

type NavPage =
  | 'Dashboard'
  | 'Orders'
  | 'Products & Combos'
  | 'Inventory'
  | 'Expenses'
  | 'Purchases & Bank'
  | 'Month Closing'
  | 'Suggestions'
  | 'Customers'
  | 'Ads'
  | 'Import'
  | 'Courier'
  | 'Team & Roles'
  | 'Settings'
  | 'Help';

const NAV_ITEMS: { id: NavPage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'Orders', label: 'Orders', icon: ShoppingBag },
  { id: 'Products & Combos', label: 'Products & Combos', icon: Package },
  { id: 'Inventory', label: 'Inventory', icon: Boxes },
  { id: 'Expenses', label: 'Expenses', icon: Receipt },
  { id: 'Purchases & Bank', label: 'Purchases & Bank', icon: Landmark },
  { id: 'Month Closing', label: 'Month Closing', icon: CalendarCheck },
  { id: 'Suggestions', label: 'Suggestions', icon: Lightbulb },
  { id: 'Customers', label: 'Customers', icon: Users },
  { id: 'Ads', label: 'Ads', icon: Megaphone },
  { id: 'Import', label: 'Import', icon: Upload },
  { id: 'Courier', label: 'Courier', icon: Truck },
  { id: 'Team & Roles', label: 'Team & Roles', icon: ShieldCheck },
  { id: 'Settings', label: 'Settings', icon: SettingsIcon },
  { id: 'Help', label: 'Help', icon: HelpCircle },
];

const EMPTY_DB: ErpDatabaseState = {
  Orders: [],
  Products: [],
  Combos: [],
  Stock: [],
  Expenses: [],
  Budgets: [],
  Purchases: [],
  Ledger: [],
  Months: [],
  Checks: [],
  AdDaily: [],
  Settings: [],
  Log: [],
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [myProfile, setMyProfile] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [erpState, setErpState] = useState<ErpDatabaseState>(EMPTY_DB);
  const [existingDocIds, setExistingDocIds] = useState<Set<string>>(new Set());
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // UI & Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('shd_theme');
    return saved ? saved === 'dark' : false;
  });
  const [page, setPage] = useState<NavPage>('Dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const today = useMemo(() => dhakaToday(), []);

  // Dashboard Filter State
  const [quickDate, setQuickDate] = useState('This Month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState(() => today.slice(0, 7) + '-01');
  const [endDate, setEndDate] = useState(() => today);
  const [districtFilter, setDistrictFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dashQuery, setDashQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'>('Daily');
  const [districtMetric, setDistrictMetric] = useState('sales');
  const [productMetric, setProductMetric] = useState('sales');

  // Orders Page State
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [pendingProductsOnly, setPendingProductsOnly] = useState(false);
  const [orderOffset, setOrderOffset] = useState(0);

  // Inventory Page State
  const [inventoryMode, setInventoryMode] = useState<'all' | 'low' | 'dead'>('all');

  // Month Closing State
  const [closingMonth, setClosingMonth] = useState(() => today.slice(0, 7));
  const [confirmMonthClose, setConfirmMonthClose] = useState(false);

  // Ads Page State
  const [adStart, setAdStart] = useState(() => today.slice(0, 7) + '-01');
  const [adEnd, setAdEnd] = useState(() => today);

  // Import Preview State
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewSteadfastImport> | null>(null);
  const [courierOutput, setCourierOutput] = useState<string>('');

  // Active Modals
  const [orderModal, setOrderModal] = useState<Partial<OrderRecord> | null>(null);
  const [productModal, setProductModal] = useState<Partial<ProductRecord> | null>(null);
  const [comboModal, setComboModal] = useState<Partial<ComboRecord> | null>(null);
  const [stockCountSku, setStockCountSku] = useState<string | null>(null);
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [expenseModal, setExpenseModal] = useState<Partial<ExpenseRecord> | null>(null);
  const [budgetModal, setBudgetModal] = useState<Partial<BudgetRecord> | null>(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [payBillModal, setPayBillModal] = useState<{
    id: string;
    kind: 'expense' | 'purchase';
    outstanding: number;
  } | null>(null);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<OrderRecord | null>(null);

  // Sync Dark Mode with HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('shd_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('shd_theme', 'light');
    }
  }, [darkMode]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 6000);
  };

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        try {
          const prof = await ensureUserProfile();
          setMyProfile(prof);
        } catch (err) {
          console.error(err);
        }
      } else {
        setMyProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Firestore Real-time Sync Listener (with offline persistence & pending writes indicator)
  useEffect(() => {
    if (!authReady || !user) {
      setErpState(EMPTY_DB);
      setDataLoaded(false);
      return;
    }

    const erpQuery = query(collection(db, 'erp_records'), where('orgId', '==', ORG_ID));
    const unsubErp = onSnapshot(
      erpQuery,
      { includeMetadataChanges: true },
      (snap) => {
        setHasPendingWrites(snap.metadata.hasPendingWrites);
        const next: ErpDatabaseState = {
          Orders: [],
          Products: [],
          Combos: [],
          Stock: [],
          Expenses: [],
          Budgets: [],
          Purchases: [],
          Ledger: [],
          Months: [],
          Checks: [],
          AdDaily: [],
          Settings: [],
          Log: [],
        };
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          ids.add(d.id);
          const data = d.data();
          const t = data.table as keyof ErpDatabaseState;
          if (t && Array.isArray(next[t]) && data.payload) {
            (next[t] as any[]).push(data.payload);
          }
        });
        setExistingDocIds(ids);
        setErpState(next);
        setDataLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'erp_records');
      }
    );

    const usersQuery = query(collection(db, 'users'), where('active', '==', true));
    const unsubUsers = onSnapshot(
      usersQuery,
      (snap) => {
        const members = snap.docs.map((d) => d.data() as TeamMember);
        setTeamMembers(members);
        if (user) {
          const mine = members.find((m) => m.uid === user.uid);
          if (mine) setMyProfile(mine);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    );

    return () => {
      unsubErp();
      unsubUsers();
    };
  }, [authReady, user]);

  // Derived Business Computations
  const settings = useMemo(() => defaultSettings(erpState.Settings?.[0]), [erpState.Settings]);
  const catalog = useMemo(
    () =>
      buildCatalog(
        erpState.Products,
        erpState.Combos,
        erpState.Orders,
        erpState.Stock,
        erpState.Purchases,
        today
      ),
    [erpState.Products, erpState.Combos, erpState.Orders, erpState.Stock, erpState.Purchases, today]
  );

  const dashboard = useMemo(
    () =>
      computeDashboardAnalytics(
        erpState,
        {
          start: startDate,
          end: endDate,
          district: districtFilter,
          category: categoryFilter,
          product: productFilter,
          marketplace: marketFilter,
          customerType: customerFilter,
          query: dashQuery,
          groupBy,
        },
        today
      ),
    [
      erpState,
      startDate,
      endDate,
      districtFilter,
      categoryFilter,
      productFilter,
      marketFilter,
      customerFilter,
      dashQuery,
      groupBy,
      today,
    ]
  );

  const suggestions = useMemo(
    () =>
      computeGuidanceSuggestions(
        erpState,
        {
          start: startDate,
          end: endDate,
          district: districtFilter,
          category: categoryFilter,
          product: productFilter,
          marketplace: marketFilter,
          customerType: customerFilter,
          query: dashQuery,
        },
        today
      ),
    [
      erpState,
      startDate,
      endDate,
      districtFilter,
      categoryFilter,
      productFilter,
      marketFilter,
      customerFilter,
      dashQuery,
      today,
    ]
  );

  const customersList = useMemo(() => buildCustomersList(erpState.Orders), [erpState.Orders]);
  const customerTypesMap = useMemo(() => computeCustomerTypes(erpState.Orders), [erpState.Orders]);

  const userRole: UserRole = useMemo(() => {
    if (user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) return 'owner';
    return myProfile?.role || 'staff';
  }, [user, myProfile]);

  const canWrite = userRole !== 'viewer';
  const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';

  // Push Notification Handler
  const enablePushNotifications = async () => {
    if (typeof Notification === 'undefined') {
      showToast('Browser notifications are not supported on this device.');
      return;
    }
    const perm = await Notification.requestPermission();
    setPushEnabled(perm === 'granted');
    if (perm === 'granted') {
      new Notification('Shoukhin Home Decor ERP', {
        body: `Push alerts active for ${settings.subdomain || 'erp.shoukhinhd.com'}. ${suggestions.length} priority insights ready.`,
        icon: '/pwa-192x192.png',
      });
      showToast('Push notifications enabled!');
    } else {
      showToast('Notification permission was not granted.');
    }
  };

  // Seed Sample Data for Shoukhin Home Decor
  const handleSeedDemoData = async () => {
    if (!canWrite) {
      showToast('Viewer role cannot modify records.');
      return;
    }
    setBusy(true);
    try {
      const demo = generateShoukhinDemoData(today);
      for (const [table, items] of Object.entries(demo)) {
        if (Array.isArray(items) && items.length) {
          await batchSaveErpRecords(table as ErpTableName, items as any[], existingDocIds);
        }
      }
      showToast('Shoukhin Home Decor sample data loaded into Firebase!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to seed data');
    } finally {
      setBusy(false);
    }
  };

  // Steadfast API Helper
  const callSteadfastApi = async (endpoint: string, method = 'GET', body?: Record<string, unknown>) => {
    if (!settings.sfKey || !settings.sfSecret) {
      throw new Error('Save your Steadfast API Key & Secret in Settings first.');
    }
    const res = await fetch('/api/steadfast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        method,
        sfKey: settings.sfKey,
        sfSecret: settings.sfSecret,
        body,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Steadfast API request failed');
    }
    return json.data;
  };

  const handleRefreshCourierBalance = async () => {
    setBusy(true);
    try {
      const r = await callSteadfastApi('/get_balance', 'GET');
      const balance = Number(r.current_balance);
      if (!Number.isFinite(balance)) throw new Error('Courier did not return a numeric current_balance');
      await saveErpRecord('Checks', {
        id: 'courier-balance',
        amount: balance,
        updated: new Date().toISOString(),
        needsRefresh: false,
      });
      showToast(`Steadfast balance updated: ${formatMoney(balance)}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateOrderStatus = async (order: OrderRecord) => {
    if (!order.cid && !order.tracking) {
      showToast('Consignment ID or tracking code missing.');
      return;
    }
    setBusy(true);
    try {
      const endpoint = order.cid
        ? `/status_by_cid/${encodeURIComponent(order.cid)}`
        : `/status_by_trackingcode/${encodeURIComponent(order.tracking!)}`;
      const r = await callSteadfastApi(endpoint, 'GET');
      if (!r.delivery_status) throw new Error('Delivery status absent in Steadfast response');
      const nextStatus = normalizeStatus(r.delivery_status);
      const updatedOrder: OrderRecord = {
        ...order,
        status: nextStatus,
        rawStatus: String(r.delivery_status),
        lastSync: new Date().toISOString(),
        dispatched:
          order.dispatched || ['Delivered', 'Partial', 'Shipped', 'Returned'].includes(nextStatus),
        revision: (order.revision || 1) + 1,
      };
      await saveErpRecord('Orders', updatedOrder);
      showToast(`Order ${order.invoice}: ${nextStatus}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleBookSteadfastOrder = async (order: OrderRecord) => {
    if (order.cid || order.tracking) {
      showToast('Order already linked to Steadfast tracking ' + (order.tracking || order.cid));
      return;
    }
    if (!order.lines?.length) {
      showToast('Assign at least one product or combo before booking.');
      return;
    }
    if (!/^01\d{9}$/.test(order.phone)) {
      showToast('Steadfast requires a valid 11-digit Bangladesh phone number (01XXXXXXXXX).');
      return;
    }
    setBusy(true);
    try {
      const r = await callSteadfastApi('/create_order', 'POST', {
        invoice: order.invoice,
        recipient_name: order.name,
        recipient_phone: order.phone,
        recipient_address: order.address,
        cod_amount: order.cod ?? order.total ?? 0,
        note: order.note || '',
      });
      if (!r.consignment?.consignment_id) {
        throw new Error('No consignment ID returned by Steadfast');
      }
      const bookedOrder: OrderRecord = {
        ...order,
        cid: String(r.consignment.consignment_id),
        tracking: String(r.consignment.tracking_code || ''),
        status: normalizeStatus(r.consignment.status || 'Pending'),
        stockReserved: true,
        bookingState: 'booked',
        lastSync: new Date().toISOString(),
        revision: (order.revision || 1) + 1,
      };
      await saveErpRecord('Orders', bookedOrder);
      showToast(`Booked in Steadfast! Tracking: ${bookedOrder.tracking}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // Filtered Orders for Orders Page
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
        customerType: customerTypesMap[o.id] || 'New',
        finance: calculateOrderFinance(o),
      })),
    };
  }, [erpState.Orders, orderQuery, orderStatusFilter, pendingProductsOnly, orderOffset, customerTypesMap]);

  // Auth Gate Screen
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
        <div className="flex items-center gap-3 text-sm font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Initializing Shoukhin Home Decor ERP…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-lg font-bold tracking-tight font-display whitespace-nowrap shrink-0">
            Shoukhin Home Decor
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <span className="whitespace-nowrap shrink-0">Inventory & Combos</span>
            <span className="whitespace-nowrap shrink-0">Steadfast Courier</span>
            <span className="whitespace-nowrap shrink-0">Real-Time Profit</span>
            <span className="whitespace-nowrap shrink-0">Offline Sync</span>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In with Google
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto w-full px-6 py-12 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              erp.shoukhinhd.com · Cloud ERP v2.2.0 · Asia/Dhaka (BDT ৳)
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-display text-slate-900 dark:text-white leading-tight">
              Manage orders, inventory, courier settlements, and net profit from any phone or desktop.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Built specifically for <strong>Shoukhin Home Decor</strong>. All your Google Apps Script v2.2.0 accounting rules, Steadfast XLSX/CSV safe imports, combo component tracking, and monthly closings — upgraded with real-time Firebase cloud sync, multi-user roles, and offline mobile support.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Continue with Google Account</span>
              </button>
              <PWAInstallButton />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Owner account ({OWNER_EMAIL}) is automatically granted full Owner privileges.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              What is included in v2.2.0 Cloud ERP
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <div className="py-3 flex justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">Mobile & Desktop Responsive</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">Thumb-zone navigation & sheets</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">Steadfast Courier Integration</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">1-tap booking, status & CSV/XLSX merge</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">Combo & Component Inventory</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">Dated physical counts & dead stock alerts</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">Accrual & Month Closing</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">Daily/monthly projections & net margin</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">Offline PWA + Push Alerts</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">Works without internet, syncs automatically</span>
              </div>
            </div>
          </div>
        </main>

        <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap justify-between gap-4">
          <span>Shoukhin Home Decor · erp.shoukhinhd.com</span>
          <span>Powered by Google Firebase Firestore & Authentication</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Printable Invoice Area (Visible only during window.print()) */}
      {printOrder && (
        <div id="printable-invoice" className="hidden print:block">
          <div className="border-b border-black pb-4 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{settings.businessName}</h1>
              <p className="text-sm">{settings.subdomain || 'erp.shoukhinhd.com'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold font-mono">INVOICE #{printOrder.invoice || printOrder.id}</h2>
              <p className="text-sm font-mono">Date: {printOrder.date}</p>
              <p className="text-sm font-mono">Tracking: {printOrder.tracking || 'Not booked'}</p>
            </div>
          </div>
          <div className="mb-6">
            <p className="font-semibold text-base">{printOrder.name}</p>
            <p className="font-mono text-sm">Phone: {printOrder.phone}</p>
            <p className="text-sm">{printOrder.address}</p>
            <p className="text-sm">District: {printOrder.district || '—'}</p>
          </div>
          <table className="w-full border-collapse border border-black text-sm mb-6">
            <thead>
              <tr className="border-b border-black">
                <th className="p-2 text-left border-r border-black">Item</th>
                <th className="p-2 text-right border-r border-black">Qty</th>
                <th className="p-2 text-right border-r border-black">Unit Price</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(printOrder.lines || []).map((l, idx) => (
                <tr key={idx} className="border-b border-black">
                  <td className="p-2 border-r border-black">{l.name}</td>
                  <td className="p-2 text-right font-mono border-r border-black">{l.qty}</td>
                  <td className="p-2 text-right font-mono border-r border-black">{formatMoney(l.price)}</td>
                  <td className="p-2 text-right font-mono">{formatMoney(l.qty * l.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center text-base font-bold font-mono">
            <span>Order Total: {formatMoney(printOrder.total)}</span>
            <span>COD to Collect: {formatMoney(printOrder.cod)}</span>
          </div>
          {printOrder.note && <p className="mt-4 text-sm">Note: {printOrder.note}</p>}
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight font-display text-slate-900 dark:text-white truncate">
            {settings.businessName}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.id === 'Suggestions' && suggestions.length > 0 && (
                  <span
                    className={`ml-auto font-mono text-[11px] ${
                      active ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {suggestions.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {user.email} · <span className="capitalize font-medium text-slate-700 dark:text-slate-200">{userRole}</span>
          </div>
          <button
            type="button"
            onClick={logoutUser}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Top Bar Contract: Zone 1 (Brand/Breadcrumb), Zone 2 (Quick Nav Links), Zone 3 (Primary CTA) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base font-bold tracking-tight font-display text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              {page}
            </span>
          </div>

          <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
            {(['Dashboard', 'Orders', 'Inventory', 'Purchases & Bank', 'Courier'] as NavPage[]).map((navItem) => (
              <button
                key={navItem}
                type="button"
                onClick={() => setPage(navItem)}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  page === navItem ? 'text-emerald-600 dark:text-emerald-400 font-semibold underline underline-offset-4' : ''
                }`}
              >
                {navItem}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
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
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
            )}
          </div>
        </header>

        {/* Sub-Toolbar for Theme, Push Alerts, PWA Install & Demo Seeder */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-mono">{settings.subdomain || 'erp.shoukhinhd.com'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{today}</span>
            <span aria-hidden="true">·</span>
            <span>{erpState.Orders.length} orders</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dataLoaded && erpState.Orders.length === 0 && erpState.Products.length === 0 && canWrite && (
              <button
                type="button"
                onClick={handleSeedDemoData}
                disabled={busy}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Data</span>
              </button>
            )}

            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Alerts ({suggestions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              aria-label="Toggle light or dark mode"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>

        {/* Toast Banner */}
        {toastMsg && (
          <div className="fixed top-16 right-4 z-50 max-w-sm rounded-xl bg-slate-900 dark:bg-emerald-600 text-white px-4 py-3 text-xs font-medium shadow-xl flex items-center justify-between gap-3">
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg('')}
              className="text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Notifications & Push Drawer */}
        {notificationsOpen && (
          <div className="mx-4 sm:mx-6 mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Operational Alerts & Push Notifications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time checks for low stock, missing delivery dates, and courier reconciliation
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!pushEnabled ? (
                  <button
                    type="button"
                    onClick={enablePushNotifications}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 cursor-pointer"
                  >
                    Enable Browser Push
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={enablePushNotifications}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Send Test Push
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No urgent operational alerts right now.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {s.priority} Priority · {s.page}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                        {s.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{s.what}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPage(s.page as NavPage);
                        setNotificationsOpen(false);
                      }}
                      className="self-start text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Open {s.page} →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {/* 1. DASHBOARD VIEW */}
          {page === 'Dashboard' && (
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
                    setInventoryMode('all');
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
                    setInventoryMode('low');
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
                            setOrderStatusFilter(st);
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
          )}

          {/* 2. ORDERS VIEW (Mobile Cards + Desktop Table) */}
          {page === 'Orders' && (
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
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                            {o.finance.reason ||
                              formatMoney(o.finance.historical ? o.finance.estimate : o.finance.gross)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                            {o.finance.historical
                              ? '—'
                              : o.finance.reason || formatMoney(o.finance.contribution)}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setOrderModal(o)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium cursor-pointer"
                            >
                              Open
                            </button>
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
            </div>
          )}

          {/* 3. PRODUCTS & COMBOS VIEW */}
          {page === 'Products & Combos' && (
            <div className="space-y-4">
              {canWrite && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setProductModal({ active: true, reorder: 5, leadDays: 7 })}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComboModal({ active: true, components: [{ sku: '', qty: 1 }] })}
                    className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Combo Bundle</span>
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-semibold">Products & Combos ({catalog.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                        <th className="py-3 px-4 font-medium">SKU / ID</th>
                        <th className="py-3 px-4 font-medium">Product / Combo Name</th>
                        <th className="py-3 px-4 font-medium">Category</th>
                        <th className="py-3 px-4 font-medium text-right">Purchase Cost</th>
                        <th className="py-3 px-4 font-medium text-right">Selling Price</th>
                        <th className="py-3 px-4 font-medium text-right">Available</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {catalog.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono text-slate-500">{p.id}</td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                          <td className="py-3 px-4">{p.category}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatMoney(p.cost)}</td>
                          <td className="py-3 px-4 text-right font-mono font-medium">{formatMoney(p.price)}</td>
                          <td className="py-3 px-4 text-right font-mono">{p.stock}</td>
                          <td className="py-3 px-4">{p.active ? 'Active' : 'Inactive'}</td>
                          <td className="py-3 px-4 text-right">
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (p.components) {
                                    const found = erpState.Combos.find((c) => c.id === p.id);
                                    if (found) setComboModal(found);
                                  } else {
                                    const found = erpState.Products.find((x) => x.id === p.id);
                                    if (found) setProductModal(found);
                                  }
                                }}
                                className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. INVENTORY VIEW */}
          {page === 'Inventory' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
                  {(['all', 'low', 'dead'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInventoryMode(m)}
                      className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                        inventoryMode === m
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {m === 'all' ? 'All Items' : m === 'low' ? `Low Stock (${dashboard.inventory.low})` : `Dead Stock (${dashboard.inventory.dead})`}
                    </button>
                  ))}
                </div>

                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPurchaseModalOpen(true)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
                    >
                      + Stock Purchase
                    </button>
                    <button
                      type="button"
                      onClick={() => setDamageModalOpen(true)}
                      className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
                    >
                      Record Damage
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Count available units excluding reserved parcels. Physical counts replace the baseline as of the count date.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                        <th className="py-3 px-4 font-medium">Product / Combo</th>
                        <th className="py-3 px-4 font-medium text-right">Available</th>
                        <th className="py-3 px-4 font-medium text-right">Stock Value</th>
                        <th className="py-3 px-4 font-medium">Last Sale</th>
                        <th className="py-3 px-4 font-medium">Health</th>
                        <th className="py-3 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dashboard.inventory.rows
                        .filter((r) => (inventoryMode === 'low' ? r.low : inventoryMode === 'dead' ? r.dead : true))
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold">{p.qty}</td>
                            <td className="py-3 px-4 text-right font-mono">
                              {p.components ? 'Shared components' : formatMoney(p.value)}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">{p.lastSale || '—'}</td>
                            <td className="py-3 px-4">
                              {p.low ? (
                                <span className="text-red-600 dark:text-red-400 font-medium">Low stock</span>
                              ) : p.dead ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">Dead stock</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">Healthy</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {canWrite && !p.components && (
                                <button
                                  type="button"
                                  onClick={() => setStockCountSku(p.id)}
                                  className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                                >
                                  Physical Count
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. EXPENSES VIEW */}
          {page === 'Expenses' && (
            <div className="space-y-6">
              {canWrite && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpenseModal({
                        date: today,
                        periodStart: today,
                        periodEnd: today,
                        category: 'Packing',
                        coverageComplete: true,
                      })
                    }
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
                  >
                    + Actual Expense
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBudgetModal({
                        category: 'Salary',
                        frequency: 'monthly',
                        start: '2026-09-01',
                        active: true,
                      })
                    }
                    className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
                  >
                    + Daily / Monthly Projection
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold">Actual Expenses ({erpState.Expenses.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                        <th className="py-3 px-4 font-medium">Coverage Period</th>
                        <th className="py-3 px-4 font-medium">Category</th>
                        <th className="py-3 px-4 font-medium">Marketplace</th>
                        <th className="py-3 px-4 font-medium text-right">Amount</th>
                        <th className="py-3 px-4 font-medium text-right">Paid</th>
                        <th className="py-3 px-4 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {erpState.Expenses.slice()
                        .reverse()
                        .map((x) => (
                          <tr key={x.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono">
                              {x.periodStart || x.date} → {x.periodEnd || x.date}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{x.category}</td>
                            <td className="py-3 px-4">{x.marketplace || 'Business-wide'}</td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                              {x.void ? 'Voided' : formatMoney(x.amount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {x.nonCash
                                ? 'Non-cash'
                                : formatMoney(
                                    (x.paidBeforeOpening || 0) +
                                      (x.payments || []).reduce((a, p) => a + p.amount, 0)
                                  )}
                            </td>
                            <td className="py-3 px-4 text-slate-500">{x.note}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold">Recurring Projections / Budgets ({erpState.Budgets.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                        <th className="py-3 px-4 font-medium">Category</th>
                        <th className="py-3 px-4 font-medium">Frequency</th>
                        <th className="py-3 px-4 font-medium text-right">Amount</th>
                        <th className="py-3 px-4 font-medium">Start</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {erpState.Budgets.map((b) => (
                        <tr key={b.id}>
                          <td className="py-3 px-4 font-medium">{b.category}</td>
                          <td className="py-3 px-4 capitalize">{b.frequency}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatMoney(b.amount)}</td>
                          <td className="py-3 px-4 font-mono">{b.start}</td>
                          <td className="py-3 px-4">{b.active ? 'Active' : 'Paused'}</td>
                          <td className="py-3 px-4 text-right">
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => setBudgetModal(b)}
                                className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. PURCHASES & BANK VIEW */}
          {page === 'Purchases & Bank' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold font-display">Cash & Bank Ledger</h2>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    Bank: {formatMoney(dashboard.cash.bank)} · Courier Requestable: {formatMoney(dashboard.cash.courier)} · Available: {formatMoney(dashboard.cash.available)}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPurchaseModalOpen(true)}
                      className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
                    >
                      + Stock Purchase
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashModalOpen(true)}
                      className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                    >
                      + Bank Ledger Entry
                    </button>
                  </div>
                )}
              </div>

              {dashboard.cash.upcoming.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold">Unpaid / Outstanding Bills</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                          <th className="py-3 px-4 font-medium">Date</th>
                          <th className="py-3 px-4 font-medium">Bill / Supplier</th>
                          <th className="py-3 px-4 font-medium text-right">Unpaid Amount</th>
                          <th className="py-3 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dashboard.cash.upcoming.map((u) => (
                          <tr key={u.id}>
                            <td className="py-3 px-4 font-mono">{u.date}</td>
                            <td className="py-3 px-4 font-medium">{u.category || u.supplier}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                              {formatMoney(u.outstanding)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPayBillModal({ id: u.id, kind: u.kind, outstanding: u.outstanding })
                                  }
                                  className="min-h-[34px] px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer"
                                >
                                  Record Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold">Bank Movements</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                          <th className="py-3 px-4 font-medium">Date</th>
                          <th className="py-3 px-4 font-medium">Type</th>
                          <th className="py-3 px-4 font-medium text-right">Amount</th>
                          <th className="py-3 px-4 font-medium">Ref / Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dashboard.cash.ledger.map((l) => (
                          <tr key={l.id}>
                            <td className="py-3 px-4 font-mono">{l.date}</td>
                            <td className="py-3 px-4">{l.kind}</td>
                            <td
                              className={`py-3 px-4 text-right font-mono font-medium ${
                                l.signed < 0 ? 'text-red-600' : 'text-emerald-600'
                              }`}
                            >
                              {formatMoney(l.signed)}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {l.reference} {l.note ? `· ${l.note}` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold">Stock Purchases</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                          <th className="py-3 px-4 font-medium">Date</th>
                          <th className="py-3 px-4 font-medium">Supplier</th>
                          <th className="py-3 px-4 font-medium text-right">Total</th>
                          <th className="py-3 px-4 font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dashboard.cash.purchases.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-mono">{p.date}</td>
                            <td className="py-3 px-4 font-medium">{p.supplier || 'Supplier'}</td>
                            <td className="py-3 px-4 text-right font-mono">{formatMoney(p.total)}</td>
                            <td className="py-3 px-4 font-mono">{p.receivedDate || 'Pending'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. MONTH CLOSING VIEW */}
          {page === 'Month Closing' && (() => {
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
                      {dashboard.options.months
                        .filter((m) => m >= '2026-09')
                        .map((m) => (
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
          })()}

          {/* 8. SUGGESTIONS VIEW */}
          {page === 'Suggestions' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-base font-bold font-display">Deterministic Business Intelligence</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Automated rules analyzing your orders, margins, stock velocity, and courier reconciliation.
                </p>
              </div>

              {suggestions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
                  All operational checks passed! No priority issues detected in the selected period.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {suggestions.map((s) => (
                    <article
                      key={s.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
                    >
                      <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {s.priority} Priority · {s.page}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</h3>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{s.what}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.why}</p>
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-200 pt-1">
                        Next: {s.next}
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setPage(s.page as NavPage)}
                          className="min-h-[36px] px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer"
                        >
                          Go to {s.page}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 9. CUSTOMERS VIEW */}
          {page === 'Customers' && (
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
                              setOrderQuery(c.phone || c.name);
                              setOrderOffset(0);
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
          )}

          {/* 10. ADS VIEW */}
          {page === 'Ads' && (() => {
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
          })()}

          {/* 11. IMPORT VIEW (Steadfast CSV / XLSX Safe Merge) */}
          {page === 'Import' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                <h2 className="text-base font-bold font-display">Import / Update Steadfast Data (CSV or XLSX)</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Choose your Steadfast courier export file (`.csv` or `.xlsx`). Existing orders are matched by Consignment ID / Tracking Code and updated in place while preserving your manual product/combo assignments, costs, and return verifications.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={async (ev) => {
                      const file = ev.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      try {
                        const rows = file.name.toLowerCase().endsWith('.xlsx')
                          ? await readXlsxFile(file)
                          : parseCsvString(await file.text());
                        const preview = previewSteadfastImport(rows, erpState.Orders);
                        setImportPreview(preview);
                        showToast(`Preview ready: ${preview.newCount} new, ${preview.updatedCount} updated.`);
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : String(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="text-xs file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-slate-900 file:text-white dark:file:bg-emerald-600 cursor-pointer"
                  />
                </div>

                {importPreview && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <div className="text-xs text-slate-500">New Orders</div>
                        <div className="text-lg font-bold text-emerald-600">{importPreview.newCount}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <div className="text-xs text-slate-500">Updated</div>
                        <div className="text-lg font-bold text-blue-600">{importPreview.updatedCount}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <div className="text-xs text-slate-500">Unchanged</div>
                        <div className="text-lg font-bold">{importPreview.unchangedCount}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <div className="text-xs text-slate-500">Warnings / Errors</div>
                        <div className="text-lg font-bold text-amber-600">
                          {importPreview.errors.length + importPreview.problems.length}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        busy ||
                        !canWrite ||
                        importPreview.errors.length > 0 ||
                        importPreview.problems.length > 0 ||
                        importPreview.mergedOrders.length === 0
                      }
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await batchSaveErpRecords('Orders', importPreview.mergedOrders, existingDocIds);
                          showToast(
                            `Import committed: ${importPreview.newCount} added, ${importPreview.updatedCount} updated.`
                          );
                          setImportPreview(null);
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : String(err));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="min-h-[44px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Confirm & Merge {importPreview.mergedOrders.length} Orders into Firebase
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 12. COURIER VIEW */}
          {page === 'Courier' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="text-base font-bold font-display">Steadfast Courier Operations</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check your real-time requestable Steadfast balance or batch-sync active order statuses.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRefreshCourierBalance}
                  className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
                >
                  Check Steadfast Balance
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const active = erpState.Orders.filter(
                      (o) =>
                        (o.cid || o.tracking) &&
                        !['Delivered', 'Partial', 'Cancelled', 'Returned'].includes(o.status)
                    ).slice(0, 15);
                    if (!active.length) {
                      setCourierOutput('No open booked orders require status sync.');
                      return;
                    }
                    setBusy(true);
                    let checked = 0;
                    let failed = 0;
                    for (const o of active) {
                      try {
                        await handleUpdateOrderStatus(o);
                        checked++;
                      } catch {
                        failed++;
                      }
                    }
                    setBusy(false);
                    setCourierOutput(`Batch sync complete: ${checked} updated, ${failed} failed.`);
                  }}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Update Active Parcel Statuses
                </button>
              </div>
              {courierOutput && (
                <pre className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono overflow-x-auto">
                  {courierOutput}
                </pre>
              )}
            </div>
          )}

          {/* 13. TEAM & ROLES VIEW (Multi-User RBAC) */}
          {page === 'Team & Roles' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
                <h2 className="text-base font-bold font-display">Multi-User Role Management (RBAC)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Team members who sign in with Google appear below. Owners and Admins can assign roles (`owner`, `admin`, `manager`, `staff`, `viewer`) enforced by Firestore Security Rules.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                        <th className="py-3 px-4 font-medium">Name</th>
                        <th className="py-3 px-4 font-medium">Email</th>
                        <th className="py-3 px-4 font-medium">Role</th>
                        <th className="py-3 px-4 font-medium">Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {teamMembers.map((m) => (
                        <tr key={m.uid}>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{m.displayName}</td>
                          <td className="py-3 px-4 font-mono">{m.email}</td>
                          <td className="py-3 px-4">
                            {isAdminOrOwner && m.email.toLowerCase() !== OWNER_EMAIL.toLowerCase() ? (
                              <select
                                value={m.role}
                                onChange={async (ev) => {
                                  const nextRole = ev.target.value as UserRole;
                                  await updateTeamMemberRole(m, nextRole, m.active);
                                  showToast(`Updated ${m.displayName} to ${nextRole}`);
                                }}
                                className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs capitalize"
                              >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                                <option value="viewer">Viewer (Read-Only)</option>
                              </select>
                            ) : (
                              <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">
                                {m.role}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {m.role === 'owner' || m.role === 'admin'
                              ? 'Full ERP, Month Closing, Settings & Role Management'
                              : m.role === 'manager' || m.role === 'staff'
                              ? 'Orders, Inventory, Expenses & Courier Sync'
                              : 'Read-only access to reports & analytics'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 14. SETTINGS & SUBDOMAIN VIEW */}
          {page === 'Settings' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <form
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  if (!canWrite) return;
                  const fd = new FormData(ev.currentTarget);
                  const next: SettingsRecord = {
                    ...settings,
                    businessName: String(fd.get('businessName') || 'Shoukhin Home Decor').trim(),
                    subdomain: String(fd.get('subdomain') || 'erp.shoukhinhd.com').trim(),
                    deadDays: Number(fd.get('deadDays') || 60),
                    usdRate: Number(fd.get('usdRate') || 122),
                    vatRate: Number(fd.get('vatRate') || 15),
                    metaAccount: String(fd.get('metaAccount') || '').trim(),
                    metaVersion: String(fd.get('metaVersion') || 'v23.0').trim(),
                    sfKey: String(fd.get('sfKey') || '').trim() || settings.sfKey,
                    sfSecret: String(fd.get('sfSecret') || '').trim() || settings.sfSecret,
                    metaToken: String(fd.get('metaToken') || '').trim() || settings.metaToken,
                  };
                  await saveErpRecord('Settings', next);
                  showToast('Settings saved to Firebase');
                }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
              >
                <h2 className="text-base font-bold font-display">ERP & Integration Settings</h2>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <span>Business Name</span>
                    <input
                      name="businessName"
                      defaultValue={settings.businessName}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Custom Subdomain</span>
                    <input
                      name="subdomain"
                      defaultValue={settings.subdomain || 'erp.shoukhinhd.com'}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Dead Stock After (Days)</span>
                    <input
                      name="deadDays"
                      type="number"
                      min="1"
                      defaultValue={settings.deadDays}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>BDT per USD (Meta Ads)</span>
                    <input
                      name="usdRate"
                      type="number"
                      step="any"
                      defaultValue={settings.usdRate}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Ad VAT %</span>
                    <input
                      name="vatRate"
                      type="number"
                      step="any"
                      defaultValue={settings.vatRate}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Meta USD Ad Account ID</span>
                    <input
                      name="metaAccount"
                      defaultValue={settings.metaAccount}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Steadfast API Key (blank keeps saved)</span>
                    <input
                      name="sfKey"
                      type="password"
                      placeholder={settings.sfKey ? '•••••••• (Saved)' : 'Enter Steadfast API Key'}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Steadfast Secret Key (blank keeps saved)</span>
                    <input
                      name="sfSecret"
                      type="password"
                      placeholder={settings.sfSecret ? '•••••••• (Saved)' : 'Enter Steadfast Secret'}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!canWrite}
                  className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Settings
                </button>
              </form>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                <h2 className="text-base font-bold font-display">
                  Custom Subdomain Setup: erp.shoukhinhd.com
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  To connect your custom subdomain <strong>erp.shoukhinhd.com</strong> to this cloud ERP application:
                </p>
                <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 list-decimal list-inside">
                  <li>
                    Open your DNS manager for <strong>shoukhinhd.com</strong> (Cloudflare, Namecheap, or cPanel).
                  </li>
                  <li>
                    Add a <strong>CNAME</strong> record for host <code className="font-mono font-bold">erp</code> pointing to <code className="font-mono">ghs.googlehosted.com</code> (for Cloud Run custom domain mapping) or your Firebase Hosting domain.
                  </li>
                  <li>
                    In Google Cloud Console → <strong>Firebase Authentication → Settings → Authorized domains</strong>, add <code className="font-mono font-bold">erp.shoukhinhd.com</code> so Google Sign-In works seamlessly on your subdomain.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* 15. HELP VIEW */}
          {page === 'Help' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                Quick Guide — Shoukhin Home Decor Cloud ERP v2.2.0
              </h2>
              <p>
                <strong>Mobile App Installation:</strong> Tap <em>Install App</em> in the top toolbar (or <em>Add to Home Screen</em> in Safari on iPhone) to use Shoukhin ERP full-screen on your phone like a native app.
              </p>
              <p>
                <strong>Offline Syncing:</strong> All orders, inventory counts, and expenses are cached locally in IndexedDB. If your phone loses mobile data, keep working — changes sync automatically when you reconnect.
              </p>
              <p>
                <strong>Dates & Profit Recognition:</strong> Delivered sales use the verified delivery date; orders received use the creation date. Historical orders prior to September 2026 use the 15% net estimate.
              </p>
              <p>
                <strong>Stock & Combos:</strong> Physical counts replace the baseline as of the count date. Combos automatically calculate their cost and available stock from their physical component products.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics, <= 15% Viewport Height) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center px-1">
        {(
          [
            { id: 'Dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'Orders', label: 'Orders', icon: ShoppingBag },
            { id: 'Inventory', label: 'Stock', icon: Boxes },
            { id: 'Purchases & Bank', label: 'Finance', icon: Landmark },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = page === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPage(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="min-h-[48px] flex flex-col items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">More</span>
        </button>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <span className="text-base font-bold font-display">{settings.businessName}</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-3 space-y-1 flex-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = page === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPage(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-3.5 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs text-slate-500 truncate">
                {user.email} ({userRole})
              </div>
              <button
                type="button"
                onClick={logoutUser}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      <OfflineSyncBanner hasPendingWrites={hasPendingWrites} />
    </div>
  );
}

// Sub-component: Order Create / Edit Modal with Auto District Hint & Line Items
const OrderFormModal: React.FC<{
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

// Sub-component: Combo Bundle Modal
const ComboFormModal: React.FC<{
  initial: Partial<ComboRecord>;
  products: ProductRecord[];
  onClose: () => void;
  onSave: (c: ComboRecord) => Promise<void>;
}> = ({ initial, products, onClose, onSave }) => {
  const [name, setName] = useState(initial.name || '');
  const [price, setPrice] = useState(String(initial.price ?? ''));
  const [active, setActive] = useState(initial.active !== false);
  const [components, setComponents] = useState<{ sku: string; qty: number }[]>(
    initial.components?.length ? initial.components : [{ sku: products[0]?.id || '', qty: 1 }]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          const validComponents = components.filter((c) => c.sku && c.qty > 0);
          if (!validComponents.length) return;
          await onSave({
            id: initial.id || 'COMBO-' + Date.now().toString().slice(-6),
            name: name.trim(),
            price: Number(price || 0),
            active,
            components: validComponents,
          });
        }}
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display">Create / Edit Combo Bundle</h3>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span>Combo Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </label>
          <label className="block space-y-1">
            <span>Combo Selling Price (BDT)</span>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </label>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Component Products for 1 Combo</span>
              <button
                type="button"
                onClick={() => setComponents(components.concat({ sku: products[0]?.id || '', qty: 1 }))}
                className="text-emerald-600 font-medium"
              >
                + Add Component
              </button>
            </div>
            {components.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={c.sku}
                  onChange={(ev) => {
                    const next = [...components];
                    next[idx] = { ...next[idx], sku: ev.target.value };
                    setComponents(next);
                  }}
                  className="flex-1 min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={c.qty}
                  onChange={(ev) => {
                    const next = [...components];
                    next[idx] = { ...next[idx], qty: Number(ev.target.value) };
                    setComponents(next);
                  }}
                  className="w-20 min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                  className="text-red-500 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Active combo</span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[40px] px-5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
          >
            Save Combo
          </button>
        </div>
      </form>
    </div>
  );
};
