import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { toFile } from 'openai';
import { connectDB } from '@/lib/mongodb';
import { decrypt } from '@/lib/crypto';
import Assistant from '@/models/Assistant';
import Client from '@/models/Client';

async function getContext(slug: string, assistantId?: string | null) {
  const clientDoc = await Client.findOne({ slug, isActive: true });
  if (!clientDoc) return null;
  const apiKey = decrypt(clientDoc.openaiApiKeyEncrypted);
  if (!apiKey) return null;
  const openai = new OpenAI({ apiKey });
  const clientId = clientDoc._id.toString();
  const assistant = assistantId
    ? await Assistant.findOne({ _id: assistantId, clientId })
    : await Assistant.findOne({ clientId, isDefault: true });
  return { openai, clientId, assistant };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const assistantId = new URL(request.url).searchParams.get('assistantId');
    await connectDB();
    const ctx = await getContext(slug, assistantId);
    if (!ctx) return NextResponse.json({ files: [] });
    if (!ctx.assistant) return NextResponse.json({ files: [] });

    const vsFiles = await ctx.openai.vectorStores.files.list(ctx.assistant.vectorStoreId);
    const files = await Promise.all(vsFiles.data.map(async (vsFile) => {
      try {
        const file = await ctx.openai.files.retrieve(vsFile.id);
        return { id: vsFile.id, filename: file.filename, size: file.bytes, createdAt: file.created_at, status: vsFile.status };
      } catch {
        return { id: vsFile.id, filename: 'Unknown', size: 0, createdAt: 0, status: vsFile.status };
      }
    }));
    return NextResponse.json({ files, vectorStoreId: ctx.assistant.vectorStoreId });
  } catch (error) {
    console.error('[client documents GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const assistantId = formData.get('assistantId') as string | null;
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

    await connectDB();
    const ctx = await getContext(slug, assistantId);
    if (!ctx?.assistant) return NextResponse.json({ error: 'No assistant found' }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileForUpload = await toFile(buffer, file.name, { type: file.type });
    const uploaded = await ctx.openai.files.create({ file: fileForUpload, purpose: 'assistants' });
    await ctx.openai.vectorStores.files.create(ctx.assistant.vectorStoreId, { file_id: uploaded.id });

    return NextResponse.json({ success: true, file: { id: uploaded.id, filename: uploaded.filename } });
  } catch (error) {
    console.error('[client documents POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = new URL(request.url).searchParams;
    const fileId = searchParams.get('fileId');
    const assistantId = searchParams.get('assistantId');
    if (!fileId) return NextResponse.json({ error: 'fileId is required' }, { status: 400 });

    await connectDB();
    const ctx = await getContext(slug, assistantId);
    if (!ctx?.assistant) return NextResponse.json({ error: 'No assistant found' }, { status: 404 });

    try { await ctx.openai.vectorStores.files.del(ctx.assistant.vectorStoreId, fileId); } catch (e) { console.warn(e); }
    try { await ctx.openai.files.del(fileId); } catch (e) { console.warn(e); }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[client documents DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
