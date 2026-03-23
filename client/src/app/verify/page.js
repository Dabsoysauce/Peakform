'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

function VerifyHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  function handleChange(i, val) {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputs.current[5]?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Enter the full 6-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); setLoading(false); return; }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('showTour', '1');
      router.push(data.user.role === 'trainer' ? '/trainer' : '/dashboard');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function handleResend() {
    setResent(false);
    try {
      await apiFetch('/auth/resend', { method: 'POST', body: JSON.stringify({ email }) });
      setResent(true);
    } catch {}
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f0f1a' }}>
      <nav className="flex items-center px-6 py-4 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-black" style={{ color: '#2563eb' }}>ATHLETE</span>
          <span className="text-xl font-black text-white">EDGE</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-800 p-8 text-center" style={{ backgroundColor: '#1e1e30' }}>
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-2xl font-black text-white mb-2">Check your email</h1>
            <p className="text-gray-400 mb-1">We sent a 6-digit code to</p>
            <p className="text-white font-semibold mb-8">{email}</p>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            {resent && (
              <div className="mb-6 px-4 py-3 rounded-lg border border-green-800 bg-green-900/20 text-green-400 text-sm">
                New code sent!
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-black text-white rounded-xl border-2 border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                    style={{ backgroundColor: '#16213e' }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || code.join('').length < 6}
                className="w-full py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#2563eb' }}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <p className="text-gray-500 text-sm mt-6">
              Didn't get it?{' '}
              <button onClick={handleResend} className="text-blue-400 hover:underline">
                Resend code
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <VerifyHandler />
    </Suspense>
  );
}
