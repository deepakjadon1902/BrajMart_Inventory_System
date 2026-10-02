import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().trim().optional(),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().default('brajmart-super-secret-key-production'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

if (!isTest && !parsed.data.MONGODB_URI) {
  console.error('Missing MONGODB_URI. Set it to your real MongoDB database before starting BrajMart Inventory.');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  MONGODB_URI: parsed.data.MONGODB_URI || '',
};
