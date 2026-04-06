import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { encrypt } from '@/lib/crypto';
import Client from '@/models/Client';

// POST /api/admin/migrate
// One-time migration: reads existing AppConfig + Assistants + Conversations
// and creates a Client document for the "default" tenant.
// Safe to call multiple times — skips if slug already exists.
export async function POST() {
  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const existing = await Client.findOne({ slug: 'default' });
    if (existing) {
      return NextResponse.json({ message: 'Already migrated (slug "default" exists)', clientId: existing._id });
    }

    // Read old AppConfig
    const appConfig = await db.collection('appconfigs').findOne({});

    // Create a Client for existing data
    const clientPasswordHash = appConfig?.clientPasswordHash as string || '';
    const client = await Client.create({
      slug: 'default',
      name: 'Default Client',
      label: (appConfig?.label as string) || process.env.NEXT_PUBLIC_APP_NAME || 'Chatbot AI',
      iconDataUrl: (appConfig?.iconDataUrl as string) || '',
      clientPasswordHash,
      openaiApiKeyEncrypted: encrypt(process.env.OPENAI_API_KEY || ''),
      isActive: true,
    });

    const clientId = client._id.toString();

    // Migrate assistants
    const assistantsResult = await db.collection('assistants').updateMany(
      { clientId: { $exists: false } },
      { $set: { clientId } }
    );

    // Migrate conversations
    const conversationsResult = await db.collection('conversations').updateMany(
      { clientId: { $exists: false } },
      { $set: { clientId } }
    );

    return NextResponse.json({
      success: true,
      clientId,
      slug: 'default',
      assistantsMigrated: assistantsResult.modifiedCount,
      conversationsMigrated: conversationsResult.modifiedCount,
      message: `Migration complete. Chat: /c/default  Admin: /c/default/admin`,
    });
  } catch (error) {
    console.error('[migrate]', error);
    return NextResponse.json({ error: 'Migration failed', detail: String(error) }, { status: 500 });
  }
}
