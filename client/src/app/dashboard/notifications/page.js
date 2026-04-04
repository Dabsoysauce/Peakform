'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const TYPE_ICON = {};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await apiFetch('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {}
    setLoading(false);

    // Mark all as read
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
    } catch {}
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Notifications</h1>
        <p className="text-white/40 mt-1">See who's been checking out your profile</p>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-12">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-white/40">No notifications yet.</p>
          <p className="text-white/20 text-sm mt-1">When a coach views your profile, you'll see it here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-6 py-4 ${i !== notifications.length - 1 ? 'border-b border-white/[0.06]' : ''} ${!n.read ? 'bg-[var(--primary)]/5' : ''}`}
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {TYPE_ICON[n.type] || '🔔'}
              </div>
              <div className="flex-1">
              <p className="text-white text-sm">
                {n.message}
              </p>
                <p className="text-white/30 text-xs mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: 'var(--primary)' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
