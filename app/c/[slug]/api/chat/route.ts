import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { decrypt } from '@/lib/crypto';
import Conversation from '@/models/Conversation';
import Assistant from '@/models/Assistant';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function getGeoData(ip: string) {
  const empty = { country: '', regionName: '', city: '' };
  if (!ip || ip === 'unknown' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1' || ip === '::1') return empty;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status !== 'success') return empty;
    return { country: data.country || '', regionName: data.regionName || '', city: data.city || '' };
  } catch { return empty; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ messages: [] });

    await connectDB();

    const db = mongoose.connection.db!;
    const client = await db.collection('clients').findOne({ slug, isActive: true });
    if (!client) return NextResponse.json({ messages: [] });

    const conversations = await Conversation.find(
      { clientId: client._id.toString(), sessionId },
      { question: 1, answer: 1, sources: 1, timestamp: 1 }
    )
      .sort({ timestamp: 1 })
      .limit(50)
      .lean();

    const messages = conversations.flatMap(c => [
      { role: 'user',      content: c.question },
      { role: 'assistant', content: c.answer, sources: c.sources ?? [] },
    ]);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[client chat GET]', error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { message, sessionId, assistantId } = await request.json();

    if (!message?.trim() || !sessionId) {
      return NextResponse.json({ error: 'message and sessionId are required' }, { status: 400 });
    }

    await connectDB();

    const db = mongoose.connection.db!;
    const client = await db.collection('clients').findOne({ slug, isActive: true });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const apiKey = decrypt(client.openaiApiKeyEncrypted as string ?? '');
    if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });

    const openai = new OpenAI({ apiKey });
    const clientId = client._id.toString();

    const assistant = assistantId
      ? await Assistant.findOne({ _id: assistantId, clientId })
      : await Assistant.findOne({ clientId, isDefault: true });

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant configured.' }, { status: 404 });
    }

    const assistantIdStr = assistant._id.toString();

    // Find the last response ID for this session + assistant to enable stateful conversation
    const lastConv = await Conversation.findOne(
      { clientId, sessionId, assistantId: assistantIdStr },
      { responseId: 1 },
      { sort: { timestamp: -1 } }
    );
    const previousResponseId = lastConv?.responseId || null;

    const userIp = getClientIp(request);

    let response;
    try {
      response = await openai.responses.create({
        model: assistant.model,
        instructions: assistant.instructions,
        input: message.trim(),
        tools: [{ type: 'file_search', vector_store_ids: [assistant.vectorStoreId] }],
        ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
      });
    } catch (openaiErr: unknown) {
      // If the previous_response_id is stale/expired, retry without it
      const isExpiredContext =
        typeof openaiErr === 'object' && openaiErr !== null &&
        'status' in openaiErr && (openaiErr as { status: number }).status === 400;
      if (previousResponseId && isExpiredContext) {
        console.warn('[client chat] previous_response_id rejected, retrying without it');
        response = await openai.responses.create({
          model: assistant.model,
          instructions: assistant.instructions,
          input: message.trim(),
          tools: [{ type: 'file_search', vector_store_ids: [assistant.vectorStoreId] }],
        });
      } else {
        throw openaiErr;
      }
    }

    const geo = await getGeoData(userIp);

    const answer = response.output_text;
    const sources: string[] = [];
    for (const item of response.output) {
      if (item.type === 'message') {
        for (const block of item.content) {
          if (block.type === 'output_text') {
            for (const annotation of block.annotations) {
              if (annotation.type === 'file_citation') {
                const name = (annotation as { filename?: string }).filename ?? annotation.file_id;
                if (name && !sources.includes(name)) sources.push(name);
              }
            }
          }
        }
      }
    }

    await Conversation.create({
      clientId,
      sessionId,
      assistantId: assistantIdStr,
      question: message.trim(),
      answer,
      sources,
      userIp,
      responseId: response.id,
      ...geo,
    });

    return NextResponse.json({ answer, sources });
  } catch (error) {
    console.error('[client chat]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
