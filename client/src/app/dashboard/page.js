'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../lib/api';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildWeeklyChartData(sessions) {
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekLabel = `W${8 - i}`;
    const start = new Date(d);
    start.setDate(start.getDate() - 7);
    const count = sessions.filter((s) => {
      const sd = new Date(s.session_date);
      return sd >= start && sd <= d;
    }).length;
    weeks.push({ week: weekLabel, sessions: count });
  }
  return weeks;
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
  workouts: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  streak: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 9 10-12h-9l1-9z"/>
    </svg>
  ),
};

const QuickActionIcons = {
  workout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  film: (
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
};

function formatDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(12,12,32,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: '10px 14px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ color: 'var(--primary)', fontSize: 18, fontWeight: 800 }}>{payload[0].value} <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>sessions</span></p>
      </div>
    );
  }
  return null;
};

export default function DashboardOverview() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinKey, setJoinKey] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('email') || '';
    setUserName(email.split('@')[0]);
    loadData();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function loadData() {
    try {
      const [wRes, pRes] = await Promise.all([
        apiFetch('/workouts'),
        apiFetch('/athlete-profile'),
      ]);
      if (wRes.ok) setWorkouts(await wRes.json());
      if (pRes.ok) setProfile(await pRes.json());
    } catch {}
    setLoading(false);
  }

  async function handleJoinTeam(e) {
    e.preventDefault();
    if (!joinKey.trim()) return;
    setJoinLoading(true);
    setJoinMsg('');
    try {
      const res = await apiFetch('/teams/join', {
        method: 'POST',
        body: JSON.stringify({ join_key: joinKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setJoinMsg(`Joined team "${data.name}"! Check the Team tab.`);
        setJoinKey('');
      } else {
        setJoinMsg(data.error || 'Failed to join team');
      }
    } catch {
      setJoinMsg('Network error');
    }
    setJoinLoading(false);
  }

  const chartData = buildWeeklyChartData(workouts);
  const thisWeekSessions = workouts.filter((w) => {
    const d = new Date(w.session_date);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });
  const recentWorkouts = workouts.slice(0, 3);

  const statsCards = [
    { label: 'Total Workouts', num: workouts.length, suffix: '', iconKey: 'workouts', color: 'var(--primary)', bg: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.12), rgba(var(--primary-light-rgb),0.05))' },
    { label: 'This Week', num: thisWeekSessions.length, suffix: ' sessions', iconKey: 'calendar', color: '#3b82f6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(96,165,250,0.05))' },
    { label: 'Streak', num: profile?.workout_streak || 0, suffix: ' days', iconKey: 'streak', color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.05))' },
  ];

  const quickActions = [
    { label: 'Log Workout', icon: 'workout', href: '/dashboard/workouts', color: 'var(--primary)' },
    { label: 'Upload Film', icon: 'film', href: '/dashboard/media', color: '#8b5cf6' },
    { label: 'View Schedule', icon: 'schedule', href: '/dashboard/schedule', color: '#3b82f6' },
    { label: 'Messages', icon: 'messages', href: '/dashboard/messages', color: '#10b981' },
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
            {userName}
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
            onClick={() => router.push('/dashboard/workouts')}
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
                    <span style={{ textShadow: `0 0 30px ${s.color}40` }}>
                      <CountUp to={s.num} />
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{s.suffix}</span>
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
        {/* Chart Card - spans 2 cols */}
        <SpotlightCard
          mounted={mounted}
          delay={0.35}
          style={{ gridColumn: 'span 2' }}
        >
          <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <h2 style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.35)',
                margin: 0,
              }}>
                Training Activity
              </h2>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b"/>
              </svg>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>Last 8 weeks</span>
            </div>
            {loading ? (
              <Skeleton height={220} rounded={12} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" stroke="transparent" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)', fontWeight: 600 }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#orangeGrad)"
                    dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 7, fill: 'var(--primary-light)', strokeWidth: 2, stroke: 'rgba(var(--primary-rgb),0.3)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
                  {userName ? userName.charAt(0).toUpperCase() : '?'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white', textTransform: 'capitalize', marginBottom: 4 }}>
                  {userName || 'Athlete'}
                </div>
                {profile?.school_name && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/>
                    </svg>
                    {profile.school_name}
                  </div>
                )}

                {/* Quick stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {profile?.height && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Height</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{profile.height}</span>
                    </div>
                  )}
                  {profile?.weight && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Weight</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{profile.weight} lbs</span>
                    </div>
                  )}
                  {profile?.age && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Age</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{profile.age}</span>
                    </div>
                  )}
                </div>

                {/* Edit profile link */}
                <a
                  href="/dashboard/profile"
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

        {/* Recent Workouts */}
        <SpotlightCard
          mounted={mounted}
          delay={0.5}
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
                Recent Workouts
              </h2>
              <a
                href="/dashboard/workouts"
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
                {[1,2,3].map(i => <Skeleton key={i} height={56} rounded={12} />)}
              </div>
            ) : recentWorkouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
                  <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
                </svg>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                  No workouts yet. Time to start training!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentWorkouts.map((w, idx) => {
                  const borderColors = ['var(--primary)', '#3b82f6', '#8b5cf6'];
                  return (
                    <div key={w.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 14,
                      borderLeft: `3px solid ${borderColors[idx % 3]}`,
                      background: 'rgba(255,255,255,0.02)',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{w.session_name || 'Unnamed Session'}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                          {new Date(w.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {w.exercise_count} exercises
                        </div>
                      </div>
                      {w.duration_minutes && (
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '5px 12px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.4)',
                        }}>
                          {w.duration_minutes}m
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SpotlightCard>

        {/* Join Team Card */}
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
              Join a Team
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 20 }}>
              Have a code from your coach? Enter it below.
            </p>
            <form onSubmit={handleJoinTeam} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 14,
                  fontSize: 15,
                  fontFamily: 'monospace',
                  letterSpacing: '0.25em',
                  textAlign: 'center',
                  color: 'white',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  outline: 'none',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="submit"
                disabled={joinLoading}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'white',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  border: 'none',
                  cursor: joinLoading ? 'not-allowed' : 'pointer',
                  opacity: joinLoading ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(var(--primary-rgb),0.2)',
                }}
                onMouseEnter={(e) => { if (!joinLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(var(--primary-rgb),0.3)'; }}}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(var(--primary-rgb),0.2)'; }}
              >
                {joinLoading ? 'Joining...' : 'Join Team'}
              </button>
            </form>
            {joinMsg && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 500,
                  animation: 'fadeInUp 0.3s ease',
                  ...(joinMsg.includes('Joined')
                    ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }
                    : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }
                  ),
                }}
              >
                {joinMsg}
              </div>
            )}
          </div>
        </SpotlightCard>

        {/* Quick Actions Card */}
        <SpotlightCard
          mounted={mounted}
          delay={0.65}
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
      </div>
    </>
  );
}
