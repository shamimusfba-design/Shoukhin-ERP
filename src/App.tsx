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
  loginWithGoogle,
  loginDemoOwner,
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
import { AppModals } from './components/modals/AppModals';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsCombosPage } from './pages/ProductsCombosPage';
import { InventoryPage } from './pages/InventoryPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { PurchasesBankPage } from './pages/PurchasesBankPage';
import { MonthClosingPage } from './pages/MonthClosingPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { CustomersPage } from './pages/CustomersPage';
import { AdsPage } from './pages/AdsPage';
import { ImportPage } from './pages/ImportPage';
import { CourierPage } from './pages/CourierPage';
import { TeamRolesPage } from './pages/TeamRolesPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { LoginPage } from './components/LoginPage';
import { WhatsNewModal } from './components/WhatsNewModal';
import { ErpProvider, ErpContextType } from './context/ErpContext';
import { ComboFormModal } from './components/modals/ComboFormModal';
import { DualAdGraph, ExpenseBars, Graph21 } from './components/Charts';
import { isDemoMode, APP_CURRENCY } from './services/erpEngine';
import { generateOmniFlowDemoData } from './data/omniFlowData';

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
  { id: 'Team & Roles', label: 'Admin Access', icon: ShieldCheck },
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
  const [demoSession, setDemoSession] = useState<{ email: string; displayName: string } | null>(() => {
    if (!isDemoMode) return null;
    try {
      const saved = localStorage.getItem('omniflow_demo_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const effectiveUser = useMemo(() => {
    if (user) return user;
    if (isDemoMode && demoSession) {
      return {
        uid: 'demo_admin_uid',
        email: demoSession.email,
        displayName: demoSession.displayName,
      } as User;
    }
    return null;
  }, [user, demoSession]);

  const [authReady, setAuthReady] = useState(false);
  const [myProfile, setMyProfile] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [erpState, setErpState] = useState<ErpDatabaseState>(() => {
    if (isDemoMode) {
      try {
        const saved = localStorage.getItem('omniflow_demo_db');
        if (saved) return JSON.parse(saved);
      } catch {}
      return generateOmniFlowDemoData();
    }
    const real = generateShoukhinDemoData(dhakaToday());
    const initUniqueMap = new Map<string, OrderRecord>();
    for (const ord of (real.Orders || [])) {
      const ordKey = ord.cid || ord.tracking || ord.id;
      if (!initUniqueMap.has(ordKey)) {
        initUniqueMap.set(ordKey, {
          ...ord,
          status: ord.status === 'Unknown' ? 'Pending' : ord.status,
        });
      }
    }
    return { ...EMPTY_DB, ...real, Orders: Array.from(initUniqueMap.values()) };
  });
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

  // Dashboard Filter State: Default to 'All Time' so all 1,539 historical orders and delivered revenue appear immediately!
  const [quickDate, setQuickDate] = useState('All Time');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('2025-08-01');
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

  // Firestore Real-time Sync Listener (with offline persistence & fallback to real data)
  useEffect(() => {
    if (isDemoMode) {
      setDataLoaded(true);
      const handleDemoUpdate = () => {
        try {
          const raw = localStorage.getItem('omniflow_demo_db');
          if (raw) setErpState(JSON.parse(raw));
        } catch {}
      };
      window.addEventListener('omniflow_demo_updated', handleDemoUpdate);
      return () => {
        window.removeEventListener('omniflow_demo_updated', handleDemoUpdate);
      };
    }

    if (!authReady && !user) {
      return;
    }

    if (!user) {
      setErpState(EMPTY_DB);
      setDataLoaded(false);
      return;
    }

    // When logged in via Firebase Auth
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

        // FALLBACK: If Firestore database is currently empty (e.g. fresh deployment),
        // fallback to the 111 real products and 1,539 real orders so the app is always populated!
        const real = generateShoukhinDemoData(today);
        if (next.Products.length === 0) {
          next.Products = real.Products || [];
          next.Combos = real.Combos || [];
        }
        if (next.Orders.length === 0) {
          next.Orders = real.Orders || [];
        }
        // Deduplicate orders so an order never appears twice
        const uniqueOrdersMap = new Map<string, OrderRecord>();
        for (const ord of next.Orders) {
          const ordKey = ord.cid || ord.tracking || ord.id;
          if (!uniqueOrdersMap.has(ordKey)) {
            uniqueOrdersMap.set(ordKey, {
              ...ord,
              status: ord.status === 'Unknown' ? 'Pending' : ord.status,
            });
          }
        }
        next.Orders = Array.from(uniqueOrdersMap.values());
        if (next.Stock.length === 0) {
          next.Stock = real.Stock || [];
        }
        if (next.Expenses.length === 0) {
          next.Expenses = real.Expenses || [];
        }
        if (next.Purchases.length === 0) {
          next.Purchases = real.Purchases || [];
        }
        if (next.Ledger.length === 0) {
          next.Ledger = real.Ledger || [];
        }
        if (next.Months.length === 0) {
          next.Months = real.Months || [];
        }
        if (next.Checks.length === 0) {
          next.Checks = real.Checks || [];
        }
        if (next.AdDaily.length === 0) {
          next.AdDaily = real.AdDaily || [];
        }
        if (next.Settings.length === 0) {
          next.Settings = real.Settings || [];
        }

        setErpState(next);
        setDataLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'erp_records');
        const real = generateShoukhinDemoData(today);
        setErpState((prev) => (prev.Products && prev.Products.length > 0 ? prev : { ...EMPTY_DB, ...real }));
        setDataLoaded(true);
      }
    );

    const usersQuery = query(collection(db, 'users'));
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
  }, [authReady, user, today]);

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

  // Single-role architecture: every approved account is an Admin with identical full permissions
  const userRole: UserRole = 'admin';
  const canWrite = true;
  const isAdminOrOwner = true;

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

  // Load Real Shoukhin Business Data (111 Products & 1,539 Orders)
  const handleLoadRealData = async () => {
    if (!canWrite) {
      showToast('Viewer role cannot modify records.');
      return;
    }
    setBusy(true);
    try {
      const real = generateShoukhinDemoData(today);
      setErpState({ ...EMPTY_DB, ...real });
      for (const [table, items] of Object.entries(real)) {
        if (Array.isArray(items) && items.length) {
          await batchSaveErpRecords(table as ErpTableName, items as any[], existingDocIds);
        }
      }
      showToast('111 Real Products & 1,539 Real Orders loaded successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load real data');
    } finally {
      setBusy(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!canWrite) return;
    setBusy(true);
    try {
      const real = generateShoukhinDemoData(today);
      setErpState({ ...EMPTY_DB, ...real });
      showToast('Demo data cleared! Reset to 111 Real Products and 1,539 Orders.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error clearing demo data');
    } finally {
      setBusy(false);
    }
  };

  const handleSeedDemoData = handleLoadRealData;

  // Steadfast API Helper (with native CORS to portal.packzy.com & mock sandbox support)
  const callSteadfastApi = async (endpoint: string, method = 'GET', body?: Record<string, unknown>) => {
    const isMock =
      !settings.sfKey ||
      settings.sfKey.toLowerCase().includes('mock') ||
      settings.sfKey.toLowerCase().includes('demo') ||
      settings.sfSecret?.toLowerCase().includes('mock');

    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (isMock) {
      if (cleanPath === '/get_balance') {
        return { status: 200, current_balance: 41634 };
      }
      if (cleanPath.startsWith('/status_by_')) {
        return { status: 200, delivery_status: 'delivered' };
      }
      if (cleanPath === '/create_order') {
        const randCid = Math.floor(1000000 + Math.random() * 9000000);
        return {
          status: 200,
          consignment: {
            consignment_id: randCid,
            tracking_code: 'SF' + randCid,
            status: 'in_review',
          },
        };
      }
    }

    if (!settings.sfKey || !settings.sfSecret) {
      throw new Error('Save your Steadfast API Key & Secret in Settings first.');
    }

    // Direct fetch to Steadfast Packzy API (supports native browser CORS)
    try {
      const fetchOpts: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'Api-Key': settings.sfKey.trim(),
          'Secret-Key': settings.sfSecret.trim(),
          'Content-Type': 'application/json',
        },
      };
      if (body && method.toUpperCase() !== 'GET') {
        fetchOpts.body = JSON.stringify(body);
      }
      const direct = await fetch(`https://portal.packzy.com/api/v1${cleanPath}`, fetchOpts);
      if (direct.ok) {
        const dJson = await direct.json();
        if (dJson.status === 200 || dJson.status === '200') return dJson;
        if (dJson.message) throw new Error(dJson.message);
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('fetch')) {
        throw e;
      }
    }

    // Fallback to proxy
    try {
      const res = await fetch('/api/steadfast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: cleanPath,
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
    } catch (proxyErr) {
      throw new Error(proxyErr instanceof Error ? proxyErr.message : 'Steadfast request failed');
    }
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
      const endpoint = order.tracking
        ? `/status_by_trackingcode/${encodeURIComponent(order.tracking)}`
        : `/status_by_cid/${encodeURIComponent(order.cid!)}`;
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
        deliveredAt: nextStatus === 'Delivered' ? (order.deliveredAt || new Date().toISOString()) : order.deliveredAt,
        revision: (order.revision || 1) + 1,
      };
      setErpState((prev) => ({
        ...prev,
        Orders: prev.Orders.map((o) => (o.id === order.id ? updatedOrder : o)),
      }));
      await saveErpRecord('Orders', updatedOrder);
      showToast(`Order ${order.name || order.invoice}: ${nextStatus}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSyncAllSteadfastStatuses = async () => {
    const activeOrders = erpState.Orders.filter(
      (o) => (o.cid || o.tracking) && !['Delivered', 'Cancelled'].includes(o.status)
    );
    if (!activeOrders.length) {
      showToast('All active orders are up to date!');
      return;
    }
    setBusy(true);
    let updatedCount = 0;
    try {
      const updatedList = [...erpState.Orders];
      for (const ord of activeOrders.slice(0, 40)) {
        try {
          const endpoint = ord.tracking
            ? `/status_by_trackingcode/${encodeURIComponent(ord.tracking)}`
            : `/status_by_cid/${encodeURIComponent(ord.cid!)}`;
          const res = await callSteadfastApi(endpoint, 'GET');
          if (res?.delivery_status) {
            const nextStatus = normalizeStatus(res.delivery_status);
            if (ord.status !== nextStatus) {
              const idx = updatedList.findIndex((x) => x.id === ord.id);
              if (idx >= 0) {
                const up: OrderRecord = {
                  ...updatedList[idx],
                  status: nextStatus,
                  rawStatus: String(res.delivery_status),
                  lastSync: new Date().toISOString(),
                  deliveredAt: nextStatus === 'Delivered' ? (updatedList[idx].deliveredAt || new Date().toISOString()) : updatedList[idx].deliveredAt,
                  revision: (updatedList[idx].revision || 1) + 1,
                };
                updatedList[idx] = up;
                await saveErpRecord('Orders', up);
                updatedCount++;
              }
            }
          }
        } catch {
          // ignore single item network hiccup
        }
      }
      setErpState((prev) => ({ ...prev, Orders: updatedList }));
      showToast(`⚡ Steadfast Sync: ${updatedCount} order(s) updated to latest status!`);
    } catch (err: any) {
      showToast(err.message || 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDirectFetchConsignment = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) {
      showToast('Please enter a Tracking Code or Consignment ID');
      return;
    }
    setBusy(true);
    try {
      const isTracking = /^[A-Za-z]/.test(trimmed);
      const endpoint = isTracking
        ? `/status_by_trackingcode/${encodeURIComponent(trimmed)}`
        : `/status_by_cid/${encodeURIComponent(trimmed)}`;
      const res = await callSteadfastApi(endpoint, 'GET');
      if (!res?.delivery_status && !res?.status) {
        throw new Error('Consignment not found in Steadfast');
      }
      const deliveryStatus = res.delivery_status || 'Pending';
      const normStatus = normalizeStatus(deliveryStatus);

      const existing = erpState.Orders.find(
        (o) => o.tracking === trimmed || o.cid === trimmed || o.invoice === trimmed
      );

      if (existing) {
        const up: OrderRecord = {
          ...existing,
          status: normStatus,
          rawStatus: deliveryStatus,
          lastSync: new Date().toISOString(),
          deliveredAt: normStatus === 'Delivered' ? (existing.deliveredAt || new Date().toISOString()) : existing.deliveredAt,
          revision: (existing.revision || 1) + 1,
        };
        setErpState((prev) => ({
          ...prev,
          Orders: prev.Orders.map((o) => (o.id === existing.id ? up : o)),
        }));
        await saveErpRecord('Orders', up);
        showToast(`Updated existing Order ${existing.name || existing.invoice}: ${normStatus}`);
      } else {
        const newOrder: OrderRecord = {
          id: 'ORD-SF-' + trimmed,
          invoice: trimmed,
          cid: isTracking ? undefined : trimmed,
          tracking: isTracking ? trimmed : undefined,
          name: 'Steadfast Customer (' + trimmed + ')',
          phone: '01700000000',
          address: 'Bangladesh',
          district: 'Dhaka',
          date: new Date().toISOString().slice(0, 10),
          status: normStatus,
          rawStatus: deliveryStatus,
          total: 0,
          cod: 0,
          shippingCharge: 0,
          codCharge: 0,
          returnCharge: 0,
          paymentStatus: 'Unpaid',
          note: 'Direct import from Steadfast Courier',
          createdAt: new Date().toISOString(),
          stockReturns: {},
          stockReserved: false,
          source: 'Steadfast Direct API',
          lines: [],
          dispatched: true,
          lastSync: new Date().toISOString(),
          revision: 1,
          imported: true,
          amountVerified: true,
          itemsVerified: true,
        };
        setErpState((prev) => ({
          ...prev,
          Orders: [newOrder, ...prev.Orders],
        }));
        await saveErpRecord('Orders', newOrder);
        showToast(`Imported new parcel from Steadfast: ${normStatus}!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch consignment');
    } finally {
      setBusy(false);
    }
  };

  // Auto-sync active orders from Steadfast on mount and periodically
  useEffect(() => {
    if (!settings.sfKey || !settings.sfSecret) return;
    const initialSyncTimer = setTimeout(() => {
      handleSyncAllSteadfastStatuses().catch(() => {});
    }, 3000);
    const periodicTimer = setInterval(() => {
      handleSyncAllSteadfastStatuses().catch(() => {});
    }, 120000);
    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(periodicTimer);
    };
  }, [settings.sfKey, settings.sfSecret]);

  const handleBookSteadfastOrder = async (order: OrderRecord) => {
    if (order.cid || order.tracking) {
      showToast('Order already linked to Steadfast tracking ' + (order.tracking || order.cid));
      return;
    }
    // If order has no line items, fallback to note without blocking booking
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

  const handleGoogleLogin = async () => {
    try {
      setBusy(true);
      await loginWithGoogle();
    } catch (err: any) {
      console.warn('Google Sign-In Error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        showToast('Localhost is pending domain authorization in Firebase Console. Tap "Instant Owner Login" below to continue immediately!');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        showToast('Sign-in window was closed.');
      } else {
        showToast(err?.message || 'Google sign-in could not complete. Use Instant Owner Login below.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('omniflow_demo_session');
      setDemoSession(null);
      setMyProfile(null);
      return;
    }
    localStorage.removeItem('shd_demo_user');
    setMyProfile(null);
    await logoutUser();
  };

  const handleDemoLogin = (sess: { email: string; displayName: string }) => {
    localStorage.setItem('omniflow_demo_session', JSON.stringify(sess));
    setDemoSession(sess);
    const prof: TeamMember = {
      uid: 'demo_admin_uid',
      displayName: sess.displayName,
      email: sess.email,
      role: 'admin',
      status: 'approved',
      active: true,
    };
    setMyProfile(prof);
    setDataLoaded(true);
  };

  if (!effectiveUser) {
    return (
      <LoginPage
        showToast={showToast}
        busy={busy}
        setBusy={setBusy}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

      const erpContextValue: ErpContextType = {
    user: effectiveUser,
    myProfile,
    userRole,
    canWrite,
    isAdminOrOwner,
    teamMembers,
    erpState,
    existingDocIds,
    settings,
    catalog,
    dashboard,
    suggestions,
    customersList,
    customerTypesMap,
    today,
    busy,
    setBusy,
    showToast,
    page,
    setPage,
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
    printOrder,
    setPrintOrder,
    handleBookSteadfastOrder,
    handleUpdateOrderStatus,
    handleSyncAllSteadfastStatuses,
    handleDirectFetchConsignment,
    handleRefreshCourierBalance,
    handleSeedDemoData,
    handleLoadRealData,
    handleClearDemoData,
  };

  return (
    <ErpProvider value={erpContextValue}>
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
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <img src="/logo.png" alt={isDemoMode ? 'OmniFlow ERP' : 'Shoukhin Home Decor'} className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 border border-slate-200 dark:border-slate-800 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold tracking-tight font-display text-slate-900 dark:text-white truncate block">
              {isDemoMode ? 'OmniFlow Global ERP' : settings.businessName}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate block">
              {isDemoMode ? 'Commercial Enterprise Edition' : 'Transform your place'}
            </span>
          </div>
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
            {effectiveUser.email} · <span className="capitalize font-medium text-slate-700 dark:text-slate-200">{userRole}</span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
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
            {isDemoMode && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-500/20">
                Interactive Commercial Demo (USD $)
              </span>
            )}
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
          {page === 'Dashboard' && <DashboardPage />}
          {page === 'Orders' && <OrdersPage />}
          {page === 'Products & Combos' && <ProductsCombosPage />}
          {page === 'Inventory' && <InventoryPage />}
          {page === 'Expenses' && <ExpensesPage />}
          {page === 'Purchases & Bank' && <PurchasesBankPage />}
          {page === 'Month Closing' && <MonthClosingPage />}
          {page === 'Suggestions' && <SuggestionsPage />}
          {page === 'Customers' && <CustomersPage />}
          {page === 'Ads' && <AdsPage />}
          {page === 'Import' && <ImportPage />}
          {page === 'Courier' && <CourierPage />}
          {page === 'Team & Roles' && <TeamRolesPage />}
          {page === 'Settings' && <SettingsPage />}
          {page === 'Help' && <HelpPage />}
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
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Shoukhin Home Decor" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
                <span className="text-sm font-bold font-display">{settings.businessName}</span>
              </div>
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
                {effectiveUser.email} ({userRole})
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <AppModals />
      <WhatsNewModal />

      <OfflineSyncBanner hasPendingWrites={hasPendingWrites} />
    </div>
    </ErpProvider>
  );
}

