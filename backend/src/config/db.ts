import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let connected = false;

export function isMongoConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

/**
 * Connect to MongoDB. Soft-fails in development so the API can still boot
 * with an in-memory knowledge fallback when Mongo isn't running.
 */
export async function connectMongo(): Promise<void> {
  const uri = env.MONGODB_URI ?? 'mongodb://localhost:27017/devguardian';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4_000,
    });
    connected = true;
    logger.info('MongoDB connected', { uri: uri.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    connected = false;
    logger.warn('MongoDB unavailable — knowledge falls back to in-memory store', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connected = false;
  }
}
