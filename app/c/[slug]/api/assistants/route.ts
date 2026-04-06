import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { decrypt } from '@/lib/crypto';
import Assistant from '@/models/Assistant';

async function getOpenAI(slug: string) {
  const db = mongoose.connection.db!;
  const client = await db.collection('clients').findOne({ slug, isActive: true });
  if (!client) {
    console.error(`[getOpenAI] No active client found for slug="${slug}"`);
    return null;
  }
  const encrypted = client.openaiApiKeyEncrypted as string | undefined;
  if (!encrypted) {
    console.error(`[getOpenAI] openaiApiKeyEncrypted is empty for slug="${slug}"`);
    return null;
  }
  const apiKey = decrypt(encrypted);
  if (!apiKey) {
    console.error(`[getOpenAI] decrypt returned empty string for slug="${slug}" — JWT_SECRET mismatch?`);
    return null;
  }
  return { openai: new OpenAI({ apiKey }), clientId: client._id.toString() };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();
    const ctx = await getOpenAI(slug);
    if (!ctx) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const assistants = await Assistant.find({ clientId: ctx.clientId }).sort({ createdAt: -1 });
    return NextResponse.json({ assistants });
  } catch (error) {
    console.error('[client assistants GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { name, instructions, model, makeDefault } = await request.json();
    if (!name || !instructions || !model) {
      return NextResponse.json({ error: 'name, instructions, and model are required' }, { status: 400 });
    }

    await connectDB();
    const ctx = await getOpenAI(slug);
    if (!ctx) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    let vectorStore;
    try {
      vectorStore = await ctx.openai.vectorStores.create({ name: `${name} - Knowledge Base` });
    } catch (openaiErr) {
      console.error('[client assistants POST] OpenAI vectorStores.create failed:', openaiErr);
      return NextResponse.json({ error: 'Failed to create vector store — check OpenAI API key' }, { status: 502 });
    }
    if (makeDefault) await Assistant.updateMany({ clientId: ctx.clientId }, { isDefault: false });

    const assistant = await Assistant.create({
      clientId: ctx.clientId,
      name, instructions, model,
      vectorStoreId: vectorStore.id,
      isDefault: makeDefault ?? false,
    });
    return NextResponse.json({ assistant }, { status: 201 });
  } catch (error) {
    console.error('[client assistants POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { id, name, instructions, model, isDefault } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await connectDB();
    const ctx = await getOpenAI(slug);
    if (!ctx) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    if (isDefault) await Assistant.updateMany({ clientId: ctx.clientId, _id: { $ne: id } }, { isDefault: false });

    const assistant = await Assistant.findOneAndUpdate(
      { _id: id, clientId: ctx.clientId },
      { name, instructions, model, isDefault },
      { new: true }
    );
    if (!assistant) return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    return NextResponse.json({ assistant });
  } catch (error) {
    console.error('[client assistants PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await connectDB();
    const ctx = await getOpenAI(slug);
    if (!ctx) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const assistant = await Assistant.findOne({ _id: id, clientId: ctx.clientId });
    if (!assistant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    try { await ctx.openai.vectorStores.del(assistant.vectorStoreId); } catch {}
    await Assistant.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[client assistants DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
