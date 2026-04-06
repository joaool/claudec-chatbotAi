import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { encrypt } from '@/lib/crypto';
import Client from '@/models/Client';

// GET /api/admin/clients
export async function GET() {
  try {
    await connectDB();
    const clients = await Client.find()
      .select('-openaiApiKeyEncrypted -clientPasswordHash')
      .sort({ createdAt: -1 });
    return NextResponse.json({ clients });
  } catch (error) {
    console.error('[clients GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/clients — create new client
export async function POST(request: NextRequest) {
  try {
    const { slug, name, label, iconDataUrl, openaiApiKey, clientPassword } = await request.json();

    if (!slug || !name || !openaiApiKey) {
      return NextResponse.json({ error: 'slug, name, and openaiApiKey are required' }, { status: 400 });
    }

    await connectDB();

    const existing = await Client.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }

    const clientPasswordHash = clientPassword ? await bcrypt.hash(clientPassword, 10) : '';
    const openaiApiKeyEncrypted = encrypt(openaiApiKey);

    const client = await Client.create({
      slug: slug.toLowerCase(),
      name,
      label: label || name,
      iconDataUrl: iconDataUrl || '',
      clientPasswordHash,
      openaiApiKeyEncrypted,
    });

    const safe = { ...client.toObject(), openaiApiKeyEncrypted: undefined, clientPasswordHash: undefined };
    return NextResponse.json({ client: safe }, { status: 201 });
  } catch (error) {
    console.error('[clients POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/clients — update client
export async function PUT(request: NextRequest) {
  try {
    const { id, name, label, iconDataUrl, openaiApiKey, clientPassword, isActive } = await request.json();

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await connectDB();

    const update: Record<string, unknown> = { name, label, iconDataUrl, isActive };
    if (openaiApiKey) update.openaiApiKeyEncrypted = encrypt(openaiApiKey);
    if (clientPassword) update.clientPasswordHash = await bcrypt.hash(clientPassword, 10);

    const client = await Client.findByIdAndUpdate(id, update, { new: true })
      .select('-openaiApiKeyEncrypted -clientPasswordHash');

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    return NextResponse.json({ client });
  } catch (error) {
    console.error('[clients PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/clients?id=<id>
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await connectDB();
    await Client.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[clients DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
