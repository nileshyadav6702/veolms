import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number; // Maximum discount if discountType is percentage
  minCoursePrice?: number; // Minimum course price required to apply the coupon
  expiryDate?: Date;
  isActive: boolean;
  usageLimit?: number; // Optional maximum usage limit
  usedCount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    minCoursePrice: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
