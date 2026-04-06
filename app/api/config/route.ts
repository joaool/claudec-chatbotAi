import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  try {
    await connectDB();
    const config = await mongoose.connection.db!.collection('appconfigs').findOne({});
    return NextResponse.json({
      label:       (config?.label as string)       || process.env.NEXT_PUBLIC_APP_NAME || 'Chatbot AI',
      iconDataUrl: (config?.iconDataUrl as string) || '',
    });
  } catch {
    return NextResponse.json({
      label:       process.env.NEXT_PUBLIC_APP_NAME || 'Chatbot AI',
      iconDataUrl: '',
    });
  }
}
