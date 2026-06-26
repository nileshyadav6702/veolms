import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAIConversation extends Document {
  userId: Types.ObjectId;
  title: string;
  lessonId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const aiConversationSchema = new Schema<IAIConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: false },
  },
  { timestamps: true }
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AIConversation = mongoose.model<IAIConversation>('AIConversation', aiConversationSchema);
