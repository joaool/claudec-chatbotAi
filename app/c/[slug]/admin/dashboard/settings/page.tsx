import { use } from 'react';
import ClientSettingsPage from '@/components/client/SettingsPage';

export default function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <ClientSettingsPage slug={slug} />;
}
