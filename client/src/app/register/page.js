'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', role: 'athlete' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      if (data.user.role === 'trainer') {
        router.push('/trainer');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-black" style={{ color: '#2563eb' }}>PEAK</span>
          <span className="text-xl font-black text-white">FORM</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl border border-gray-800 p-8"
            style={{ backgroundColor: '#1e1e30' }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white mb-2">Join PeakForm</h1>
              <p className="text-gray-400">Create your free account today</p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {['athlete', 'trainer'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className="py-3 px-4 rounded-lg border font-semibold capitalize transition-all"
                      style={{
                        borderColor: form.role === r ? '#2563eb' : '#374151',
                        backgroundColor: form.role === r ? 'rgba(232,93,38,0.15)' : '#16213e',
                        color: form.role === r ? '#2563eb' : '#9ca3af',
                      }}
                    >
                      {r === 'athlete' ? '🏀 Player' : '📋 Coach'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  style={{ backgroundColor: '#16213e' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  style={{ backgroundColor: '#16213e' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-gray-500 mt-6 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: '#2563eb' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
