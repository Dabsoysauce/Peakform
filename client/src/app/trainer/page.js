'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Skeleton({ width = '100%', height = 20, rounded = 8 }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'linear-gradient(90deg, #1e2440 25%, #2a3360 50%, #1e2440 75%)',
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

const StatIcons = {
  teams: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  players: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  broadcast: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/>
      <path d="M20.07 4.93a10 10 0 0 1 0 14.14"/><path d="M3.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
};

const QuickIcons = {
  create: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  browse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  edit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  assign: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
};

export default function TrainerOverview() {
  const [userName, setUserName] = useState('');
  const [teams, setTeams] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const displayName = profile?.first_name || userName;

  const statsCards = [
    { label: 'Total Teams',      num: teams.length,                                   suffix: '', iconKey: 'teams',     color: '#2563eb' },
    { label: 'Total Players',    num: totalAthletes,                                  suffix: '', iconKey: 'players',   color: '#4ade80' },
    { label: 'Active Rooms',     num: teams.filter((t) => !t.coach_only).length,      suffix: '', iconKey: 'chat',      color: '#60a5fa' },
    { label: 'Broadcast Rooms',  num: teams.filter((t) => t.coach_only).length,       suffix: '', iconKey: 'broadcast', color: '#fbbf24' },
  ];

  const quickActions = [
    { label: 'Create a Team',   sub: 'Set up a new team',                     href: '/trainer/teams',    iconKey: 'create'  },
    { label: 'Browse Players',  sub: 'Find players by school or name',         href: '/trainer/athletes', iconKey: 'browse'  },
    { label: 'Update Profile',  sub: 'Set your specialty and certifications',  href: '/trainer/profile',  iconKey: 'edit'    },
    { label: 'Assign to Player', sub: 'Go to a team and assign goals/workouts', href: '/trainer/teams',   iconKey: 'assign'  },
  ];

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        marginBottom: 32,
      }}>
        <h1 className="text-3xl font-black text-white">
          {getGreeting()},{' '}
          <span style={{ color: '#2563eb' }} className="capitalize">{displayName}</span>!
        </h1>
        <p className="text-gray-400 mt-1">Coach dashboard — manage your teams and players</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((s, i) => (
          <div
            key={s.label}
            className="rounded-xl p-5 border border-gray-800"
            style={{
              backgroundColor: '#1e1e30',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease ${i * 0.07 + 0.1}s, transform 0.5s ease ${i * 0.07 + 0.1}s`,
            }}
          >
            <div className="mb-3 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}18`, color: s.color }}>
              {StatIcons[s.iconKey]}
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              {loading ? <Skeleton height={28} width={48} /> : <CountUp to={s.num} />}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{
            backgroundColor: '#1e1e30',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.38s, transform 0.55s ease 0.38s',
          }}
        >
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 hover:border-blue-700 transition-all group"
                style={{ backgroundColor: '#12122a' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ backgroundColor: 'rgba(37,99,235,0.12)', color: '#60a5fa' }}>
                  {QuickIcons[a.iconKey]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{a.label}</div>
                  <div className="text-xs text-gray-600">{a.sub}</div>
                </div>
                <svg className="ml-auto text-gray-700 group-hover:text-blue-600 transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* My Teams */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{
            backgroundColor: '#1e1e30',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.45s, transform 0.55s ease 0.45s',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">My Teams</h2>
            <Link href="/trainer/teams" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} height={48} rounded={8} />)}
            </div>
          ) : teams.length === 0 ? (
            <p className="text-gray-500 text-sm">No teams yet. Create your first team!</p>
          ) : (
            <div className="space-y-1">
              {teams.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-800/60 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t.member_count} player{t.member_count !== 1 ? 's' : ''}
                      {t.coach_only && <span className="ml-1.5 text-yellow-600/70">· Broadcast</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border" style={{ borderColor: 'rgba(37,99,235,0.4)', color: '#60a5fa', backgroundColor: 'rgba(37,99,235,0.08)' }}>
                    {t.join_key}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete profile nudge */}
      {profile && !profile.specialty && (
        <div
          className="rounded-xl p-5 border border-blue-900/40 flex items-start gap-4"
          style={{
            backgroundColor: 'rgba(37,99,235,0.06)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.6s ease 0.6s',
          }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Complete your profile</h3>
            <p className="text-sm text-gray-400">
              Add your specialty and certifications so players can find you.{' '}
              <Link href="/trainer/profile" className="text-blue-400 hover:text-blue-300 underline transition-colors">
                Update profile →
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
