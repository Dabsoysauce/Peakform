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

// Shimmer skeleton block
function Skeleton({ width = '100%', height = 20, rounded = 8 }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: rounded,
      background: 'linear-gradient(90deg, #1e2440 25%, #2a3360 50%, #1e2440 75%)',
      backgroundSize: '300% 100%',
      animation: 'shimmer 1.6s ease infinite',
    }} />
  );
}

// Animated count-up number
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

// SVG icons for stat cards
const StatIcons = {
  workouts: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  goals: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  trophy: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  ),
  streak: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 9 10-12h-9l1-9z"/>
    </svg>
  ),
};

export default function DashboardOverview() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [goals, setGoals] = useState([]);
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
    // slight delay so animations trigger after paint
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function loadData() {
    try {
      const [wRes, gRes, pRes] = await Promise.all([
        apiFetch('/workouts'),
        apiFetch('/goals'),
        apiFetch('/athlete-profile'),
      ]);
      if (wRes.ok) setWorkouts(await wRes.json());
      if (gRes.ok) setGoals(await gRes.json());
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
  const activeGoals = goals.filter((g) => !g.achieved);
  const goalsHit = goals.filter((g) => g.achieved).length;
  const recentWorkouts = workouts.slice(0, 3);

  const statsCards = [
    { label: 'Total Workouts', num: workouts.length,          suffix: '',          iconKey: 'workouts', color: '#2563eb', href: '/dashboard/workouts' },
    { label: 'Active Goals',   num: activeGoals.length,       suffix: '',          iconKey: 'goals',    color: '#4ade80', href: '/dashboard/goals' },
    { label: 'This Week',      num: thisWeekSessions.length,  suffix: ' sessions', iconKey: 'calendar', color: '#60a5fa', href: '/dashboard/workouts' },
    { label: 'Goals Hit',      num: goalsHit,                 suffix: '',          iconKey: 'trophy',   color: '#fbbf24', href: '/dashboard/goals' },
    { label: 'Streak',         num: profile?.workout_streak || 0, suffix: ' days', iconKey: 'streak',   color: '#f97316', href: '/dashboard/workouts' },
  ];

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          marginBottom: 32,
        }}
      >
        <h1 className="text-3xl font-black text-white">
          {getGreeting()},{' '}
          <span style={{ color: '#2563eb' }} className="capitalize">{userName}</span>!
        </h1>
        <p className="text-gray-400 mt-1">Here's your training overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statsCards.map((s, i) => (
          <a
            key={s.label}
            href={s.href}
            className="rounded-xl p-5 border border-gray-800 hover:border-blue-700 transition-all cursor-pointer block group"
            style={{
              backgroundColor: '#1e1e30',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease ${i * 0.07 + 0.1}s, transform 0.5s ease ${i * 0.07 + 0.1}s, border-color 0.2s`,
            }}
          >
            <div
              className="mb-3 w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${s.color}18`, color: s.color }}
            >
              {StatIcons[s.iconKey]}
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              {loading ? <Skeleton height={28} width={48} /> : (
                <><CountUp to={s.num} />{s.suffix}</>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{s.label}</div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area chart */}
        <div
          className="lg:col-span-2 rounded-xl p-6 border border-gray-800"
          style={{
            backgroundColor: '#1e1e30',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.45s, transform 0.55s ease 0.45s',
          }}
        >
          <h2 className="text-base font-bold text-white mb-5 uppercase tracking-wide text-xs text-gray-400">
            Sessions / Week <span className="text-gray-600 font-normal normal-case tracking-normal text-sm">— last 8 weeks</span>
          </h2>
          {loading ? (
            <div className="space-y-3 pt-2">
              <Skeleton height={160} rounded={10} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.35}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="week" stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#12122a', border: '1px solid #1e3a8a', borderRadius: '10px', color: 'white', fontSize: 13 }}
                  cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#blueGrad)"
                  dot={{ fill: '#2563eb', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#60a5fa', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active Goals */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{
            backgroundColor: '#1e1e30',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.52s, transform 0.55s ease 0.52s',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Active Goals</h2>
            <a href="/dashboard/goals" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">View all</a>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} height={44} rounded={8} />)}
            </div>
          ) : activeGoals.length === 0 ? (
            <p className="text-gray-500 text-sm">No active goals. Set some in the Goals tab!</p>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 4).map((g) => (
                <div key={g.id} className="flex items-start gap-3 py-2 border-b border-gray-800/60 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#2563eb' }} />
                  <div>
                    <div className="text-sm font-medium text-white leading-snug">{g.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {g.metric.replace(/_/g, ' ')} {g.comparison === 'gte' ? '≥' : g.comparison === 'lte' ? '≤' : '='} {g.target_value}
                    </div>
                  </div>
                </div>
              ))}
              {activeGoals.length > 4 && (
                <p className="text-xs text-gray-600 pt-1">+{activeGoals.length - 4} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workouts */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{
            backgroundColor: '#1e1e30',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.6s, transform 0.55s ease 0.6s',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Recent Workouts</h2>
            <a href="/dashboard/workouts" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">View all</a>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} height={50} rounded={8} />)}
            </div>
          ) : recentWorkouts.length === 0 ? (
            <p className="text-gray-500 text-sm">No workouts yet. Start logging in the Workouts tab!</p>
          ) : (
            <div className="space-y-1">
              {recentWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-3 border-b border-gray-800/60 last:border-0"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{w.session_name || 'Unnamed Session'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(w.session_date).toLocaleDateString()} · {w.exercise_count} exercises
                    </div>
                  </div>
                  {w.duration_minutes && (
                    <span className="text-xs font-medium px-2 py-1 rounded-md text-gray-400" style={{ backgroundColor: '#12122a' }}>
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
          className="rounded-xl p-6 border border-gray-800"
          style={{
            backgroundColor: '#1e1e30',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.55s ease 0.67s, transform 0.55s ease 0.67s',
          }}
        >
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Join a Team</h2>
          <p className="text-gray-500 text-sm mb-5">Have a join code from your trainer? Enter it below.</p>
          <form onSubmit={handleJoinTeam} className="space-y-3">
            <input
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
              placeholder="8-CHAR CODE"
              maxLength={8}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 uppercase tracking-widest font-mono text-sm transition-colors"
              style={{ backgroundColor: '#12122a' }}
            />
            <button
              type="submit"
              disabled={joinLoading}
              className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#2563eb' }}
            >
              {joinLoading ? 'Joining...' : 'Join Team'}
            </button>
          </form>
          {joinMsg && (
            <div
              className={`mt-3 px-4 py-2.5 rounded-lg text-sm ${
                joinMsg.includes('Joined')
                  ? 'bg-green-900/20 border border-green-800/50 text-green-400'
                  : 'bg-red-900/20 border border-red-800/50 text-red-400'
              }`}
            >
              {joinMsg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
