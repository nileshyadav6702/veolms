import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChatMessage extends Document {
  userId: Types.ObjectId;
  lessonId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  sender: 'user' | 'ai';
  text: string;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: false },
    conversationId: { type: Schema.Types.ObjectId, ref: 'AIConversation', required: false },
    sender: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.index({ userId: 1, lessonId: 1, createdAt: 1 });
chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
