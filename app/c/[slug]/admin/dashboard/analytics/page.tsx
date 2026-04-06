import { use } from 'react';
import ClientAnalyticsTable from '@/components/client/AnalyticsTable';

export default function ClientAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Analytics</h1>
      <p className="text-sm text-gray-500 mb-8">Browse and search your chatbot conversations.</p>
      <ClientAnalyticsTable slug={slug} />
    </div>
  );
}
