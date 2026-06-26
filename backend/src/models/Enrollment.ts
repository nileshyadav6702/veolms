import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEnrollment extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  couponCode?: string;
  discountAmount?: number;
  originalPrice?: number;
  paidPrice?: number;
  enrolledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    originalPrice: { type: Number },
    paidPrice: { type: Number },
    enrolledAt: { type: Date },
  },
  { timestamps: true }
);

enrollmentSchema.index({ userId: 1, courseId: 1 });
enrollmentSchema.index({ razorpayOrderId: 1 }, { sparse: true });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
