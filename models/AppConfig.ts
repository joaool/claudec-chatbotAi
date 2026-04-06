import mongoose, { Schema, Document } from 'mongoose';

export interface IAppConfig extends Document {
  label: string;
  iconDataUrl: string;
  clientPasswordHash: string;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    label:              { type: String, default: 'Chatbot AI' },
    iconDataUrl:        { type: String, default: '' },
    clientPasswordHash: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.AppConfig ||
  mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
