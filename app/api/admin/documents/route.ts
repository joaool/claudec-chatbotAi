import { NextRequest, NextResponse } from 'next/server';
import { toFile } from 'openai';
import { openai } from '@/lib/openai';
import { connectDB } from '@/lib/mongodb';
import Assistant from '@/models/Assistant';

async function resolveAssistant(assistantId?: string | null) {
  return assistantId
    ? Assistant.findById(assistantId)
    : Assistant.findOne({ isDefault: true });
}

// GET /api/admin/documents?assistantId=<id>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    await connectDB();

    const assistant = await resolveAssistant(searchParams.get('assistantId'));
    if (!assistant) return NextResponse.json({ files: [] });

    const vsFiles = await openai.vectorStores.files.list(assistant.vectorStoreId);

    const files = await Promise.all(
      vsFiles.data.map(async (vsFile) => {
        try {
          const file = await openai.files.retrieve(vsFile.id);
          return {
            id: vsFile.id,
            filename: file.filename,
            size: file.bytes,
            createdAt: file.created_at,
            status: vsFile.status,
          };
        } catch {
          return { id: vsFile.id, filename: 'Unknown', size: 0, createdAt: 0, status: vsFile.status };
        }
      })
    );

    return NextResponse.json({ files, vectorStoreId: assistant.vectorStoreId });
  } catch (error) {
    console.error('[documents GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/documents  (multipart form: file + assistantId)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const assistantId = formData.get('assistantId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    await connectDB();
    const assistant = await resolveAssistant(assistantId);
    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 404 });
    }

    // Convert Web File → OpenAI-compatible file object with correct name + type
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileForUpload = await toFile(buffer, file.name, { type: file.type });

    // Upload to OpenAI Files
    const uploaded = await openai.files.create({ file: fileForUpload, purpose: 'assistants' });

    // Attach to the assistant's vector store
    await openai.vectorStores.files.create(assistant.vectorStoreId, {
      file_id: uploaded.id,
    });

    return NextResponse.json({
      success: true,
      file: { id: uploaded.id, filename: uploaded.filename },
    });
  } catch (error) {
    console.error('[documents POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/documents?fileId=<id>&assistantId=<id>
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    await connectDB();
    const assistant = await resolveAssistant(searchParams.get('assistantId'));
    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 404 });
    }

    // Remove from vector store
    try {
      await openai.vectorStores.files.del(assistant.vectorStoreId, fileId);
    } catch (e) {
      console.warn('[documents DELETE] vector store removal failed:', e);
    }

    // Delete the underlying file (best-effort — may already be gone)
    try {
      await openai.files.del(fileId);
    } catch (e) {
      console.warn('[documents DELETE] file deletion failed:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[documents DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
