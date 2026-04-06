import Link from 'next/link';

const CARDS = [
  { href: '/admin/dashboard/clients',   icon: '🏢', title: 'Clients',   desc: 'Create and manage client accounts, API keys, and passwords.' },
  { href: '/admin/dashboard/analytics', icon: '📊', title: 'Analytics', desc: 'View all conversations across every client.' },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">FrameLink Admin</h1>
      <p className="text-sm text-gray-500 mb-8">Manage all clients and view global analytics.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {CARDS.map((card) => (
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
