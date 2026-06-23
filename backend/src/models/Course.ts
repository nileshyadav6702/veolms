import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISection {
  _id: Types.ObjectId;
  title: string;
  order: number;
}

export interface ICourse extends Document {
  title: string;
  slug: string;
  thumbnail: string;
  description: string;
  shortDescription: string;
  instructor: string;
  price: number;
  currency: string;
  sections: ISection[];
  isPublished: boolean;
  totalLessons: number;
  totalDuration: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  order: { type: Number, required: true },
});

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    thumbnail: { type: String, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true, maxlength: 200 },
    instructor: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    sections: [sectionSchema],
    isPublished: { type: Boolean, default: false },
    totalLessons: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

courseSchema.index({ slug: 1 });
courseSchema.index({ isPublished: 1 });

export const Course = mongoose.model<ICourse>('Course', courseSchema);
