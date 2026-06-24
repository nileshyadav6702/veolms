import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  deviceInfo: string;
  ipAddress: string;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceInfo: { type: String, default: 'Unknown Device' },
    ipAddress: { type: String, default: 'Unknown IP' },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ lastActive: -1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
