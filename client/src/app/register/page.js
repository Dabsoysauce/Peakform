'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [form, setForm] = useState({ email: '', password: '', role: 'athlete' });
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      setStep('verify');
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (verifyCode.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: verifyCode }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      router.push(data.user.role === 'trainer' ? '/trainer' : '/dashboard');
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      const res = await fetch(`${API}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) setError(data.error || 'Failed to resend');
    } catch {
      setError('Network error');
    }
    setResending(false);
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all text-sm";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#08081a' }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(232,93,4,0.06) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 30% 70%, rgba(59,130,246,0.04) 0%, transparent 70%)',
      }} />

      <nav className="flex items-center justify-between px-6 py-4 border-b relative z-10" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/" className="flex items-center gap-0.5">
          <span className="text-xl font-black" style={{ color: '#e85d04' }}>ATHLETE</span>
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
            {step === 'form' ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-black text-white mb-2">Join Athlete Edge</h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">Create your free account today</p>
                </div>

                {error && (
                  <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                  }}>
                    {error}
                  </div>
                )}

                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/api/auth/google`}
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-xl font-semibold text-white text-sm transition-all mb-6"
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                  Continue with Google
                </a>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or sign up with email</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>I am a...</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['athlete', 'trainer'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm({ ...form, role: r })}
                          className="py-3 px-4 rounded-xl font-semibold capitalize transition-all text-sm"
                          style={{
                            border: `1px solid ${form.role === r ? '#e85d04' : 'rgba(255,255,255,0.08)'}`,
                            background: form.role === r ? 'rgba(232,93,4,0.1)' : 'rgba(255,255,255,0.03)',
                            color: form.role === r ? '#f97316' : 'rgba(255,255,255,0.4)',
                            boxShadow: form.role === r ? '0 0 0 3px rgba(232,93,4,0.08)' : 'none',
                          }}
                        >
                          <span className="flex items-center justify-center gap-2">
                            {r === 'athlete' ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93 C6.58 8.22 6.58 15.78 4.93 19.07"/><path d="M19.07 4.93 C17.42 8.22 17.42 15.78 19.07 19.07"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                            )}
                            {r === 'athlete' ? 'Player' : 'Coach'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      required
                      className={inputClass}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      required
                      className={inputClass}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,93,4,0.3)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {loading ? 'Sending code...' : 'Create Account'}
                  </button>
                </form>

                <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold hover:underline" style={{ color: '#e85d04' }}>
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-black text-white mb-2">Check your inbox</h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">
                    We sent a 6-digit code to <strong className="text-white">{form.email}</strong>
                  </p>
                </div>

                {error && (
                  <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Verification Code</label>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      maxLength={6}
                      className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,93,4,0.3)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </form>

                <div className="text-center mt-6">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Didn't receive the code?{' '}
                    <button
                      onClick={handleResend}
                      disabled={resending}
                      className="font-semibold hover:underline disabled:opacity-50"
                      style={{ color: '#e85d04' }}
                    >
                      {resending ? 'Resending...' : 'Resend code'}
                    </button>
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Code expires in 10 minutes
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
