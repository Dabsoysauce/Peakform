'use client';
import { useState, useEffect } from 'react';
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
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
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
  workouts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  trophy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  ),
  streak: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 9 10-12h-9l1-9z"/>
    </svg>
  ),
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
    { label: 'Total Workouts', num: workouts.length,          suffix: '',          iconKey: 'workouts', color: '#e85d04', gradient: 'linear-gradient(135deg, #e85d04, #f97316)' },
    { label: 'This Week',      num: thisWeekSessions.length,  suffix: ' sessions', iconKey: 'calendar', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
    { label: 'Streak',         num: profile?.workout_streak || 0, suffix: ' days', iconKey: 'streak',   color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #fb923c)' },
  ];

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.06)',
  };

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
          <span className="text-gradient capitalize">{userName}</span>!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)' }} className="mt-1">Here&apos;s your training overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statsCards.map((s, i) => (
          <a
            key={s.label}
            href="/dashboard/workouts"
            className="rounded-2xl p-5 transition-all cursor-pointer block group"
            style={{
              ...cardStyle,
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease ${i * 0.07 + 0.1}s, transform 0.5s ease ${i * 0.07 + 0.1}s, border-color 0.3s, box-shadow 0.3s`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${s.color}30`; e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}10`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div
              className="mb-3 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${s.color}12`, color: s.color }}
            >
              {StatIcons[s.iconKey]}
            </div>
            <div className="text-2xl font-black text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {loading ? <Skeleton height={28} width={48} /> : (
                <><CountUp to={s.num} />{s.suffix}</>
              )}
            </div>
            <div className="text-xs mt-1 font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Area chart */}
        <div
          className="rounded-2xl p-6"
          style={{
            ...cardStyle,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.45s, transform 0.55s ease 0.45s',
          }}
        >
          <h2 className="text-xs font-bold uppercase tracking-wide mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Sessions / Week <span className="font-normal normal-case tracking-normal text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>— last 8 weeks</span>
          </h2>
          {loading ? (
            <Skeleton height={200} rounded={12} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#e85d04" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#e85d04" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" stroke="transparent" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }} allowDecimals={false} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(12,12,32,0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: 'white', fontSize: 13,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                  cursor={{ stroke: '#e85d04', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#e85d04"
                  strokeWidth={2.5}
                  fill="url(#orangeGrad)"
                  dot={{ fill: '#e85d04', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#f97316', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workouts */}
        <div
          className="rounded-2xl p-6"
          style={{
            ...cardStyle,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.6s, transform 0.55s ease 0.6s',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Recent Workouts</h2>
            <a href="/dashboard/workouts" className="text-xs font-medium transition-colors" style={{ color: '#e85d04' }}>View all</a>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} height={50} rounded={10} />)}
            </div>
          ) : recentWorkouts.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No workouts yet. Start logging in the Workouts tab!</p>
          ) : (
            <div className="space-y-1">
              {recentWorkouts.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div className="text-sm font-semibold text-white">{w.session_name || 'Unnamed Session'}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {new Date(w.session_date).toLocaleDateString()} · {w.exercise_count} exercises
                    </div>
                  </div>
                  {w.duration_minutes && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.4)',
                    }}>
                      {w.duration_minutes}m
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Join Team */}
        <div
          className="rounded-2xl p-6"
          style={{
            ...cardStyle,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.67s, transform 0.55s ease 0.67s',
          }}
        >
          <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Join a Team</h2>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>Have a join code from your trainer? Enter it below.</p>
          <form onSubmit={handleJoinTeam} className="space-y-3">
            <input
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
              placeholder="8-CHAR CODE"
              maxLength={8}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 uppercase tracking-widest font-mono text-sm transition-all focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              type="submit"
              disabled={joinLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}
              onMouseEnter={(e) => { if (!joinLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,93,4,0.25)'; }}}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {joinLoading ? 'Joining...' : 'Join Team'}
            </button>
          </form>
          {joinMsg && (
            <div
              className="mt-3 px-4 py-2.5 rounded-xl text-sm"
              style={joinMsg.includes('Joined')
                ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }
                : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }
              }
            >
              {joinMsg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
