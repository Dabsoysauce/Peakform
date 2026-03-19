'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AIAssistant from '../components/AIAssistant';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: '📊' },
  { label: 'Workouts', href: '/dashboard/workouts', icon: '🏀' },
  { label: 'Goals', href: '/dashboard/goals', icon: '🎯' },
  { label: 'Film Room', href: '/dashboard/media', icon: '🎬' },
  { label: 'Schedule', href: '/dashboard/schedule', icon: '📅' },
  { label: 'Messages', href: '/dashboard/messages', icon: '💬' },
  { label: 'Team', href: '/dashboard/team', icon: '👥' },
  { label: 'Notifications', href: '/dashboard/notifications', icon: '🔔' },
  { label: 'Profile', href: '/dashboard/profile', icon: '👤' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token) {
      router.push('/login');
      return;
    }
    if (role === 'trainer') {
      router.push('/trainer');
      return;
    }
    const email = localStorage.getItem('email') || '';
    setUserName(email.split('@')[0]);
    fetchUnreadCount(token);
  }, [router]);

  async function fetchUnreadCount(token) {
    try {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {}
  }

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
          <span className="text-xl font-black" style={{ color: '#2563eb' }}>ATHLETE</span>
          <span className="text-xl font-black text-white">EDGE</span>
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
              <div className="text-xs text-gray-500">Player</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isNotifications = item.href === '/dashboard/notifications';
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                  active
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                style={active ? { backgroundColor: 'rgba(232,93,38,0.2)', color: '#2563eb' } : {}}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {isNotifications && unreadCount > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#ef4444', minWidth: '20px', textAlign: 'center' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
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
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            ☰
          </button>
          <span className="font-black" style={{ color: '#2563eb' }}>ATHLETE EDGE</span>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <AIAssistant />
    </div>
  );
}
