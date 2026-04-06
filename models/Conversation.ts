import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  sessionId: string;
  assistantId: string;
  question: string;
  answer: string;
  sources: string[];
  timestamp: Date;
}

const ConversationSchema = new Schema<IConversation>({
  sessionId:   { type: String, required: true },
  assistantId: { type: String, required: true },
  question:    { type: String, required: true },
  answer:      { type: String, required: true },
  sources:     { type: [String], default: [] },
  timestamp:   { type: Date, default: Date.now },
});

ConversationSchema.index({ question: 'text' });
ConversationSchema.index({ timestamp: -1 });

export default mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);
