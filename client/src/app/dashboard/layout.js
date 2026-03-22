'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AIAssistant from '../components/AIAssistant';
import TourGuide from '../components/TourGuide';

const Icons = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  workouts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  goals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  progress: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  media: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  ),
  schedule: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  messages: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  team: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  notifications: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

const navItems = [
  { label: 'Overview',      href: '/dashboard',               iconKey: 'overview' },
  { label: 'Workouts',      href: '/dashboard/workouts',      iconKey: 'workouts',      tour: 'nav-workouts' },
  { label: 'Goals',         href: '/dashboard/goals',         iconKey: 'goals',         tour: 'nav-goals' },
  { label: 'Progress',      href: '/dashboard/progress',      iconKey: 'progress' },
  { label: 'Film Room',     href: '/dashboard/media',         iconKey: 'media',         tour: 'nav-media' },
  { label: 'Schedule',      href: '/dashboard/schedule',      iconKey: 'schedule' },
  { label: 'Messages',      href: '/dashboard/messages',      iconKey: 'messages',      tour: 'nav-messages' },
  { label: 'Team',          href: '/dashboard/team',          iconKey: 'team',          tour: 'nav-team' },
  { label: 'Notifications', href: '/dashboard/notifications', iconKey: 'notifications' },
  { label: 'Profile',       href: '/dashboard/profile',       iconKey: 'profile',       tour: 'nav-profile' },
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
    if (!token) { router.push('/login'); return; }
    if (role === 'trainer') { router.push('/trainer'); return; }
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
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isNotifications = item.href === '/dashboard/notifications';
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                data-tour={item.tour || undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  active ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                style={active ? {
                  backgroundColor: 'rgba(37,99,235,0.12)',
                  color: '#60a5fa',
                  boxShadow: 'inset 3px 0 0 #2563eb',
                } : {}}
              >
                <span className={active ? 'text-blue-400' : ''}>{Icons[item.iconKey]}</span>
                <span className="flex-1">{item.label}</span>
                {isNotifications && unreadCount > 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: '#ef4444', minWidth: '20px', textAlign: 'center' }}
                  >
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
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Mobile header */}
        <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-800 md:hidden" style={{ backgroundColor: '#1a1a2e' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-black" style={{ color: '#2563eb' }}>ATHLETE EDGE</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
      <AIAssistant />
      <TourGuide role="athlete" />
    </div>
  );
}
