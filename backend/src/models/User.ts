import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'admin';
  avatar?: string;
  lastLogin?: Date;
  aiSettings?: {
    provider: 'gemini' | 'openai';
    model: string;
    apiKey?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    avatar: { type: String },
    lastLogin: { type: Date },
    aiSettings: {
      provider: { type: String, enum: ['gemini', 'openai'], default: 'gemini' },
      model: { type: String, default: 'gemini-1.5-flash' },
      apiKey: { type: String, select: false },
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
