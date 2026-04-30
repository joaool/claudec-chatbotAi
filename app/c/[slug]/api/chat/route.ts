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

  const lastConv = await Conversation.findOne(
    { clientId, sessionId, assistantId: assistantIdStr },
    { responseId: 1 },
    { sort: { timestamp: -1 } }
  );
  const previousResponseId = lastConv?.responseId || null;
  const userIp = getClientIp(request);
  const geoPromise = getGeoData(userIp);

  const callParams = {
    model: assistant.model as string,
    instructions: assistant.instructions as string,
    input: message.trim(),
    tools: [{ type: 'file_search' as const, vector_store_ids: [assistant.vectorStoreId as string] }],
    stream: true as const,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let oaiStream: any;
  try {
    oaiStream = await openai.responses.create(
      previousResponseId ? { ...callParams, previous_response_id: previousResponseId } : callParams
    );
  } catch (openaiErr: unknown) {
    const isExpired =
      typeof openaiErr === 'object' && openaiErr !== null &&
      'status' in openaiErr && (openaiErr as { status: number }).status === 400;
    if (previousResponseId && isExpired) {
      console.warn('[client chat] previous_response_id rejected, retrying without it');
      oaiStream = await openai.responses.create(callParams);
    } else {
      console.error('[client chat POST]', openaiErr);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      try {
        let fullAnswer = '';
        let responseId = '';

        for await (const event of oaiStream) {
          if (event.type === 'response.output_text.delta') {
            fullAnswer += event.delta;
            send({ t: 'delta', v: event.delta });
          } else if (event.type === 'response.completed') {
            responseId = event.response?.id ?? '';
          }
        }

        // Extract sources from completed response
        const sources: string[] = [];
        for await (const event of []) { void event; } // drain (already consumed above)
        // Re-iterate completed output via accumulated stream if available
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const finalResp = (oaiStream as any).finalResponse?.() ?? null;
          if (finalResp) {
            const output = (await finalResp)?.output ?? [];
            for (const item of output) {
              if (item.type === 'message') {
                for (const block of item.content ?? []) {
                  if (block.type === 'output_text') {
                    for (const ann of block.annotations ?? []) {
                      if (ann.type === 'file_citation') {
                        const name = (ann as { filename?: string }).filename ?? ann.file_id;
                        if (name && !sources.includes(name)) sources.push(name);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch { /* sources unavailable */ }

        send({ t: 'done', sources });

        // Save to DB after stream completes
        const geo = await geoPromise;
        await Conversation.create({
          clientId,
          sessionId,
          assistantId: assistantIdStr,
          question: message.trim(),
          answer: fullAnswer,
          sources,
          userIp,
          responseId,
          ...geo,
        });
      } catch (err) {
        console.error('[client chat stream]', err);
        send({ t: 'error', v: 'Something went wrong.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
