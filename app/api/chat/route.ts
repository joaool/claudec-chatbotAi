import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { connectDB } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Assistant from '@/models/Assistant';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

interface GeoData {
  country: string;
  regionName: string;
  city: string;
}

async function getGeoData(ip: string): Promise<GeoData> {
  const empty = { country: '', regionName: '', city: '' };
  // Skip lookup for private/unknown IPs
  if (!ip || ip === 'unknown' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1' || ip === '::1') {
    return empty;
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status !== 'success') return empty;
    return { country: data.country || '', regionName: data.regionName || '', city: data.city || '' };
  } catch {
    return empty;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, assistantId } = await request.json();

    if (!message?.trim() || !sessionId) {
      return NextResponse.json(
        { error: 'message and sessionId are required' },
        { status: 400 }
      );
    }

    const userIp = getClientIp(request);
    const geo = await getGeoData(userIp);

    await connectDB();

    const assistant = assistantId
      ? await Assistant.findById(assistantId)
      : await Assistant.findOne({ isDefault: true });

    if (!assistant) {
      return NextResponse.json(
        { error: 'No assistant configured. Ask an admin to create one.' },
        { status: 404 }
      );
    }

    const response = await openai.responses.create({
      model: assistant.model,
      instructions: assistant.instructions,
      input: message.trim(),
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [assistant.vectorStoreId],
        },
      ],
    });

    const answer = response.output_text;

    // Extract cited filenames from annotations
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
      sessionId,
      assistantId: assistant._id.toString(),
      question: message.trim(),
      answer,
      sources,
      userIp,
      country:    geo.country,
      regionName: geo.regionName,
      city:       geo.city,
    });

    return NextResponse.json({ answer, sources });
  } catch (error) {
    console.error('[chat]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
