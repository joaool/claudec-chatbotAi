import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  slug: string;
  name: string;
  label: string;
  iconDataUrl: string;
  clientPasswordHash: string;
  openaiApiKeyEncrypted: string;
  allowedOrigin: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    slug:                 { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:                 { type: String, required: true },
    label:                { type: String, default: 'Chatbot AI' },
    iconDataUrl:          { type: String, default: '' },
    clientPasswordHash:   { type: String, default: '' },
    openaiApiKeyEncrypted:{ type: String, default: '' },
    allowedOrigin:        { type: String, default: '' }, // e.g. https://www.example.com
    isActive:             { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Client ||
  mongoose.model<IClient>('Client', ClientSchema);
