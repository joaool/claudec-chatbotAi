import { use } from 'react';
import ClientDocumentManager from '@/components/client/DocumentManager';

export default function ClientDocumentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Documents</h1>
      <p className="text-sm text-gray-500 mb-8">Upload files to the knowledge base.</p>
      <ClientDocumentManager slug={slug} />
    </div>
  );
}
