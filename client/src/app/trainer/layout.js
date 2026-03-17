'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { label: 'Overview', href: '/trainer', icon: '📊' },
  { label: 'My Teams', href: '/trainer/teams', icon: '👥' },
  { label: 'Players', href: '/trainer/athletes', icon: '🏀' },
  { label: 'Messages', href: '/trainer/messages', icon: '💬' },
  { label: 'Profile', href: '/trainer/profile', icon: '👤' },
];

export default function TrainerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token) {
      router.push('/login');
      return;
    }
    if (role === 'athlete') {
      router.push('/dashboard');
      return;
    }
    const email = localStorage.getItem('email') || '';
    setUserName(email.split('@')[0]);
  }, [router]);

  function handleLogout() {
    localStorage.clear();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 border-r border-gray-800 transform transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#1a1a2e' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
          <span className="text-xl font-black" style={{ color: '#2563eb' }}>PEAK</span>
          <span className="text-xl font-black text-white">FORM</span>
          <span
            className="ml-1 text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: 'rgba(232,93,38,0.2)', color: '#2563eb' }}
          >
            COACH
          </span>
        </div>

        {/* User */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: '#2563eb' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-white capitalize">{userName}</div>
              <div className="text-xs text-gray-500">Coach</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/trainer' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                  active ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                style={active ? { backgroundColor: 'rgba(232,93,38,0.2)', color: '#2563eb' } : {}}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all font-medium text-sm"
          >
            <span className="text-lg">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Mobile header */}
        <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-800 md:hidden" style={{ backgroundColor: '#1a1a2e' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">☰</button>
          <span className="font-black" style={{ color: '#2563eb' }}>PEAKFORM</span>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
