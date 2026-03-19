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

const TYPE_ICON = {
  profile_view: '👀',
};

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
        <p className="text-gray-400 mt-1">See who's been checking out your profile</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-12 text-center" style={{ backgroundColor: '#1e1e30' }}>
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-gray-400">No notifications yet.</p>
          <p className="text-gray-600 text-sm mt-1">When a coach views your profile, you'll see it here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-6 py-4 ${i !== notifications.length - 1 ? 'border-b border-gray-800' : ''} ${!n.read ? 'bg-blue-500/5' : ''}`}
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {TYPE_ICON[n.type] || '🔔'}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">
                  {n.type === 'profile_view' && n.data?.viewer_id ? (
                    <>
                      Coach{' '}
                      <Link href={`/coach/${n.data.viewer_id}`} className="font-semibold hover:underline" style={{ color: '#2563eb' }}>
                        {n.data.coach_name}
                      </Link>
                      {n.data.school_name ? ` from ${n.data.school_name}` : ''} viewed your profile
                    </>
                  ) : (
                    n.message
                  )}
                </p>
                <p className="text-gray-500 text-xs mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: '#2563eb' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
