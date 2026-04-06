'use client';
import { usePathname, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const NAV = [
    { href: `/c/${slug}/admin/dashboard`,            label: 'Overview',   icon: '▤'  },
    { href: `/c/${slug}/admin/dashboard/documents`,  label: 'Documents',  icon: '📄' },
    { href: `/c/${slug}/admin/dashboard/assistants`, label: 'Assistants', icon: '🤖' },
    { href: `/c/${slug}/admin/dashboard/analytics`,  label: 'Analytics',  icon: '📊' },
    { href: `/c/${slug}/admin/dashboard/settings`,   label: 'Settings',   icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await fetch(`/c/${slug}/api/auth`, { method: 'DELETE' });
    router.push(`/c/${slug}/admin/login`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Admin Panel</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{slug}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <span className="text-base">{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <Link href={`/c/${slug}`} target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors mb-1">
            <span>💬</span>View Chatbot
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <span>🚪</span>Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
