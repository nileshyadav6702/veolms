import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICertificate extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  certificateCode: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    certificateCode: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });
certificateSchema.index({ certificateCode: 1 });

export const Certificate = mongoose.model<ICertificate>('Certificate', certificateSchema);
