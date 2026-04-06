import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { signAdminToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';


export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // 1. Super admin password (env var)
    if (password === process.env.ADMIN_PASSWORD) {
      const token = await signAdminToken();
      const res = NextResponse.json({ success: true });
      res.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
      return res;
    }

    // 2. Client password — read directly from raw MongoDB driver to avoid stale model cache
    await connectDB();
    const config = await mongoose.connection.db!
      .collection('appconfigs')
      .findOne({}, { projection: { clientPasswordHash: 1 } });

    console.log('[auth] config found:', !!config);
    console.log('[auth] clientPasswordHash set:', !!config?.clientPasswordHash);

    if (config?.clientPasswordHash) {
      const match = await bcrypt.compare(password, config.clientPasswordHash as string);
      console.log('[auth] bcrypt.compare result:', match);

      if (match) {
        const token = await signAdminToken();
        const res = NextResponse.json({ success: true });
        res.cookies.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        });
        return res;
      }
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    console.error('[admin/auth POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  return response;
}
