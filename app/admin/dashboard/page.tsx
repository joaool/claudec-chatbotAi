import Link from 'next/link';

const CARDS = [
  {
    href: '/admin/dashboard/documents',
    icon: '📄',
    title: 'Documents',
    desc: 'Upload and manage knowledge base files for your assistants.',
  },
  {
    href: '/admin/dashboard/assistants',
    icon: '🤖',
    title: 'Assistants',
    desc: 'Create and configure AI assistants with custom instructions and models.',
  },
  {
    href: '/admin/dashboard/analytics',
    icon: '📊',
    title: 'Analytics',
    desc: 'Search and review all user questions and answers.',
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your AI chatbot configuration.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <span className="text-3xl">{card.icon}</span>
            <h2 className="mt-4 text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
