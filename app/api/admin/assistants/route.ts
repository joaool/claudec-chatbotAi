import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { connectDB } from '@/lib/mongodb';
import Assistant from '@/models/Assistant';

// GET /api/admin/assistants
export async function GET() {
  try {
    await connectDB();
    const assistants = await Assistant.find().sort({ createdAt: -1 });
    return NextResponse.json({ assistants });
  } catch (error) {
    console.error('[assistants GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/assistants  — creates a new vector store + assistant
export async function POST(request: NextRequest) {
  try {
    const { name, instructions, model, makeDefault } = await request.json();

    if (!name || !instructions || !model) {
      return NextResponse.json(
        { error: 'name, instructions, and model are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Create a fresh vector store in OpenAI
    const vectorStore = await openai.vectorStores.create({ name: `${name} - Knowledge Base` });

    if (makeDefault) {
      await Assistant.updateMany({}, { isDefault: false });
    }

    const assistant = await Assistant.create({
      name,
      instructions,
      model,
      vectorStoreId: vectorStore.id,
      isDefault: makeDefault ?? false,
    });

    return NextResponse.json({ assistant }, { status: 201 });
  } catch (error) {
    console.error('[assistants POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/assistants  — update existing assistant
export async function PUT(request: NextRequest) {
  try {
    const { id, name, instructions, model, isDefault } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await connectDB();

    if (isDefault) {
      await Assistant.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    const assistant = await Assistant.findByIdAndUpdate(
      id,
      { name, instructions, model, isDefault },
      { new: true }
    );

    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    return NextResponse.json({ assistant });
  } catch (error) {
    console.error('[assistants PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/assistants?id=<id>
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await connectDB();

    const assistant = await Assistant.findById(id);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    // Best-effort: delete the vector store from OpenAI
    try {
      await openai.vectorStores.del(assistant.vectorStoreId);
    } catch (e) {
      console.warn('[assistants DELETE] could not delete vector store:', e);
    }

    await Assistant.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[assistants DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
