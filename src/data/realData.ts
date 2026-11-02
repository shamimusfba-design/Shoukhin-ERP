import realData from './realShoukhinData.json';
import { REAL_SHOUKHIN_PRODUCTS } from './realProducts';
import { ErpDatabaseState, ProductRecord } from '../types/erp';

export { REAL_SHOUKHIN_PRODUCTS };

export function getShoukhinRealDatabase(): ErpDatabaseState {
  return {
    Orders: (realData.Orders as any[]) || [],
    Products: REAL_SHOUKHIN_PRODUCTS,
    Combos: (realData.Combos as any[]) || [],
    Stock: (realData.Stock as any[]) || [],
    Expenses: (realData.Expenses as any[]) || [],
    Budgets: (realData.Budgets as any[]) || [],
    Purchases: (realData.Purchases as any[]) || [],
    Ledger: (realData.Ledger as any[]) || [],
    Months: (realData.Months as any[]) || [],
    Checks: (realData.Checks as any[]) || [],
    AdDaily: (realData.AdDaily as any[]) || [],
    Settings: (realData.Settings as any[]) || [],
    Log: (realData.Log as any[]) || [],
  };
}
