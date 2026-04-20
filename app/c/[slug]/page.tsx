import { headers } from 'next/headers';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import ClientChatPage from '@/components/chat/ClientChatPage';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  await connectDB();
  const db = mongoose.connection.db!;
  const client = await db.collection('clients').findOne({ slug, isActive: true });

  if (!client) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">Chatbot not found.</p>
      </div>
    );
  }

  // Check iframe embedding authorization
  const headersList = await headers();
  const secFetchDest = headersList.get('sec-fetch-dest'); // 'iframe' when loaded inside an iframe
  const referer = headersList.get('referer') || '';

  if (secFetchDest === 'iframe') {
    const allowedOrigin = (client.allowedOrigin as string | undefined)?.trim();

    if (allowedOrigin) {
      // Validate that the referer matches the allowed origin
      let refererOrigin = '';
      try { refererOrigin = new URL(referer).origin; } catch { /* no referer */ }

      let allowedOriginNormalized = '';
      try { allowedOriginNormalized = new URL(allowedOrigin).origin; } catch { /* invalid origin stored */ }

      if (!allowedOriginNormalized || refererOrigin !== allowedOriginNormalized) {
        return (
          <div className="flex h-screen items-center justify-center bg-white p-6 text-center">
            <p className="text-sm text-gray-400">
              This chatbot is not authorized to be embedded on this site.
            </p>
          </div>
        );
      }
    }
    // If allowedOrigin is empty, embedding is allowed from any site
  }

  return <ClientChatPage slug={slug} />;
}
