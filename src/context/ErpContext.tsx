import React, { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import {
  AdDailyRecord,
  BudgetRecord,
  CatalogItem,
  ComboRecord,
  ErpDatabaseState,
  ExpenseRecord,
  OrderRecord,
  ProductRecord,
  SettingsRecord,
  TeamMember,
  UserRole,
} from '../types/erp';
import {
  computeDashboardAnalytics,
  computeGuidanceSuggestions,
  buildCustomersList,
  computeCustomerTypes,
} from '../services/erpEngine';

export type NavPage =
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

export interface ErpContextType {
  user: User | null;
  myProfile: TeamMember | null;
  userRole: UserRole;
  canWrite: boolean;
  isAdminOrOwner: boolean;
  teamMembers: TeamMember[];
  erpState: ErpDatabaseState;
  existingDocIds: Set<string>;
  settings: SettingsRecord;
  catalog: CatalogItem[];
  dashboard: ReturnType<typeof computeDashboardAnalytics>;
  suggestions: ReturnType<typeof computeGuidanceSuggestions>;
  customersList: ReturnType<typeof buildCustomersList>;
  customerTypesMap: ReturnType<typeof computeCustomerTypes>;
  today: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  showToast: (msg: string) => void;
  page: NavPage;
  setPage: (page: NavPage) => void;

  // Dashboard Filters
  quickDate: string;
  setQuickDate: (val: string) => void;
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  districtFilter: string;
  setDistrictFilter: (val: string) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  productFilter: string;
  setProductFilter: (val: string) => void;
  marketFilter: string;
  setMarketFilter: (val: string) => void;
  customerFilter: string;
  setCustomerFilter: (val: string) => void;
  dashQuery: string;
  setDashQuery: (val: string) => void;
  groupBy: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  setGroupBy: (val: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly') => void;
  districtMetric: string;
  setDistrictMetric: (val: string) => void;
  productMetric: string;
  setProductMetric: (val: string) => void;

  // Modals
  orderModal: Partial<OrderRecord> | null;
  setOrderModal: (val: Partial<OrderRecord> | null) => void;
  productModal: Partial<ProductRecord> | null;
  setProductModal: (val: Partial<ProductRecord> | null) => void;
  comboModal: Partial<ComboRecord> | null;
  setComboModal: (val: Partial<ComboRecord> | null) => void;
  stockCountSku: string | null;
  setStockCountSku: (val: string | null) => void;
  damageModalOpen: boolean;
  setDamageModalOpen: (val: boolean) => void;
  expenseModal: Partial<ExpenseRecord> | null;
  setExpenseModal: (val: Partial<ExpenseRecord> | null) => void;
  budgetModal: Partial<BudgetRecord> | null;
  setBudgetModal: (val: Partial<BudgetRecord> | null) => void;
  cashModalOpen: boolean;
  setCashModalOpen: (val: boolean) => void;
  purchaseModalOpen: boolean;
  setPurchaseModalOpen: (val: boolean) => void;
  payBillModal: { id: string; kind: 'expense' | 'purchase'; outstanding: number } | null;
  setPayBillModal: (val: { id: string; kind: 'expense' | 'purchase'; outstanding: number } | null) => void;
  targetModalOpen: boolean;
  setTargetModalOpen: (val: boolean) => void;
  adModalOpen: boolean;
  setAdModalOpen: (val: boolean) => void;
  printOrder: OrderRecord | null;
  setPrintOrder: (val: OrderRecord | null) => void;

  // Actions
  handleBookSteadfastOrder: (order: OrderRecord) => Promise<void>;
  handleUpdateOrderStatus: (order: OrderRecord) => Promise<void>;
  handleRefreshCourierBalance: () => Promise<void>;
  handleSeedDemoData: () => Promise<void>;
}

const ErpContext = createContext<ErpContextType | null>(null);

export const ErpProvider: React.FC<{ value: ErpContextType; children: React.ReactNode }> = ({
  value,
  children,
}) => {
  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
};

export const useErp = (): ErpContextType => {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error('useErp must be used within an ErpProvider');
  }
  return context;
};
