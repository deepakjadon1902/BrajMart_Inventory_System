import { z } from 'zod';

export const createCategorySchema = z.object({
  serialNumber: z.coerce.number().int().positive('Serial number must be greater than 0').optional(),
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).optional(),
});

export const updateCategorySchema = z.object({
  serialNumber: z.coerce.number().int().positive('Serial number must be greater than 0').optional(),
  name: z.string().trim().min(1, 'Category name is required').max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});
