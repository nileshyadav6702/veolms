import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INote extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  lessonId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

// Indexed for fast lookups
noteSchema.index({ userId: 1, courseId: 1 });
// Each user can have only one note document per lesson
noteSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const Note = mongoose.model<INote>('Note', noteSchema);
