import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

// PUT /c/:slug/api/settings — client admin can update their own branding + password
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { label, iconDataUrl, clientPassword, removeClientPassword } = await request.json();

    await connectDB();
    const update: Record<string, unknown> = {};

    if (label?.trim()) {
      update.label = label.trim();
      update.iconDataUrl = iconDataUrl ?? '';
    }

    if (removeClientPassword) {
      update.clientPasswordHash = '';
    } else if (clientPassword) {
      update.clientPasswordHash = await bcrypt.hash(clientPassword, 10);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await Client.findOneAndUpdate({ slug }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[client settings PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
