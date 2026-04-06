import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

async function getCollection() {
  await connectDB();
  return mongoose.connection.db!.collection('appconfigs');
}

export async function GET() {
  try {
    const col = await getCollection();
    const config = await col.findOne({});
    return NextResponse.json({
      label:             (config?.label as string)       || process.env.NEXT_PUBLIC_APP_NAME || 'Chatbot AI',
      iconDataUrl:       (config?.iconDataUrl as string) || '',
      hasClientPassword: !!(config?.clientPasswordHash as string),
    });
  } catch (error) {
    console.error('[admin/config GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/config — branding only (label + icon)
export async function PUT(request: NextRequest) {
  try {
    const { label, iconDataUrl } = await request.json();

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const col = await getCollection();
    await col.updateOne(
      {},
      { $set: { label: label.trim(), iconDataUrl: iconDataUrl ?? '' } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/config PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
