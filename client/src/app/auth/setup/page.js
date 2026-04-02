'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function SetupHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);

  // Exchange the one-time code for a token on mount
  useEffect(() => {
    const code = searchParams.get('code');

    // Legacy support: if token is in URL (old flow), still handle it
    const legacyToken = searchParams.get('token');
    if (legacyToken) {
      localStorage.setItem('token', legacyToken);
      setEmail(searchParams.get('email') || '');
      setReady(true);
      return;
    }

    if (!code) { router.push('/login'); return; }

    fetch(`${API}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.token) {
          setError('Sign-in link expired. Please try again.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        localStorage.setItem('token', data.token);
        setEmail(data.user?.email || '');
        setReady(true);
      })
      .catch(() => {
        setError('Something went wrong.');
        setTimeout(() => router.push('/login'), 2000);
      });
  }, [searchParams, router]);

  async function selectRole(role) {
    setLoading(true);
    setError('');
    try {
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
      localStorage.setItem('showTour', '1');

      if (role === 'trainer') router.push('/trainer');
      else router.push('/dashboard');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  if (!ready && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
        <p className="text-gray-400">Verifying...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-800 p-8 text-center" style={{ backgroundColor: '#1e1e30' }}>
          <div className="text-5xl mb-4">🏀</div>
          <h1 className="text-2xl font-black text-white mb-2">One last step</h1>
          {email && <p className="text-gray-400 mb-2">Welcome, <span className="text-white">{email}</span></p>}
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
              <span className="text-xs text-gray-400">I&apos;m an athlete</span>
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
