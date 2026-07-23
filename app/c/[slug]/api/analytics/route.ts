import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Assistant from '@/models/Assistant';
import Client from '@/models/Client';

function buildQuery(clientId: string, searchParams: URLSearchParams): Record<string, unknown> {
  const search   = searchParams.get('search') || '';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo   = searchParams.get('dateTo');

  const query: Record<string, unknown> = { clientId };
  if (search) query.$text = { $search: search };
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo)   range.$lte = new Date(`${dateTo}T23:59:59`);
    query.timestamp = range;
  }
  return query;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 20;

    await connectDB();
    const client = await Client.findOne({ slug });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const query = buildQuery(client._id.toString(), searchParams);

    const [total, conversations] = await Promise.all([
      Conversation.countDocuments(query),
      Conversation.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    const assistantIds = [...new Set(conversations.map((c) => c.assistantId))];
    const assistants = await Assistant.find({ _id: { $in: assistantIds } })
      .select('name').lean<Array<{ _id: mongoose.Types.ObjectId; name: string }>>();
    const nameMap = Object.fromEntries(assistants.map((a) => [a._id.toString(), a.name]));

    const enriched = conversations.map((c) => ({ ...c, assistantName: nameMap[c.assistantId] ?? 'Unknown' }));

    return NextResponse.json({ conversations: enriched, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[client analytics GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    await connectDB();
    const client = await Client.findOne({ slug });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const query = buildQuery(client._id.toString(), searchParams);
    const result = await Conversation.deleteMany(query);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('[client analytics DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
