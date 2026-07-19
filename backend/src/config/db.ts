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
  const configured = env.MONGODB_URI?.trim();
  const uri =
    configured && configured.length > 0
      ? configured
      : 'mongodb://localhost:27017/devguardian';

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    connected = false;
    logger.warn('MongoDB unavailable — knowledge falls back to in-memory store', {
      error: 'MONGODB_URI must start with mongodb:// or mongodb+srv:// (check .env is one line)',
    });
    return;
  }

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
