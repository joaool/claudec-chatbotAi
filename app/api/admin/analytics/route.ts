import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Assistant from '@/models/Assistant';

// GET /api/admin/analytics?search=&dateFrom=&dateTo=&page=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo   = searchParams.get('dateTo');
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit    = 20;

    await connectDB();

    // Build MongoDB query
    const query: Record<string, unknown> = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) range.$gte = new Date(dateFrom);
      if (dateTo)   range.$lte = new Date(`${dateTo}T23:59:59`);
      query.timestamp = range;
    }

    const [total, conversations] = await Promise.all([
      Conversation.countDocuments(query),
      Conversation.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    // Enrich with assistant names
    const assistantIds = [...new Set(conversations.map((c) => c.assistantId))];
    const assistants = await Assistant.find({ _id: { $in: assistantIds } })
      .select('name')
      .lean<Array<{ _id: mongoose.Types.ObjectId; name: string }>>();
    const nameMap = Object.fromEntries(
      assistants.map((a) => [a._id.toString(), a.name])
    );

    const enriched = conversations.map((c) => ({
      ...c,
      assistantName: nameMap[c.assistantId] ?? 'Unknown',
    }));

    return NextResponse.json({
      conversations: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[analytics GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
