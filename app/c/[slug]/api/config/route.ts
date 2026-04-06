import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();
    const client = await Client.findOne({ slug, isActive: true }).select('label iconDataUrl name');
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ label: client.label, iconDataUrl: client.iconDataUrl });
  } catch (error) {
    console.error('[client config GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
