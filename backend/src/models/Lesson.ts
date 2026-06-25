import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILesson extends Document {
  courseId: Types.ObjectId;
  sectionId: Types.ObjectId;
  title: string;
  description?: string;
  videoKey: string;
  hlsKey?: string;
  subtitles?: Array<{
    lang: string;
    label: string;
    vttKey: string;
  }>;
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
    subtitles: [
      {
        lang: { type: String, required: true },
        label: { type: String, required: true },
        vttKey: { type: String, required: true },
      },
    ],
    duration: { type: Number, default: 0 },
    order: { type: Number, required: true },
    isPreview: { type: Boolean, default: false },
    status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' },
  },
  { timestamps: true }
);

lessonSchema.index({ courseId: 1, order: 1 });

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
