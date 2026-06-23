import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEnrollment extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  enrolledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    enrolledAt: { type: Date },
  },
  { timestamps: true }
);

enrollmentSchema.index({ userId: 1, courseId: 1 });
enrollmentSchema.index({ razorpayOrderId: 1 });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
