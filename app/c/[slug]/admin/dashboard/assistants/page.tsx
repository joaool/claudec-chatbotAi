import { use } from 'react';
import ClientAssistantsPage from '@/components/client/AssistantsPage';

export default function AssistantsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <ClientAssistantsPage slug={slug} />;
}
