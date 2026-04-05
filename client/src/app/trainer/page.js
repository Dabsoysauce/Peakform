'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function Skeleton({ width = '100%', height = 20, rounded = 12 }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
      backgroundSize: '300% 100%',
      animation: 'shimmer 1.6s ease infinite',
    }} />
  );
}

function CountUp({ to = 0, duration = 900 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!to) { setVal(0); return; }
    let current = 0;
    const step = to / (duration / 16);
    const id = setInterval(() => {
      current += step;
      if (current >= to) { setVal(to); clearInterval(id); }
      else setVal(Math.floor(current));
    }, 16);
    return () => clearInterval(id);
  }, [to, duration]);
  return val;
}

function SpotlightCard({ children, style, className, delay = 0, mounted, ...props }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, border-color 0.3s, box-shadow 0.3s`,
        ...style,
      }}
      {...props}
    >
      {/* Spotlight glow */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--primary-rgb),0.06), transparent 60%)`,
          zIndex: 0,
        }} />
      )}
      {/* Noise texture */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

const StatIcons = {
  teams: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  athletes: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  active: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

const QuickActionIcons = {
  create: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  film: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  ),
  playbook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  messages: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  schedule: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  practice: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

export default function TrainerOverview() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [teams, setTeams] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('email') || '';
    setUserName(email.split('@')[0]);
    loadData();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function loadData() {
    try {
      const [tRes, pRes] = await Promise.all([
        apiFetch('/teams'),
        apiFetch('/trainer-profile'),
      ]);
      if (tRes.ok) setTeams(await tRes.json());
      if (pRes.ok) setProfile(await pRes.json());
    } catch {}
    setLoading(false);
  }

  const totalAthletes = teams.reduce((sum, t) => sum + (t.member_count || 0), 0);
  const activeRooms = teams.filter((t) => !t.coach_only).length;
  const displayName = profile?.first_name || userName;
  const firstJoinKey = teams.length > 0 ? teams[0].join_key : null;

  function handleCopyKey() {
    if (!firstJoinKey) return;
    navigator.clipboard.writeText(firstJoinKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const statsCards = [
    { label: 'Total Teams', num: teams.length, suffix: '', iconKey: 'teams', color: 'var(--primary)', bg: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.12), rgba(var(--primary-light-rgb),0.05))', href: '/trainer/teams' },
    { label: 'Total Athletes', num: totalAthletes, suffix: '', iconKey: 'athletes', color: '#3b82f6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(96,165,250,0.05))', href: '/trainer/teams' },
    { label: 'Active Rooms', num: activeRooms, suffix: '', iconKey: 'active', color: '#22c55e', bg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(74,222,128,0.05))', href: '/trainer/messages' },
  ];

  const quickActions = [
    { label: 'Create Team', icon: 'create', href: '/trainer/teams', color: 'var(--primary)' },
    { label: 'Film Room', icon: 'film', href: '/trainer/film-room', color: '#8b5cf6' },
    { label: 'Playbook', icon: 'playbook', href: '/trainer/playbook', color: '#3b82f6' },
    { label: 'Messages', icon: 'messages', href: '/trainer/messages', color: '#10b981' },
    { label: 'Schedule', icon: 'schedule', href: '/trainer/schedule', color: '#f59e0b' },
    { label: 'Practice Plans', icon: 'practice', href: '/trainer/practice-plans', color: '#ec4899' },
  ];

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes gradientMove {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .bento-stat-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important;
        }
        .quick-action-btn:hover .quick-action-bg {
          opacity: 1 !important;
        }
        .quick-action-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.12) !important;
        }
        @media (max-width: 768px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-grid > * { grid-column: span 1 !important; grid-row: span 1 !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-grid > *:first-child { grid-column: span 2 !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
        marginBottom: 40,
      }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: 0,
        }}>
          {getGreeting()},{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-light), var(--primary-light))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textTransform: 'capitalize',
          }}>
            {displayName}
          </span>
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 14,
          marginTop: 6,
          fontWeight: 500,
        }}>
          {formatDate()}
        </p>
        {/* Animated gradient line */}
        <div style={{
          marginTop: 20,
          height: 2,
          borderRadius: 1,
          background: 'linear-gradient(90deg, var(--primary), var(--primary-light), #3b82f6, #8b5cf6, var(--primary))',
          backgroundSize: '200% 100%',
          animation: 'gradientMove 4s ease infinite',
          opacity: 0.4,
        }} />
      </div>

      {/* Stat Cards Row */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 20,
      }}>
        {statsCards.map((s, i) => (
          <SpotlightCard
            key={s.label}
            mounted={mounted}
            delay={0.1 + i * 0.08}
            className="bento-stat-card"
            style={{
              cursor: 'pointer',
              transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.08}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.08}s, box-shadow 0.3s`,
            }}
            onClick={() => router.push(s.href)}
          >
            <div style={{ padding: 24 }}>
              {/* Icon */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: s.bg,
                color: s.color,
                marginBottom: 16,
              }}>
                {StatIcons[s.iconKey]}
              </div>
              {/* Number */}
              <div style={{
                fontSize: 36,
                fontWeight: 900,
                color: '#ffffff',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>
                {loading ? <Skeleton height={36} width={60} /> : (
                  <>
                    <span style={{ textShadow: `0 0 30px ${s.color === 'var(--primary)' ? 'rgba(var(--primary-rgb),0.25)' : s.color + '40'}` }}>
                      <CountUp to={s.num} />
                    </span>
                    {s.suffix && <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{s.suffix}</span>}
                  </>
                )}
              </div>
              {/* Label */}
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.3)',
                marginTop: 8,
              }}>
                {s.label}
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Main Bento Grid */}
      <div className="bento-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: 'auto',
        gap: 20,
      }}>
        {/* My Teams Card - spans 2 cols */}
        <SpotlightCard
          mounted={mounted}
          delay={0.35}
          style={{ gridColumn: 'span 2' }}
        >
          <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.35)',
                margin: 0,
              }}>
                My Teams
              </h2>
              <a
                href="/trainer/teams"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  padding: '5px 14px',
                  borderRadius: 20,
                  background: 'rgba(var(--primary-rgb),0.08)',
                  border: '1px solid rgba(var(--primary-rgb),0.12)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.14)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.08)'; }}
              >
                View all
              </a>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} height={56} rounded={12} />)}
              </div>
            ) : teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                  No teams yet. Create your first team!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {teams.slice(0, 5).map((t, idx) => {
                  const borderColors = ['var(--primary)', '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b'];
                  return (
                    <div key={t.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 14,
                      borderLeft: `3px solid ${borderColors[idx % 5]}`,
                      background: 'rgba(255,255,255,0.02)',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {t.name}
                          {t.sport && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 8,
                              background: 'rgba(var(--primary-rgb),0.1)',
                              color: 'var(--primary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>
                              {t.sport}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                          {t.member_count} player{t.member_count !== 1 ? 's' : ''}
                          {t.coach_only && <span style={{ color: 'rgba(234,179,8,0.6)', marginLeft: 6 }}>Broadcast</span>}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '5px 12px',
                        borderRadius: 10,
                        background: 'rgba(var(--primary-rgb),0.06)',
                        border: '1px solid rgba(var(--primary-rgb),0.15)',
                        color: 'var(--primary-light)',
                        letterSpacing: '0.1em',
                      }}>
                        {t.join_key}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SpotlightCard>

        {/* Profile Summary Card - spans 1 col, 2 rows */}
        <SpotlightCard
          mounted={mounted}
          delay={0.4}
          style={{ gridRow: 'span 2' }}
        >
          <div style={{ padding: 28, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.35)',
              margin: '0 0 24px 0',
            }}>
              Profile
            </h2>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skeleton height={64} width={64} rounded={32} />
                <Skeleton height={20} width={120} />
                <Skeleton height={14} width={80} />
              </div>
            ) : (
              <>
                {/* Avatar */}
                <div style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 800,
                  color: 'white',
                  marginBottom: 16,
                  boxShadow: '0 8px 24px rgba(var(--primary-rgb),0.2)',
                }}>
                  {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white', textTransform: 'capitalize', marginBottom: 4 }}>
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : displayName || 'Coach'}
                </div>

                {/* Coach details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginTop: 8 }}>
                  {profile?.specialty && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Specialty</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{profile.specialty}</span>
                    </div>
                  )}
                  {profile?.school_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>School</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/>
                        </svg>
                        {profile.school_name}
                      </span>
                    </div>
                  )}
                  {profile?.certifications && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Certs</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{profile.certifications}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Teams</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{teams.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Athletes</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{totalAthletes}</span>
                  </div>
                </div>

                {/* Edit profile link */}
                <a
                  href="/trainer/profile"
                  style={{
                    marginTop: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 0',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'rgba(var(--primary-rgb),0.08)',
                    border: '1px solid rgba(var(--primary-rgb),0.15)',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.14)'; e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.08)'; e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.15)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Profile
                </a>
              </>
            )}
          </div>
        </SpotlightCard>

        {/* Quick Actions Card */}
        <SpotlightCard
          mounted={mounted}
          delay={0.5}
        >
          <div style={{ padding: 28 }}>
            <h2 style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.35)',
              margin: '0 0 20px 0',
            }}>
              Quick Actions
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {quickActions.map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="quick-action-btn"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '18px 12px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    textDecoration: 'none',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div className="quick-action-bg" style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(135deg, ${action.color}10, ${action.color}05)`,
                    opacity: 0,
                    transition: 'opacity 0.25s ease',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    color: action.color,
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    {QuickActionIcons[action.icon]}
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)',
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                  }}>
                    {action.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </SpotlightCard>

        {/* Join Key Card */}
        <SpotlightCard
          mounted={mounted}
          delay={0.58}
        >
          <div style={{ padding: 28 }}>
            <h2 style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.35)',
              margin: '0 0 6px 0',
            }}>
              Share Join Code
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 20 }}>
              Give this code to players so they can join your team.
            </p>
            {loading ? (
              <Skeleton height={72} rounded={16} />
            ) : firstJoinKey ? (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px 16px',
                  borderRadius: 16,
                  background: 'rgba(var(--primary-rgb),0.06)',
                  border: '1px solid rgba(var(--primary-rgb),0.15)',
                  marginBottom: 14,
                }}>
                  <span style={{
                    fontSize: 28,
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    letterSpacing: '0.3em',
                    color: 'var(--primary-light)',
                    textShadow: '0 0 30px rgba(var(--primary-rgb),0.25)',
                    animation: 'pulseGlow 3s ease infinite',
                  }}>
                    {firstJoinKey}
                  </span>
                </div>
                <button
                  onClick={handleCopyKey}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'white',
                    background: copiedKey
                      ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                      : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 16px rgba(var(--primary-rgb),0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(var(--primary-rgb),0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(var(--primary-rgb),0.2)'; }}
                >
                  {copiedKey ? 'Copied!' : 'Copy Code'}
                </button>
                {teams.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                    For: {teams[0].name}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                  Create a team to get a join code.
                </p>
              </div>
            )}
          </div>
        </SpotlightCard>
      </div>
    </>
  );
}
