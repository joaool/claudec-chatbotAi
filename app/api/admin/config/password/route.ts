import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

// Use the raw MongoDB driver to bypass any stale Mongoose model cache
async function getCollection() {
  await connectDB();
  return mongoose.connection.db!.collection('appconfigs');
}

export async function PUT(request: NextRequest) {
  try {
    const { clientPassword, remove } = await request.json();
    const col = await getCollection();

    if (remove) {
      await col.updateOne({}, { $set: { clientPasswordHash: '' } }, { upsert: true });
      return NextResponse.json({ success: true, hasClientPassword: false });
    }

    if (!clientPassword || clientPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(clientPassword, 10);
    await col.updateOne({}, { $set: { clientPasswordHash: hash } }, { upsert: true });

    // Verify it was actually written
    const saved = await col.findOne({});
    console.log('[config/password] saved hash prefix:', saved?.clientPasswordHash?.substring(0, 10));

    return NextResponse.json({ success: true, hasClientPassword: true });
  } catch (error) {
    console.error('[config/password PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
