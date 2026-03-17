'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadProfilePicture, deleteProfilePicture } from '../../lib/supabase';

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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await apiFetch('/trainer-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setPhotoPreview(data.photo_url || null);
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
      await apiFetch('/trainer-profile', { method: 'PUT', body: JSON.stringify({ photo_url: url }) });
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
      await apiFetch('/trainer-profile', { method: 'PUT', body: JSON.stringify({ photo_url: '__remove__' }) });
    } catch { setError('Failed to remove photo'); }
    setPhotoUploading(false);
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
      if (!res.ok) { setError(data.error || 'Failed to save profile'); return; }
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Network error'); }
    setSaving(false);
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Loading profile...</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Coach Profile</h1>
        <p className="text-gray-400 mt-1">Showcase your credentials and expertise</p>
      </div>

      {/* Profile header */}
      {profile && (
        <div className="rounded-xl p-6 border border-gray-800 mb-6 flex items-center gap-4" style={{ backgroundColor: '#1e1e30' }}>
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-black text-white cursor-pointer"
              style={{ backgroundColor: '#2563eb' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : (profile.first_name || 'C').charAt(0).toUpperCase()
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
            {profile.specialty && <p className="text-sm mt-0.5" style={{ color: '#2563eb' }}>{profile.specialty}</p>}
            {profile.gym_name && <p className="text-sm text-gray-400">🏀 {profile.gym_name}</p>}
            <p className="text-xs text-gray-500 mt-1">Click photo to change</p>
            {photoPreview && (
              <button type="button" onClick={handleRemovePhoto} className="text-xs text-red-400 hover:underline mt-0.5">
                Remove photo
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {error && <div className="px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>}
        {saved && <div className="px-4 py-3 rounded-lg border border-green-800 bg-green-900/20 text-green-400 text-sm">Profile saved!</div>}

        <div className="rounded-xl p-6 border border-gray-800 space-y-4" style={{ backgroundColor: '#1e1e30' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Personal Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Alex"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" style={{ backgroundColor: '#16213e' }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Johnson"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" style={{ backgroundColor: '#16213e' }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-6 border border-gray-800 space-y-4" style={{ backgroundColor: '#1e1e30' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Professional Info</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Specialty</label>
            <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500" style={{ backgroundColor: '#16213e' }}>
              <option value="">Select your specialty...</option>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Certifications</label>
            <input type="text" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })}
              placeholder="NASM-CPT, CSCS, USA Basketball Licensed..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" style={{ backgroundColor: '#16213e' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell players about your coaching philosophy, experience, and system..."
              rows={5} className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" style={{ backgroundColor: '#16213e' }} />
          </div>
        </div>

        <div className="rounded-xl p-6 border border-gray-800" style={{ backgroundColor: '#1e1e30' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">School / Gym</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Gym ID (optional)</label>
            <input type="text" value={form.gym_id} onChange={(e) => setForm({ ...form, gym_id: e.target.value })} placeholder="Enter gym UUID or leave blank"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" style={{ backgroundColor: '#16213e' }} />
            {profile?.gym_name && <p className="text-xs text-gray-400 mt-1">Current: {profile.gym_name}</p>}
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ backgroundColor: '#2563eb' }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
