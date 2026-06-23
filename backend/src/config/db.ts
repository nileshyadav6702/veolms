import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ MongoDB connected');
  } catch (err) {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
