import { describe, it, expect } from 'vitest';
import {
  calculateInventoryCostPaise,
  calculateSellingValuePaise,
  calculatePotentialProfitPaise,
  calculateMarginPercentage,
  deriveStockStatus,
  normalizeSku,
  normalizeString,
} from '../src/utils/calculations.js';
import { rupeesToPaise, paiseToRupees, formatINR } from '../src/utils/currency.js';

describe('Financial & Calculation Engine Tests', () => {
  it('converts rupees to paise accurately without floating point drift', () => {
    expect(rupeesToPaise(199.99)).toBe(19999);
    expect(rupeesToPaise(80)).toBe(8000);
    expect(rupeesToPaise('120.50')).toBe(12050);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it('converts paise to rupees accurately', () => {
    expect(paiseToRupees(19999)).toBe(199.99);
    expect(paiseToRupees(8000)).toBe(80);
    expect(paiseToRupees(0)).toBe(0);
  });

  it('formats INR using Indian numbering system', () => {
    const formatted = formatINR(24845000); // ₹2,48,450.00
    expect(formatted).toContain('2,48,450');
  });

  it('calculates inventory cost in paise correctly', () => {
    // 50 pcs * ₹120 (12000 paise) = 600,000 paise (₹6,000)
    expect(calculateInventoryCostPaise(50, 12000)).toBe(600000);
    expect(calculateInventoryCostPaise(0, 12000)).toBe(0);
    expect(calculateInventoryCostPaise(10, 0)).toBe(0);
  });

  it('calculates potential selling value in paise correctly', () => {
    // 50 pcs * ₹199 (19900 paise) = 995,000 paise (₹9,950)
    expect(calculateSellingValuePaise(50, 19900)).toBe(995000);
  });

  it('calculates potential gross profit in paise correctly', () => {
    // ₹9,950 (995000 paise) - ₹6,000 (600000 paise) = ₹3,950 (395000 paise)
    expect(calculatePotentialProfitPaise(995000, 600000)).toBe(395000);
  });

  it('calculates gross profit margin percentage correctly', () => {
    const margin = calculateMarginPercentage(995000, 395000);
    // (3950 / 9950) * 100 = 39.7%
    expect(margin).toBe(39.7);
    expect(calculateMarginPercentage(0, 0)).toBe(0);
  });

  it('derives stock status accurately based on invariants', () => {
    expect(deriveStockStatus(0, 10)).toBe('OUT_OF_STOCK');
    expect(deriveStockStatus(5, 10)).toBe('LOW_STOCK');
    expect(deriveStockStatus(10, 10)).toBe('LOW_STOCK');
    expect(deriveStockStatus(11, 10)).toBe('IN_STOCK');
    expect(deriveStockStatus(100, 10)).toBe('IN_STOCK');
  });

  it('normalizes SKU properly (trimmed, uppercase, single dashes)', () => {
    expect(normalizeSku('  stock  item  001  ')).toBe('STOCK-ITEM-001');
    expect(normalizeSku('sku-123')).toBe('SKU-123');
  });

  it('normalizes product and category names', () => {
    expect(normalizeString('   Stock    Item   ')).toBe('Stock Item');
  });

  it('passes financial precision edge case from Rule #103', () => {
    // Quantity = 3, Cost = ₹99.99 (9999 paise) => Expected: ₹299.97 (29997 paise)
    const costPaise = calculateInventoryCostPaise(3, rupeesToPaise(99.99));
    expect(costPaise).toBe(29997);
    expect(paiseToRupees(costPaise)).toBe(299.97);
  });
});
