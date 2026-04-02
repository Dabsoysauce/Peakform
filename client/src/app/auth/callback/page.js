'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');

    // Legacy support: if token is in URL (old flow), still handle it
    const legacyToken = searchParams.get('token');
    if (legacyToken) {
      localStorage.setItem('token', legacyToken);
      const userId = searchParams.get('userId');
      const role = searchParams.get('role');
      const email = searchParams.get('email');
      if (userId) localStorage.setItem('userId', userId);
      if (email) localStorage.setItem('email', email);
      if (role) localStorage.setItem('role', role);
      if (role === 'trainer') router.push('/trainer');
      else router.push('/dashboard');
      return;
    }

    if (!code) { router.push('/login'); return; }

    // Exchange the one-time code for a JWT token
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
        if (data.user?.id) localStorage.setItem('userId', data.user.id);
        if (data.user?.email) localStorage.setItem('email', data.user.email);
        if (data.user?.role) localStorage.setItem('role', data.user.role);

        if (data.user?.role === 'trainer') router.push('/trainer');
        else router.push('/dashboard');
      })
      .catch(() => {
        setError('Something went wrong. Redirecting...');
        setTimeout(() => router.push('/login'), 2000);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="text-center">
        <div className="text-4xl mb-4">🏀</div>
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <p className="text-gray-400">Signing you in...</p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
