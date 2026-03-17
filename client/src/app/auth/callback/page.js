'use client';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const email = searchParams.get('email');

    if (!token) { router.push('/login'); return; }

    localStorage.setItem('token', token);
    if (userId) localStorage.setItem('userId', userId);
    if (email) localStorage.setItem('email', email);
    if (role) localStorage.setItem('role', role);

    if (role === 'trainer') router.push('/trainer');
    else router.push('/dashboard');
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="text-center">
        <div className="text-4xl mb-4">🏀</div>
        <p className="text-gray-400">Signing you in...</p>
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
