'use client';
import { useState } from 'react';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  async function handleDelete(e) {
    e.preventDefault();
    if (!email || !password) { setStatus('Please enter your email and password.'); return; }

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This action cannot be undone. All your data including workouts, film, messages, and profile information will be permanently removed.'
    );
    if (!confirmed) return;

    setLoading(true);
    setStatus('');
    try {
      // Login first to get token
      const loginRes = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) { setStatus('Invalid email or password.'); setLoading(false); return; }
      const { token } = await loginRes.json();

      // Delete account
      const deleteRes = await fetch(`${API}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (deleteRes.ok) {
        setStatus('Your account and all associated data have been permanently deleted.');
        setEmail('');
        setPassword('');
      } else {
        setStatus('Failed to delete account. Please try again or contact support.');
      }
    } catch {
      setStatus('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Delete Your Account</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, lineHeight: 1.6 }}>
          This will permanently delete your Athlete Edge account and all associated data, including your profile, workouts, film, messages, team memberships, and any other content. This action cannot be undone.
        </p>

        <form onSubmit={handleDelete}>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #2a2a40', backgroundColor: '#1e1e30', color: '#fff', fontSize: 15, marginBottom: 16, boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #2a2a40', backgroundColor: '#1e1e30', color: '#fff', fontSize: 15, marginBottom: 24, boxSizing: 'border-box' }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Deleting...' : 'Permanently Delete My Account'}
          </button>
        </form>

        {status && (
          <p style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: status.includes('permanently deleted') ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', color: status.includes('permanently deleted') ? '#4ade80' : '#ef4444', fontSize: 14 }}>
            {status}
          </p>
        )}

        <p style={{ marginTop: 32, color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
          If you're unable to delete your account through this page, contact us at{' '}
          <a href="mailto:ryan.dhalbisoi@gmail.com" style={{ color: '#60a5fa' }}>ryan.dhalbisoi@gmail.com</a> with the subject "Account Deletion Request" and we will process your request within 3 business days.
        </p>
      </div>
    </div>
  );
}
