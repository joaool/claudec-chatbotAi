import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Assistant from '@/models/Assistant';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo   = searchParams.get('dateTo');
    const clientId = searchParams.get('clientId') || '';
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit    = 20;

    await connectDB();

    const query: Record<string, unknown> = {};
    if (clientId) query.clientId = clientId;
    if (search)   query.$text = { $search: search };
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) range.$gte = new Date(dateFrom);
      if (dateTo)   range.$lte = new Date(`${dateTo}T23:59:59`);
      query.timestamp = range;
    }

    const [total, conversations] = await Promise.all([
      Conversation.countDocuments(query),
      Conversation.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    const assistantIds = [...new Set(conversations.map((c) => c.assistantId))];
    const clientIds    = [...new Set(conversations.map((c) => c.clientId))];

    const [assistants, clients] = await Promise.all([
      Assistant.find({ _id: { $in: assistantIds } }).select('name').lean<Array<{ _id: mongoose.Types.ObjectId; name: string }>>(),
      Client.find({ _id: { $in: clientIds } }).select('name slug').lean<Array<{ _id: mongoose.Types.ObjectId; name: string; slug: string }>>(),
    ]);

    const assistantMap = Object.fromEntries(assistants.map((a) => [a._id.toString(), a.name]));
    const clientMap    = Object.fromEntries(clients.map((c) => [c._id.toString(), `${c.name} (${c.slug})`]));

    const enriched = conversations.map((c) => ({
      ...c,
      assistantName: assistantMap[c.assistantId] ?? 'Unknown',
      clientName:    clientMap[c.clientId]       ?? 'Unknown',
    }));

    // Also return all clients for the filter dropdown
    const allClients = await Client.find().select('_id name slug').lean();

    return NextResponse.json({ conversations: enriched, total, page, totalPages: Math.ceil(total / limit), allClients });
  } catch (error) {
    console.error('[admin analytics GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
