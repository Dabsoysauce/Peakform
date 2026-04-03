'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadProfilePicture, deleteProfilePicture } from '../../lib/supabase';
import SchoolSearch from '../../components/SchoolSearch';

const PRIMARY_GOALS = [
  'Make Varsity',
  'Improve Athleticism',
  'Increase Strength',
  'Improve Speed & Quickness',
  'Increase Vertical Jump',
  'Improve Conditioning',
  'Injury Recovery',
  'Get a Scholarship',
  'General Fitness',
];

export default function AthleteProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', age: '', weight_lbs: '', height_inches: '',
    primary_goal: '', bio: '', school_name: '', gpa: '', graduation_year: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [newGym, setNewGym] = useState({ name: '', city: '', state: '' });
  const [showGymCreate, setShowGymCreate] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await apiFetch('/athlete-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setPhotoPreview(data.photo_url || null);
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          age: data.age || '',
          weight_lbs: data.weight_lbs || '',
          height_inches: data.height_inches || '',
          primary_goal: data.primary_goal || '',
          bio: data.bio || '',
          school_name: data.school_name || '',
          gpa: data.gpa != null ? String(data.gpa) : '',
          graduation_year: data.graduation_year || '',
        });
      }
    } catch {}
    setLoading(false);
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return; }
    setPhotoUploading(true);
    setError('');
    try {
      const userId = localStorage.getItem('userId');
      const url = await uploadProfilePicture(file, userId);
      setPhotoPreview(url);
      await apiFetch('/athlete-profile', { method: 'PUT', body: JSON.stringify({ photo_url: url }) });
    } catch { setError('Failed to upload photo'); }
    setPhotoUploading(false);
  }

  async function handleRemovePhoto() {
    if (!confirm('Remove your profile picture?')) return;
    setPhotoUploading(true);
    setError('');
    try {
      const userId = localStorage.getItem('userId');
      await deleteProfilePicture(userId);
      setPhotoPreview(null);
      await apiFetch('/athlete-profile', { method: 'PUT', body: JSON.stringify({ photo_url: '__remove__' }) });
    } catch { setError('Failed to remove photo'); }
    setPhotoUploading(false);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await apiFetch('/auth/account', { method: 'DELETE' });
      if (res.ok) {
        localStorage.clear();
        window.location.href = '/';
      } else {
        setError('Failed to delete account');
        setConfirmDelete(false);
      }
    } catch { setError('Network error'); setConfirmDelete(false); }
    setDeleting(false);
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
        school_name: form.school_name || null,
        gpa: form.gpa !== '' ? parseFloat(form.gpa) : null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
      };
      const res = await apiFetch('/athlete-profile', { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save profile'); return; }
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Network error'); }
    setSaving(false);
  }

  async function createGym(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/gyms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(newGym),
      });
      if (res.ok) {
        const data = await res.json();
        setForm({ ...form, gym_id: data.id });
        setShowGymCreate(false);
        setNewGym({ name: '', city: '', state: '' });
      }
    } catch {}
  }

  function heightDisplay(inches) {
    if (!inches) return '';
    return `${Math.floor(inches / 12)}'${inches % 12}"`;
  }

  if (loading) return <div className="text-white/40 text-center py-12">Loading profile...</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Player Profile</h1>
        <p className="text-white/40 mt-1">Keep your stats and goals up to date</p>
      </div>

      {/* Profile header */}
      {profile && (
        <div className="rounded-2xl p-6 border border-white/[0.06] mb-6 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          {/* Avatar / photo upload */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-black text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : (profile.first_name || 'P').charAt(0).toUpperCase()
              }
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs border-2 border-gray-900"
              style={{ backgroundColor: '#2563eb' }}
            >
              {photoUploading ? '...' : '📷'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : profile.first_name || 'Set your name'}
            </h2>
            {profile.school_name && <p className="text-sm text-white/40">🏫 {profile.school_name}</p>}
            {profile.primary_goal && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563eb' }}>
                {profile.primary_goal}
              </span>
            )}
            <p className="text-xs text-white/30 mt-1">Click photo to change</p>
            {photoPreview && (
              <button type="button" onClick={handleRemovePhoto} className="text-xs text-red-400 hover:underline mt-0.5">
                Remove photo
              </button>
            )}
          </div>
          {profile.weight_lbs && profile.height_inches && (
            <div className="ml-auto text-right hidden sm:block">
              <div className="text-sm text-white/40">{profile.weight_lbs} lbs</div>
              <div className="text-sm text-white/40">{heightDisplay(profile.height_inches)}</div>
              {profile.age && <div className="text-sm text-white/40">{profile.age} yrs</div>}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {error && <div className="px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>}
        {saved && <div className="px-4 py-3 rounded-lg border border-green-800 bg-green-900/20 text-green-400 text-sm">Profile saved!</div>}

        <div className="rounded-2xl p-6 border border-white/[0.06] space-y-4" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Personal Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">First Name</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="John"
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04]" style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Last Name</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Smith"
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04]" style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Age</label>
              <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="16" min="13" max="100"
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04]" style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Weight (lbs)</label>
              <input type="number" value={form.weight_lbs} onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })} placeholder="170" step="0.1" min="50"
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04]" style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Height (inches)</label>
              <input type="number" value={form.height_inches} onChange={(e) => setForm({ ...form, height_inches: e.target.value })} placeholder="72" min="48" max="96"
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04]" style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-white/[0.06] space-y-4" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Training Focus</h3>
          <div>
            <label className="block text-sm font-medium text-white/50 mb-1">Primary Goal</label>
            <select value={form.primary_goal} onChange={(e) => setForm({ ...form, primary_goal: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white focus:outline-none focus:border-[#e85d04]" style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }}>
              <option value="">Select a goal...</option>
              {PRIMARY_GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/50 mb-1">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell your coach about your background, position, goals..."
              rows={4} className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04] resize-none" style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }} />
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-white/[0.06] space-y-4" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">School</h3>
          <div>
            <label className="block text-sm font-medium text-white/50 mb-1">School</label>
            <SchoolSearch
              value={form.school_name}
              onChange={(val) => setForm({ ...form, school_name: val })}
            />
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-white/[0.06] space-y-4" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Academic Info</h3>
          <p className="text-xs text-white/30">Self-reported — visible to coaches</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">GPA</label>
              <input
                type="number"
                value={form.gpa}
                onChange={(e) => setForm({ ...form, gpa: e.target.value })}
                placeholder="3.75"
                step="0.01"
                min="0"
                max="5"
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04]"
                style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">Graduation Year</label>
              <input
                type="number"
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                placeholder="2026"
                min="2020"
                max="2035"
                className="w-full px-4 py-2.5 rounded-lg border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-[#e85d04]"
                style={{ background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }} onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ backgroundColor: '#2563eb' }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="mt-8 rounded-2xl p-6 border border-red-900/40" style={{ backgroundColor: 'rgba(127,29,29,0.1)' }}>
        <h3 className="font-bold text-red-400 text-sm uppercase tracking-wide mb-1">Danger Zone</h3>
        <p className="text-sm text-white/30 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm text-red-400 border border-red-800 hover:bg-red-900/30 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-300">Are you sure? This is permanent.</span>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-5 py-2.5 rounded-lg font-bold text-sm text-white bg-red-700 hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
