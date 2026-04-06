import { use } from 'react';
import Link from 'next/link';

export default function ClientDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const CARDS = [
    { href: `/c/${slug}/admin/dashboard/documents`,  icon: '📄', title: 'Documents',  desc: 'Upload and manage knowledge base files.' },
    { href: `/c/${slug}/admin/dashboard/assistants`, icon: '🤖', title: 'Assistants', desc: 'Create and configure AI assistants.' },
    { href: `/c/${slug}/admin/dashboard/analytics`,  icon: '📊', title: 'Analytics',  desc: 'View your chatbot conversations.' },
    { href: `/c/${slug}/admin/dashboard/settings`,   icon: '⚙️', title: 'Settings',   desc: 'Update your chatbot label, icon and password.' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your AI chatbot.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map(card => (
          <Link key={card.href} href={card.href}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all group">
            <span className="text-3xl">{card.icon}</span>
            <h2 className="mt-4 text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{card.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
