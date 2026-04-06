import mongoose, { Schema, Document } from 'mongoose';

export type IAssistant = Omit<Document, 'model'> & {
  clientId: string;
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
    clientId:      { type: String, required: true },
    name:          { type: String, required: true },
    instructions:  { type: String, required: true },
    model:         { type: String, required: true, default: 'gpt-4o' },
    vectorStoreId: { type: String, required: true },
    isDefault:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

AssistantSchema.index({ clientId: 1 });

export default mongoose.models.Assistant ||
  mongoose.model<IAssistant>('Assistant', AssistantSchema);
