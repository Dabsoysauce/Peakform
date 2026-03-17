'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const PRIMARY_GOALS = [
  'Build Muscle',
  'Lose Fat',
  'Increase Strength',
  'Improve Endurance',
  'Athletic Performance',
  'Powerlifting',
  'Bodybuilding',
  'General Fitness',
  'Injury Recovery',
];

export default function AthleteProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', age: '', weight_lbs: '', height_inches: '',
    primary_goal: '', bio: '', gym_id: '',
  });
  const [gyms, setGyms] = useState([]);
  const [gymSearch, setGymSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [gymLoading, setGymLoading] = useState(false);
  const [showGymCreate, setShowGymCreate] = useState(false);
  const [newGym, setNewGym] = useState({ name: '', city: '', state: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await apiFetch('/athlete-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          age: data.age || '',
          weight_lbs: data.weight_lbs || '',
          height_inches: data.height_inches || '',
          primary_goal: data.primary_goal || '',
          bio: data.bio || '',
          gym_id: data.gym_id || '',
        });
        if (data.gym_name) setGymSearch(data.gym_name);
      }
    } catch {}
    setLoading(false);
  }

  async function searchGyms(q) {
    if (!q || q.length < 2) return;
    setGymLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/athletes?gym=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      // We'll use a gym-specific endpoint via the athletes route or a simple local search
      // For simplicity, let's call a direct query
    } catch {}
    setGymLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const body = {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
        height_inches: form.height_inches ? parseInt(form.height_inches) : null,
        gym_id: form.gym_id || null,
      };
      const res = await apiFetch('/athlete-profile', {
        method: 'PUT',
        body: JSON.stringify(body),
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

  async function createGym(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/gyms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newGym),
      });
      if (res.ok) {
        const data = await res.json();
        setForm({ ...form, gym_id: data.id });
        setGymSearch(data.name);
        setShowGymCreate(false);
        setNewGym({ name: '', city: '', state: '' });
      }
    } catch {}
  }

  function heightDisplay(inches) {
    if (!inches) return '';
    const ft = Math.floor(inches / 12);
    const ins = inches % 12;
    return `${ft}'${ins}"`;
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Athlete Profile</h1>
        <p className="text-gray-400 mt-1">Keep your stats and goals up to date</p>
      </div>

      {/* Profile header */}
      {profile && (
        <div
          className="rounded-xl p-6 border border-gray-800 mb-6 flex items-center gap-4"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ backgroundColor: '#e85d26' }}
          >
            {(profile.first_name || localStorage.getItem('email') || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : profile.first_name || 'Set your name'}
            </h2>
            {profile.gym_name && <p className="text-sm text-gray-400">🏢 {profile.gym_name}</p>}
            {profile.primary_goal && (
              <span
                className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(232,93,38,0.15)', color: '#e85d26' }}
              >
                {profile.primary_goal}
              </span>
            )}
          </div>
          {profile.weight_lbs && profile.height_inches && (
            <div className="ml-auto text-right hidden sm:block">
              <div className="text-sm text-gray-400">{profile.weight_lbs} lbs</div>
              <div className="text-sm text-gray-400">{heightDisplay(profile.height_inches)}</div>
              {profile.age && <div className="text-sm text-gray-400">{profile.age} years old</div>}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}
        {saved && (
          <div className="px-4 py-3 rounded-lg border border-green-800 bg-green-900/20 text-green-400 text-sm">
            Profile saved successfully!
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
                placeholder="John"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Smith"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="25"
                min="13"
                max="100"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Weight (lbs)</label>
              <input
                type="number"
                value={form.weight_lbs}
                onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })}
                placeholder="185"
                step="0.1"
                min="50"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Height (inches)</label>
              <input
                type="number"
                value={form.height_inches}
                onChange={(e) => setForm({ ...form, height_inches: e.target.value })}
                placeholder="70"
                min="48"
                max="96"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-6 border border-gray-800 space-y-4"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Training Focus</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Primary Goal</label>
            <select
              value={form.primary_goal}
              onChange={(e) => setForm({ ...form, primary_goal: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-orange-500"
              style={{ backgroundColor: '#16213e' }}
            >
              <option value="">Select a goal...</option>
              {PRIMARY_GOALS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell your trainer about your training background, injuries, goals..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
              style={{ backgroundColor: '#16213e' }}
            />
          </div>
        </div>

        <div
          className="rounded-xl p-6 border border-gray-800 space-y-4"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Gym</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Gym ID (optional)</label>
            <input
              type="text"
              value={form.gym_id}
              onChange={(e) => setForm({ ...form, gym_id: e.target.value })}
              placeholder="Enter gym UUID or leave blank"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
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
          style={{ backgroundColor: '#e85d26' }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
