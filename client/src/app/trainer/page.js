'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

export default function TrainerOverview() {
  const [userName, setUserName] = useState('');
  const [teams, setTeams] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem('email') || '';
    setUserName(email.split('@')[0]);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
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
  const displayName = profile?.first_name ? `${profile.first_name}` : userName;

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          {getGreeting()},{' '}
          <span style={{ color: '#2563eb' }} className="capitalize">{displayName}</span>!
        </h1>
        <p className="text-gray-400 mt-1">Coach dashboard — manage your teams and players</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Teams', value: loading ? '–' : teams.length, icon: '👥', color: '#2563eb' },
          { label: 'Total Players', value: loading ? '–' : totalAthletes, icon: '🏋️', color: '#4ade80' },
          { label: 'Active Rooms', value: loading ? '–' : teams.filter((t) => !t.coach_only).length, icon: '💬', color: '#60a5fa' },
          { label: 'Broadcast Rooms', value: loading ? '–' : teams.filter((t) => t.coach_only).length, icon: '📢', color: '#fbbf24' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-5 border border-gray-800"
            style={{ backgroundColor: '#1e1e30' }}
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-sm text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/trainer/teams"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-blue-600 transition-colors group"
              style={{ backgroundColor: '#16213e' }}
            >
              <span className="text-xl">➕</span>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Create a Team</div>
                <div className="text-xs text-gray-500">Set up a new team</div>
              </div>
            </Link>
            <Link
              href="/trainer/athletes"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-blue-600 transition-colors group"
              style={{ backgroundColor: '#16213e' }}
            >
              <span className="text-xl">🔍</span>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Browse Players</div>
                <div className="text-xs text-gray-500">Find players by school or name</div>
              </div>
            </Link>
            <Link
              href="/trainer/profile"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-blue-600 transition-colors group"
              style={{ backgroundColor: '#16213e' }}
            >
              <span className="text-xl">✏️</span>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Update Profile</div>
                <div className="text-xs text-gray-500">Set your specialty and certifications</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Teams overview */}
        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">My Teams</h2>
            <Link href="/trainer/teams" className="text-sm hover:underline" style={{ color: '#2563eb' }}>View all</Link>
          </div>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : teams.length === 0 ? (
            <div className="text-gray-500 text-sm">No teams yet. Create your first team!</div>
          ) : (
            <div className="space-y-3">
              {teams.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {t.member_count} player{t.member_count !== 1 ? 's' : ''}
                      {t.coach_only && ' · Broadcast only'}
                    </div>
                  </div>
                  <div
                    className="text-xs font-mono px-2 py-0.5 rounded border"
                    style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: 'rgba(232,93,38,0.1)' }}
                  >
                    {t.join_key}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile tip */}
      {profile && !profile.specialty && (
        <div
          className="rounded-xl p-5 border border-blue-600/40 flex items-start gap-4"
          style={{ backgroundColor: 'rgba(232,93,38,0.08)' }}
        >
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-white mb-1">Complete your profile</h3>
            <p className="text-sm text-gray-400">
              Add your specialty and certifications so players can find you.{' '}
              <Link href="/trainer/profile" className="underline" style={{ color: '#2563eb' }}>
                Update profile →
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
