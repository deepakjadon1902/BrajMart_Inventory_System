import { z } from 'zod';
import { UNIT_TYPES } from '../types/index.js';

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  sku: z.string().trim().max(50).optional(),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.string().min(1, 'Category is required'),
  unitType: z.enum(UNIT_TYPES, {
    errorMap: () => ({ message: 'Please select a valid unit type' }),
  }),
  openingQuantity: z.coerce.number().int().min(0, 'Opening quantity cannot be negative').default(0),
  costPerUnit: z.coerce.number().min(0, 'Cost price cannot be negative'),
  sellingPricePerUnit: z.coerce.number().min(0, 'Selling price cannot be negative'),
  reorderLevel: z.coerce.number().int().min(0, 'Reorder level cannot be negative').default(10),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  sku: z.string().trim().min(1, 'SKU is required').max(50),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.string().min(1, 'Category is required'),
  unitType: z.enum(UNIT_TYPES),
  costPerUnit: z.coerce.number().min(0, 'Cost price cannot be negative'),
  sellingPricePerUnit: z.coerce.number().min(0, 'Selling price cannot be negative'),
  reorderLevel: z.coerce.number().int().min(0, 'Reorder level cannot be negative'),
  reason: z.string().trim().optional(),
});

export const stockInSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity to add must be greater than 0'),
  reason: z.string().trim().max(300).optional(),
  reference: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

export const stockOutSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity to reduce must be greater than 0'),
  type: z.enum(['STOCK_OUT', 'SALE', 'DAMAGED', 'LOST']).default('STOCK_OUT'),
  reason: z.string().trim().max(300).optional(),
  reference: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

export const adjustStockSchema = z.object({
  actualQuantity: z.coerce.number().int().min(0, 'Actual physical stock cannot be negative'),
  reason: z.string().trim().min(1, 'Adjustment reason is required').max(300),
  reference: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});
