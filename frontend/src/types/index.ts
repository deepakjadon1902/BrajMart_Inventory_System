export const UNIT_TYPES = [
  'pcs',
  'box',
  'pack',
  'packet',
  'bottle',
  'kg',
  'gram',
  'litre',
  'ml',
  'set',
  'pair',
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export const TRANSACTION_TYPES = [
  'OPENING_STOCK',
  'STOCK_IN',
  'STOCK_OUT',
  'SALE',
  'RETURN',
  'DAMAGED',
  'LOST',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'CORRECTION',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';

export interface Category {
  _id: string;
  serialNumber?: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: Category | string;
  unitType: UnitType;
  currentQuantity: number;
  costPerUnitPaise: number;
  sellingPricePerUnitPaise: number;
  reorderLevel: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;

  // Derived properties from server
  inventoryCostPaise: number;
  sellingValuePaise: number;
  potentialProfitPaise: number;
  marginPercentage: number;
  stockStatus: StockStatus;
}

export interface InventoryTransaction {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
    unitType: UnitType;
  };
  type: TransactionType;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  costPerUnitPaiseSnapshot?: number;
  sellingPricePerUnitPaiseSnapshot?: number;
  reason?: string;
  reference?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalUnits: number;
  inventoryCostPaise: number;
  sellingValuePaise: number;
  potentialProfitPaise: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  addedTodayUnits: number;
  reducedTodayUnits: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  productCount: number;
  totalUnits: number;
  inventoryCostPaise: number;
  sellingValuePaise: number;
  potentialProfitPaise: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
