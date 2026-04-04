'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AIAssistant from '../components/AIAssistant';
import TourGuide from '../components/TourGuide';

const Icons = {
  overview: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  workouts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  media: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  ),
  schedule: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  messages: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  team: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  basketball: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M4.93 4.93 C6.58 8.22 6.58 15.78 4.93 19.07"/>
      <path d="M19.07 4.93 C17.42 8.22 17.42 15.78 19.07 19.07"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  ),
};

const navItems = [
  { label: 'Overview',      href: '/dashboard',               iconKey: 'overview' },
  { label: 'Workouts',      href: '/dashboard/workouts',      iconKey: 'workouts',      tour: 'nav-workouts' },
  { label: 'Film Room',     href: '/dashboard/media',         iconKey: 'media',         tour: 'nav-media' },
  { label: 'Schedule',      href: '/dashboard/schedule',      iconKey: 'schedule' },
  { label: 'Messages',      href: '/dashboard/messages',      iconKey: 'messages',      tour: 'nav-messages' },
  { label: 'Team',          href: '/dashboard/team',          iconKey: 'team',          tour: 'nav-team' },
  { label: 'Notifications', href: '/dashboard/notifications', iconKey: 'notifications' },
  { label: 'Profile',       href: '/dashboard/profile',       iconKey: 'profile',       tour: 'nav-profile' },
  { label: 'Injury Recovery', href: '/dashboard/basketball-training', iconKey: 'basketball' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dockVisible, setDockVisible] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);

  // Auth check + profile loading
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token) { router.push('/'); return; }
    if (role === 'trainer') { router.push('/trainer'); return; }
    const storedName = localStorage.getItem('displayName');
    if (storedName) setUserName(storedName);
    else {
      const email = localStorage.getItem('email') || '';
      setUserName(email.split('@')[0]);
    }
    fetchUnreadCount(token);
    loadProfile(token);

    function handleProfileUpdate() { loadProfile(token); }
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [router]);

  // Scroll direction detection for dock hide/show
  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current + 10) {
        setDockVisible(false);
      } else if (currentY < lastScrollY.current - 5) {
        setDockVisible(true);
      }
      lastScrollY.current = currentY;

      // Always show dock when near top or bottom
      if (currentY < 50) setDockVisible(true);

      // Show dock after scrolling stops
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => setDockVisible(true), 1500);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout.current);
    };
  }, []);

  async function loadProfile(token) {
    try {
      const res = await fetch(`${API_URL}/athlete-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        if (name) {
          setUserName(name);
          localStorage.setItem('displayName', name);
        }
        if (data.photo_url) {
          setUserPhoto(data.photo_url);
        }
      }
    } catch {}
  }

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

  // Calculate scale for dock magnification effect
  const getIconScale = useCallback((index) => {
    if (hoveredIndex === -1) return 1;
    const distance = Math.abs(hoveredIndex - index);
    if (distance === 0) return 1.35;
    if (distance === 1) return 1.15;
    if (distance === 2) return 1.05;
    return 1;
  }, [hoveredIndex]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#08081a',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle mesh gradient background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 60% at 10% 20%, rgba(232,93,38,0.03) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 90% 80%, rgba(59,130,246,0.03) 0%, transparent 60%),
          radial-gradient(ellipse 50% 50% at 50% 50%, rgba(139,92,246,0.02) 0%, transparent 60%)
        `,
      }} />

      {/* ===== TOP BAR ===== */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(8,8,26,0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {/* Left: Logo + mobile hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Hamburger - mobile only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md-hidden-btn"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              padding: '4px',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '18px',
              fontWeight: 900,
              color: '#e85d04',
              letterSpacing: '1.5px',
            }}>ATHLETE</span>
            <span style={{
              fontSize: '18px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '1.5px',
            }}>EDGE</span>
          </Link>
        </div>

        {/* Right: Notification bell + User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Notification bell */}
          <Link
            href="/dashboard/notifications"
            style={{
              position: 'relative',
              color: pathname === '/dashboard/notifications' ? '#e85d04' : 'rgba(255,255,255,0.5)',
              transition: 'color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: pathname === '/dashboard/notifications' ? 'rgba(232,93,4,0.1)' : 'transparent',
              textDecoration: 'none',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'linear-gradient(135deg, #e85d04, #f97316)',
                color: 'white',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '9999px',
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 0 8px rgba(232,93,4,0.5)',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User avatar */}
          <Link href="/dashboard/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: 'white',
              background: 'linear-gradient(135deg, #e85d04, #f97316)',
              border: '2px solid rgba(232,93,4,0.3)',
              transition: 'border-color 0.2s, transform 0.2s',
              flexShrink: 0,
            }}>
              {userPhoto
                ? <img src={userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : userName.charAt(0).toUpperCase()}
            </div>
            <span className="desktop-only-name" style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'capitalize',
            }}>{userName}</span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)',
              padding: '8px',
              borderRadius: '10px',
              transition: 'color 0.2s, background 0.2s',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ===== MOBILE FULL-SCREEN OVERLAY MENU ===== */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(8,8,26,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          {/* Close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Logo */}
          <div style={{ marginBottom: '40px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: '#e85d04', letterSpacing: '2px' }}>ATHLETE</span>
            <span style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}> EDGE</span>
          </div>

          {/* Nav links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '260px' }}>
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const isNotifications = item.href === '/dashboard/notifications';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  data-tour={item.tour || undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#f97316' : 'rgba(255,255,255,0.5)',
                    background: active ? 'rgba(232,93,4,0.1)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ color: active ? '#f97316' : 'rgba(255,255,255,0.3)' }}>{Icons[item.iconKey]}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isNotifications && unreadCount > 0 && (
                    <span style={{
                      background: 'linear-gradient(135deg, #e85d04, #f97316)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      minWidth: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout in mobile menu */}
          <button
            onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
            style={{
              marginTop: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 20px',
              width: '260px',
              borderRadius: '16px',
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.1)',
              color: '#f87171',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: '80px',
        paddingBottom: '110px',
        paddingLeft: '20px',
        paddingRight: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: '100vh',
      }}>
        <div style={{
          background: 'rgba(14,14,30,0.4)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.03)',
          padding: '24px',
          minHeight: 'calc(100vh - 200px)',
        }}>
          {children}
        </div>
      </main>

      {/* ===== FLOATING DOCK (desktop) ===== */}
      <div
        className="dock-desktop"
        style={{
          position: 'fixed',
          bottom: dockVisible ? '20px' : '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          transition: 'bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <nav
          onMouseLeave={() => setHoveredIndex(-1)}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            padding: '8px 12px 10px',
            borderRadius: '22px',
            background: 'rgba(16,16,36,0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid transparent',
            backgroundClip: 'padding-box',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
            position: 'relative',
          }}
        >
          {/* Gradient border overlay */}
          <div style={{
            position: 'absolute',
            inset: '-1px',
            borderRadius: '23px',
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(232,93,4,0.25), rgba(59,130,246,0.15), rgba(232,93,4,0.1))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }} />

          {navItems.map((item, index) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isNotifications = item.href === '/dashboard/notifications';
            const scale = getIconScale(index);

            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour || undefined}
                onMouseEnter={() => setHoveredIndex(index)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  color: active ? '#f97316' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(232,93,4,0.12)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, background 0.2s',
                  transform: `scale(${scale})`,
                  transformOrigin: 'bottom center',
                }}
              >
                {Icons[item.iconKey]}

                {/* Active glow dot */}
                {active && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#f97316',
                    boxShadow: '0 0 8px 2px rgba(249,115,22,0.6)',
                  }} />
                )}

                {/* Notification badge */}
                {isNotifications && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'linear-gradient(135deg, #e85d04, #f97316)',
                    color: 'white',
                    fontSize: '8px',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    minWidth: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    boxShadow: '0 0 6px rgba(232,93,4,0.5)',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}

                {/* Tooltip */}
                {hoveredIndex === index && (
                  <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 10px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20,20,40,0.95)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    pointerEvents: 'none',
                    animation: 'tooltipIn 0.15s ease-out',
                  }}>
                    {item.label}
                    {/* Tooltip arrow */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: '8px',
                      height: '8px',
                      background: 'rgba(20,20,40,0.95)',
                      borderRight: '1px solid rgba(255,255,255,0.08)',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }} />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="dock-mobile" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'none',
        background: 'rgba(12,12,28,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '6px 4px',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          maxWidth: '500px',
          margin: '0 auto',
        }}>
          {navItems.slice(0, 5).map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour || undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '6px 8px',
                  color: active ? '#f97316' : 'rgba(255,255,255,0.35)',
                  textDecoration: 'none',
                  fontSize: '9px',
                  fontWeight: active ? 600 : 400,
                  transition: 'color 0.2s',
                  position: 'relative',
                }}
              >
                {Icons[item.iconKey]}
                <span>{item.label.split(' ')[0]}</span>
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: '0px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#f97316',
                    boxShadow: '0 0 6px rgba(249,115,22,0.5)',
                  }} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ===== GLOBAL STYLES ===== */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Mobile: show hamburger, mobile tab bar, hide desktop dock & user name */
        @media (max-width: 767px) {
          .md-hidden-btn { display: flex !important; }
          .dock-desktop { display: none !important; }
          .dock-mobile { display: block !important; }
          .desktop-only-name { display: none !important; }
        }

        /* Desktop: ensure dock visible, hide mobile tab bar */
        @media (min-width: 768px) {
          .md-hidden-btn { display: none !important; }
          .dock-desktop { display: block !important; }
          .dock-mobile { display: none !important; }
        }
      `}</style>

      <AIAssistant />
      <TourGuide role="athlete" />
    </div>
  );
}
