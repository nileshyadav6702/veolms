import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILesson extends Document {
  courseId: Types.ObjectId;
  sectionId: Types.ObjectId;
  title: string;
  description?: string;
  videoKey: string;
  hlsKey?: string;
  duration: number;
  order: number;
  isPreview: boolean;
  status: 'processing' | 'ready' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    sectionId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    videoKey: { type: String, required: true },
    hlsKey: { type: String },
    duration: { type: Number, default: 0 },
    order: { type: Number, required: true },
    isPreview: { type: Boolean, default: false },
    status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' },
  },
  { timestamps: true }
);

lessonSchema.index({ courseId: 1, order: 1 });

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
