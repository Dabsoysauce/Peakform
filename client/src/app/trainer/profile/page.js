'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const SPECIALTIES = [
  'Varsity Head Coach',
  'JV Coach',
  'Strength & Conditioning',
  'Skills Coach',
  'Shooting Coach',
  'Point Guard Development',
  'Post Player Development',
  'Defense Specialist',
  'Sports Performance',
  'Athletic Development',
  'Nutrition Coaching',
  'Rehabilitation',
  'General Fitness',
];

export default function TrainerProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', specialty: '', certifications: '', bio: '', gym_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await apiFetch('/trainer-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          specialty: data.specialty || '',
          certifications: data.certifications || '',
          bio: data.bio || '',
          gym_id: data.gym_id || '',
        });
      }
    } catch {}
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await apiFetch('/trainer-profile', {
        method: 'PUT',
        body: JSON.stringify({ ...form, gym_id: form.gym_id || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save profile');
        return;
      }
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Network error');
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Coach Profile</h1>
        <p className="text-gray-400 mt-1">Showcase your credentials and expertise</p>
      </div>

      {/* Profile header card */}
      {profile && (
        <div
          className="rounded-xl p-6 border border-gray-800 mb-6 flex items-center gap-4"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ backgroundColor: '#2563eb' }}
          >
            {(profile.first_name || localStorage.getItem('email') || 'T').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : profile.first_name || 'Set your name'}
            </h2>
            {profile.specialty && (
              <p className="text-sm mt-0.5" style={{ color: '#2563eb' }}>{profile.specialty}</p>
            )}
            {profile.gym_name && (
              <p className="text-sm text-gray-400">🏢 {profile.gym_name}</p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}
        {saved && (
          <div className="px-4 py-3 rounded-lg border border-green-800 bg-green-900/20 text-green-400 text-sm">
            Profile saved!
          </div>
        )}

        <div
          className="rounded-xl p-6 border border-gray-800 space-y-4"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Personal Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Alex"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Johnson"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-6 border border-gray-800 space-y-4"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Professional Info</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Specialty</label>
            <select
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500"
              style={{ backgroundColor: '#16213e' }}
            >
              <option value="">Select your specialty...</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Certifications</label>
            <input
              type="text"
              value={form.certifications}
              onChange={(e) => setForm({ ...form, certifications: e.target.value })}
              placeholder="NASM-CPT, CSCS, Precision Nutrition..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              style={{ backgroundColor: '#16213e' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell players about your coaching philosophy, experience, and system..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              style={{ backgroundColor: '#16213e' }}
            />
          </div>
        </div>

        <div
          className="rounded-xl p-6 border border-gray-800"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">Gym</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Gym ID (optional)</label>
            <input
              type="text"
              value={form.gym_id}
              onChange={(e) => setForm({ ...form, gym_id: e.target.value })}
              placeholder="Enter gym UUID or leave blank"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              style={{ backgroundColor: '#16213e' }}
            />
            {profile?.gym_name && (
              <p className="text-xs text-gray-400 mt-1">Current gym: {profile.gym_name}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#2563eb' }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
