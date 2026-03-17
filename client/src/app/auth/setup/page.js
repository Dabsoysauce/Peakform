'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

function SetupHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  async function selectRole(role) {
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    setError('');
    try {
      // Temporarily store token so apiFetch can use it
      localStorage.setItem('token', token);
      const res = await apiFetch('/auth/role', {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to set role'); setLoading(false); return; }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('role', data.user.role);

      if (role === 'trainer') router.push('/trainer');
      else router.push('/dashboard');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-800 p-8 text-center" style={{ backgroundColor: '#1e1e30' }}>
          <div className="text-5xl mb-4">🏀</div>
          <h1 className="text-2xl font-black text-white mb-2">One last step</h1>
          <p className="text-gray-400 mb-2">Welcome, <span className="text-white">{email}</span></p>
          <p className="text-gray-400 mb-8">Are you joining as a player or a coach?</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => selectRole('athlete')}
              disabled={loading}
              className="py-6 rounded-xl border-2 border-gray-700 hover:border-blue-500 transition-all disabled:opacity-50 flex flex-col items-center gap-2"
              style={{ backgroundColor: '#16213e' }}
            >
              <span className="text-4xl">🏀</span>
              <span className="font-bold text-white">Player</span>
              <span className="text-xs text-gray-400">I'm an athlete</span>
            </button>
            <button
              onClick={() => selectRole('trainer')}
              disabled={loading}
              className="py-6 rounded-xl border-2 border-gray-700 hover:border-blue-500 transition-all disabled:opacity-50 flex flex-col items-center gap-2"
              style={{ backgroundColor: '#16213e' }}
            >
              <span className="text-4xl">📋</span>
              <span className="font-bold text-white">Coach</span>
              <span className="text-xs text-gray-400">I train players</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <SetupHandler />
    </Suspense>
  );
}
