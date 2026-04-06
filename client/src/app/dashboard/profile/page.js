'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadProfilePicture, deleteProfilePicture } from '../../lib/supabase';
import SchoolSearch from '../../components/SchoolSearch';


export default function AthleteProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', age: '', weight_lbs: '', height_inches: '',
    bio: '', school_name: '', gpa: '', graduation_year: '',
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
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

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
      window.dispatchEvent(new CustomEvent('profileUpdated'));
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
      window.dispatchEvent(new CustomEvent('profileUpdated'));
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

  const inputClasses = "w-full px-4 py-2.5 rounded-xl text-white placeholder-white/25 focus:outline-none transition-all duration-200";
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.2s ease',
  };

  function handleInputFocus(e) {
    e.target.style.borderColor = 'rgba(var(--primary-rgb),0.4)';
    e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.1)';
    e.target.style.background = 'rgba(255,255,255,0.06)';
  }

  function handleInputBlur(e) {
    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
    e.target.style.boxShadow = 'none';
    e.target.style.background = 'rgba(255,255,255,0.04)';
  }

  // Shimmer loading skeleton
  if (loading) return (
    <div className="max-w-2xl space-y-6">
      <style>{`
        @keyframes profileShimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .profile-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 400px 100%;
          animation: profileShimmer 1.6s ease-in-out infinite;
          border-radius: 12px;
        }
      `}</style>
      <div>
        <div className="profile-skeleton" style={{ width: '220px', height: '32px', marginBottom: '8px' }} />
        <div className="profile-skeleton" style={{ width: '180px', height: '16px' }} />
      </div>
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          <div className="profile-skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0 }} />
          <div className="flex-1 space-y-2">
            <div className="profile-skeleton" style={{ width: '160px', height: '20px' }} />
            <div className="profile-skeleton" style={{ width: '120px', height: '14px' }} />
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="profile-skeleton" style={{ width: '120px', height: '13px', marginBottom: '16px' }} />
          <div className="grid grid-cols-2 gap-4">
            <div className="profile-skeleton" style={{ height: '42px' }} />
            <div className="profile-skeleton" style={{ height: '42px' }} />
          </div>
        </div>
      ))}
    </div>
  );

  const glassCard = {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.06)',
  };

  const sectionHeaderClass = "font-semibold uppercase tracking-widest mb-1";
  const sectionHeaderStyle = { fontSize: '13px', color: 'rgba(255,255,255,0.35)' };

  return (
    <div
      className="max-w-2xl"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <style>{`
        @keyframes profileGradientLine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes avatarRingSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .profile-save-btn {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          position: relative;
          overflow: hidden;
        }
        .profile-save-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .profile-save-btn:hover::before {
          opacity: 1;
        }
      `}</style>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Player Profile</h1>
        <p className="mt-1" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Keep your stats up to date</p>
        {/* Animated gradient line */}
        <div
          className="mt-3 rounded-full"
          style={{
            height: '2px',
            width: '80px',
            background: 'linear-gradient(90deg, var(--primary), var(--primary-light), var(--primary))',
            backgroundSize: '200% 100%',
            animation: 'profileGradientLine 3s ease infinite',
          }}
        />
      </div>

      {/* Profile header card */}
      {profile && (
        <div className="rounded-2xl p-6 mb-6 flex items-center gap-5" style={glassCard}>
          {/* Avatar with gradient ring */}
          <div className="relative flex-shrink-0">
            <div
              className="rounded-full p-[3px] cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              }}
            >
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-black text-white"
                style={{ background: '#1e1e30' }}
              >
                {photoPreview
                  ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  : (profile.first_name || 'P').charAt(0).toUpperCase()
                }
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                border: '2px solid #0f0f1a',
                boxShadow: '0 2px 8px rgba(var(--primary-rgb),0.3)',
              }}
            >
              {photoUploading ? '...' : '📷'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">
              {profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : profile.first_name || 'Set your name'}
            </h2>
            {profile.school_name && (
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>🏫 {profile.school_name}</p>
            )}
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Click photo to change</p>
            {photoPreview && (
              <button type="button" onClick={handleRemovePhoto} className="text-xs text-red-400 hover:text-red-300 transition-colors mt-0.5">
                Remove photo
              </button>
            )}
          </div>
          {profile.weight_lbs && profile.height_inches && (
            <div className="ml-auto text-right hidden sm:block space-y-0.5">
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.weight_lbs} lbs</div>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{heightDisplay(profile.height_inches)}</div>
              {profile.age && <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.age} yrs</div>}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-red-400"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-green-400"
            style={{
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.2)',
              backdropFilter: 'blur(16px)',
            }}
          >
            Profile saved!
          </div>
        )}

        {/* Personal Info */}
        <div className="rounded-2xl p-6 space-y-4" style={glassCard}>
          <h3 className={sectionHeaderClass} style={sectionHeaderStyle}>Personal Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>First Name</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="John"
                className={inputClasses} style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Last Name</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Smith"
                className={inputClasses} style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Age</label>
              <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="16" min="13" max="100"
                className={inputClasses} style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Weight (lbs)</label>
              <input type="number" value={form.weight_lbs} onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })} placeholder="170" step="0.1" min="50"
                className={inputClasses} style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Height (inches)</label>
              <input type="number" value={form.height_inches} onChange={(e) => setForm({ ...form, height_inches: e.target.value })} placeholder="72" min="48" max="96"
                className={inputClasses} style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl p-6 space-y-4" style={glassCard}>
          <h3 className={sectionHeaderClass} style={sectionHeaderStyle}>About</h3>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell your coach about your background and position..."
              rows={4} className={`${inputClasses} resize-none`} style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
        </div>

        {/* School */}
        <div className="rounded-2xl p-6 space-y-4" style={glassCard}>
          <h3 className={sectionHeaderClass} style={sectionHeaderStyle}>School</h3>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>School</label>
            <SchoolSearch
              value={form.school_name}
              onChange={(val) => setForm({ ...form, school_name: val })}
            />
          </div>
        </div>

        {/* Academic Info */}
        <div className="rounded-2xl p-6 space-y-4" style={glassCard}>
          <h3 className={sectionHeaderClass} style={sectionHeaderStyle}>Academic Info</h3>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', marginTop: '-4px' }}>Self-reported — visible to coaches</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>GPA</label>
              <input
                type="number"
                value={form.gpa}
                onChange={(e) => setForm({ ...form, gpa: e.target.value })}
                placeholder="3.75"
                step="0.01"
                min="0"
                max="5"
                className={inputClasses}
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Graduation Year</label>
              <input
                type="number"
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                placeholder="2026"
                min="2020"
                max="2035"
                className={inputClasses}
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="profile-save-btn w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-50 transition-all duration-200"
          style={{
            boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.25)',
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Danger Zone */}
      <div
        className="mt-8 mb-4 rounded-2xl p-6"
        style={{
          background: 'rgba(239,68,68,0.04)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(239,68,68,0.12)',
        }}
      >
        <h3
          className="font-semibold uppercase tracking-widest mb-1"
          style={{ fontSize: '13px', color: 'rgba(248,113,113,0.8)' }}
        >
          Danger Zone
        </h3>
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-red-400 transition-all duration-200 hover:bg-red-500/10"
            style={{
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            Delete Account
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-red-300">Are you sure? This is permanent.</span>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                boxShadow: '0 4px 16px rgba(239,68,68,0.25)',
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2.5 rounded-xl text-sm transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.35)'}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
