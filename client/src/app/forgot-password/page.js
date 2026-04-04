'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) { setError(data.error || 'Failed to send code'); return; }
      setStep('code');
    } catch { setError('Network error'); }
    setLoading(false);
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      setStep('reset');
    } catch { setError('Network error'); }
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) { setError(data.error || 'Reset failed'); return; }
      setSuccess('Password reset successfully!');
      setTimeout(() => router.push('/login'), 2000);
    } catch { setError('Network error'); }
    setLoading(false);
  }

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) setError(data.error || 'Failed to resend');
    } catch { setError('Network error'); }
    setResending(false);
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all text-sm";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#08081a' }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(var(--primary-rgb),0.06) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 30% 70%, rgba(59,130,246,0.04) 0%, transparent 70%)',
      }} />

      <nav className="flex items-center justify-between px-6 py-4 border-b relative z-10" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/" className="flex items-center gap-0.5">
          <span className="text-xl font-black" style={{ color: 'var(--primary)' }}>ATHLETE</span>
          <span className="text-xl font-black text-white">EDGE</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            }}
          >
            {step === 'email' && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(var(--primary-rgb),0.1)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-black text-white mb-2">Reset Password</h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">Enter your email and we'll send a verification code</p>
                </div>

                {error && (
                  <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className={inputClass}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--primary-rgb),0.3)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {loading ? 'Sending...' : 'Send Code'}
                  </button>
                </form>
              </>
            )}

            {step === 'code' && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-black text-white mb-2">Check your inbox</h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">
                    We sent a 6-digit code to <strong className="text-white">{email}</strong>
                  </p>
                </div>

                {error && (
                  <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Verification Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      maxLength={6}
                      className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--primary-rgb),0.3)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </form>

                <div className="text-center mt-6">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Didn't receive the code?{' '}
                    <button
                      onClick={handleResend}
                      disabled={resending}
                      className="font-semibold hover:underline disabled:opacity-50"
                      style={{ color: 'var(--primary)' }}
                    >
                      {resending ? 'Resending...' : 'Resend code'}
                    </button>
                  </p>
                </div>
              </>
            )}

            {step === 'reset' && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-black text-white mb-2">New Password</h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">Enter your new password below</p>
                </div>

                {error && (
                  <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                  }}>
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80',
                  }}>
                    {success}
                  </div>
                )}

                <form onSubmit={handleReset} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className={inputClass}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--primary-rgb),0.3)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}

            <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Remember your password?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
