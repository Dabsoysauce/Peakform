'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

export default function DashboardOverview() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinKey, setJoinKey] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('email') || '';
    setUserName(email.split('@')[0]);
    loadData();
  }, []);

  async function loadData() {
    try {
      const [wRes, gRes] = await Promise.all([
        apiFetch('/workouts'),
        apiFetch('/goals'),
      ]);
      if (wRes.ok) setWorkouts(await wRes.json());
      if (gRes.ok) setGoals(await gRes.json());
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
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });

  const thisWeekVolume = 0; // Simplified - would need exercise data

  const activeGoals = goals.filter((g) => !g.achieved);
  const recentWorkouts = workouts.slice(0, 3);

  const statsCards = [
    { label: 'Total Workouts', value: workouts.length, icon: '🏋️', color: '#2563eb', href: '/dashboard/workouts' },
    { label: 'Active Goals', value: activeGoals.length, icon: '🎯', color: '#4ade80', href: '/dashboard/goals' },
    { label: 'This Week', value: `${thisWeekSessions.length} sessions`, icon: '📅', color: '#60a5fa', href: '/dashboard/workouts' },
    { label: 'Goals Hit', value: goals.filter((g) => g.achieved).length, icon: '🏆', color: '#fbbf24', href: '/dashboard/goals' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          {getGreeting()},{' '}
          <span style={{ color: '#2563eb' }} className="capitalize">{userName}</span>!
        </h1>
        <p className="text-gray-400 mt-1">Here's your training overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="rounded-xl p-5 border border-gray-800 hover:border-blue-600 hover:scale-[1.02] transition-all cursor-pointer block"
            style={{ backgroundColor: '#1e1e30' }}
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-black text-white">{loading ? '–' : s.value}</div>
            <div className="text-sm text-gray-400 mt-1">{s.label}</div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart */}
        <div
          className="lg:col-span-2 rounded-xl p-6 border border-gray-800"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Sessions Per Week (Last 8 Weeks)</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-500">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e30', border: '1px solid #374151', borderRadius: '8px', color: 'white' }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active Goals */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Active Goals</h2>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : activeGoals.length === 0 ? (
            <div className="text-gray-500 text-sm">No active goals. Set some in the Goals tab!</div>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 4).map((g) => (
                <div key={g.id} className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: '#2563eb' }}
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{g.title}</div>
                    <div className="text-xs text-gray-500">
                      {g.metric.replace(/_/g, ' ')} → {g.comparison === 'gte' ? '≥' : g.comparison === 'lte' ? '≤' : '='} {g.target_value}
                    </div>
                  </div>
                </div>
              ))}
              {activeGoals.length > 4 && (
                <div className="text-xs text-gray-500">+{activeGoals.length - 4} more goals</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workouts */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Workouts</h2>
            <a href="/dashboard/workouts" className="text-sm hover:underline" style={{ color: '#2563eb' }}>
              View all
            </a>
          </div>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : recentWorkouts.length === 0 ? (
            <div className="text-gray-500 text-sm">No workouts yet. Start logging in the Workouts tab!</div>
          ) : (
            <div className="space-y-3">
              {recentWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{w.session_name || 'Unnamed Session'}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(w.session_date).toLocaleDateString()} · {w.exercise_count} exercises
                    </div>
                  </div>
                  {w.duration_minutes && (
                    <div className="text-xs text-gray-400">{w.duration_minutes} min</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Join Team */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Join a Team</h2>
          <p className="text-gray-400 text-sm mb-4">
            Have a join code from your trainer? Enter it below to join their team and access the group chat.
          </p>
          <form onSubmit={handleJoinTeam} className="space-y-3">
            <input
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
              placeholder="8-character join code"
              maxLength={8}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase tracking-widest font-mono"
              style={{ backgroundColor: '#16213e' }}
            />
            <button
              type="submit"
              disabled={joinLoading}
              className="w-full py-3 rounded-lg font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#2563eb' }}
            >
              {joinLoading ? 'Joining...' : 'Join Team'}
            </button>
          </form>
          {joinMsg && (
            <div
              className={`mt-3 px-4 py-2 rounded-lg text-sm ${
                joinMsg.includes('Joined')
                  ? 'bg-green-900/20 border border-green-800 text-green-400'
                  : 'bg-red-900/20 border border-red-800 text-red-400'
              }`}
            >
              {joinMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
