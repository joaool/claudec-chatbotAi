import mongoose, { Schema, Document } from 'mongoose';

// 'model' conflicts with Mongoose's Document.model method; use Omit to override
export type IAssistant = Omit<Document, 'model'> & {
  name: string;
  instructions: string;
  model: string;
  vectorStoreId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const AssistantSchema = new Schema<IAssistant>(
  {
    name:          { type: String, required: true },
    instructions:  { type: String, required: true },
    model:         { type: String, required: true, default: 'gpt-4o' },
    vectorStoreId: { type: String, required: true },
    isDefault:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Assistant ||
  mongoose.model<IAssistant>('Assistant', AssistantSchema);
