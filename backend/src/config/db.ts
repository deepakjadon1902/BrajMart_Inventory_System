import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let memoryServerInstance: any = null;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const isTest = Boolean(process.env.VITEST || env.NODE_ENV === 'test');

  if (isTest) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create();
    const uri = memoryServerInstance.getUri();
    console.log(`[DB] Test mode: connecting to isolated MongoDB at: ${uri}`);
    await mongoose.connect(uri);
    isConnected = true;
    console.log('[DB] Connected to isolated test MongoDB successfully.');
    return;
  }

  try {
    console.log(`[DB] Attempting connection to MongoDB at: ${env.MONGODB_URI}`);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log('✅ [DB] Successfully connected to MongoDB database.');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[DB] Could not connect to configured MongoDB: ${errorMsg}`);
    console.error('[DB] Startup stopped to protect real inventory data. Check MONGODB_URI and MongoDB availability.');
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
  isConnected = false;
  console.log('🛑 [DB] Disconnected from MongoDB.');
}
