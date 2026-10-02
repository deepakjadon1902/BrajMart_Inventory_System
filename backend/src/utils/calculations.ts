import { StockStatus } from '../types/index.js';

/**
 * Derives inventory cost in paise:
 * currentQuantity * costPerUnitPaise
 */
export function calculateInventoryCostPaise(
  currentQuantity: number,
  costPerUnitPaise: number
): number {
  if (currentQuantity <= 0 || costPerUnitPaise <= 0) return 0;
  return Math.round(currentQuantity * costPerUnitPaise);
}

/**
 * Derives potential selling value in paise:
 * currentQuantity * sellingPricePerUnitPaise
 */
export function calculateSellingValuePaise(
  currentQuantity: number,
  sellingPricePerUnitPaise: number
): number {
  if (currentQuantity <= 0 || sellingPricePerUnitPaise <= 0) return 0;
  return Math.round(currentQuantity * sellingPricePerUnitPaise);
}

/**
 * Derives potential gross profit in paise:
 * potentialSellingValuePaise - inventoryCostPaise
 */
export function calculatePotentialProfitPaise(
  sellingValuePaise: number,
  inventoryCostPaise: number
): number {
  return sellingValuePaise - inventoryCostPaise;
}

/**
 * Derives gross profit margin percentage:
 * (potentialProfitPaise / sellingValuePaise) * 100
 */
export function calculateMarginPercentage(
  sellingValuePaise: number,
  potentialProfitPaise: number
): number {
  if (sellingValuePaise <= 0) return 0;
  const margin = (potentialProfitPaise / sellingValuePaise) * 100;
  return Number(margin.toFixed(2));
}

/**
 * Derives stock status based on current quantity and reorder level
 */
export function deriveStockStatus(
  quantity: number,
  reorderLevel: number
): StockStatus {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/**
 * Normalizes SKU: trims, strips multiple spaces, uppercase
 */
export function normalizeSku(sku: string): string {
  if (!sku) return '';
  return sku.trim().toUpperCase().replace(/\s+/g, '-');
}

/**
 * Normalizes name: trims and strips repeated whitespaces
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}
