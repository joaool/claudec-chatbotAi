import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { signClientToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    await connectDB();
    const db = mongoose.connection.db!;
    const client = await db.collection('clients').findOne({ slug, isActive: true });

    const hash = client?.clientPasswordHash as string | undefined;
    if (!hash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = await signClientToken(client!._id.toString(), slug);
    const response = NextResponse.json({ success: true });
    response.cookies.set(`client_token_${slug}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('[client auth]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const response = NextResponse.json({ success: true });
  response.cookies.delete(`client_token_${slug}`);
  return response;
}
