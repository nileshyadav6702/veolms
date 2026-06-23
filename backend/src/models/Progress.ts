import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProgress extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  lessonId: Types.ObjectId;
  watchedSeconds: number;
  duration: number;
  completed: boolean;
  lastWatchedAt: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    watchedSeconds: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

progressSchema.index({ userId: 1, courseId: 1 });
progressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const Progress = mongoose.model<IProgress>('Progress', progressSchema);
