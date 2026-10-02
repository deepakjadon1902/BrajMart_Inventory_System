import { Types } from 'mongoose';

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

export interface ICategory {
  _id: Types.ObjectId | string;
  serialNumber?: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct {
  _id: Types.ObjectId | string;
  name: string;
  sku: string;
  description?: string;
  categoryId: Types.ObjectId | string | ICategory;
  unitType: UnitType;
  currentQuantity: number;
  costPerUnitPaise: number;
  sellingPricePerUnitPaise: number;
  reorderLevel: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryTransaction {
  _id: Types.ObjectId | string;
  productId: Types.ObjectId | string | IProduct;
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
  createdAt: Date;
}

export interface IPriceHistory {
  _id: Types.ObjectId | string;
  productId: Types.ObjectId | string;
  previousCostPerUnitPaise: number;
  newCostPerUnitPaise: number;
  previousSellingPricePerUnitPaise: number;
  newSellingPricePerUnitPaise: number;
  changedBy: string;
  reason?: string;
  createdAt: Date;
}

export interface IAuditLog {
  _id: Types.ObjectId | string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  reference?: string;
  createdAt: Date;
}

export interface DashboardSummaryData {
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

export interface CategoryValuationBreakdown {
  categoryId: string;
  categoryName: string;
  productCount: number;
  totalUnits: number;
  inventoryCostPaise: number;
  sellingValuePaise: number;
  potentialProfitPaise: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
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
