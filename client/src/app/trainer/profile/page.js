'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadProfilePicture, deleteProfilePicture } from '../../lib/supabase';
import SchoolSearch from '../../components/SchoolSearch';

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

/* ── Shimmer Skeleton ─────────────────────────────────── */
function Skeleton({ width = '100%', height = 20, rounded = 12 }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
      backgroundSize: '300% 100%',
      animation: 'shimmer 1.6s ease infinite',
    }} />
  );
}

/* ── Glass Card ───────────────────────────────────────── */
function GlassCard({ children, style, delay = 0, mounted, danger = false, ...props }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const borderColor = danger ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.06)';
  const hoverGlow = danger
    ? `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(239,68,68,0.07), transparent 60%)`
    : `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--primary-rgb),0.06), transparent 60%)`;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: danger ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${borderColor}`,
        borderRadius: 20,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, border-color 0.3s, box-shadow 0.3s`,
        ...style,
      }}
      {...props}
    >
      {isHovered && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
          background: hoverGlow,
          zIndex: 0,
        }} />
      )}
      {/* Noise texture */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.025, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ── Shared Styles ────────────────────────────────────── */
const sectionLabel = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: 16,
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const inputFocusStyle = {
  borderColor: 'var(--primary)',
  boxShadow: '0 0 0 3px rgba(var(--primary-rgb),0.15)',
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.55)',
  marginBottom: 6,
};

/* ── Main Page ────────────────────────────────────────── */
export default function TrainerProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', specialty: '', certifications: '', bio: '', school_name: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (!loading) requestAnimationFrame(() => setMounted(true)); }, [loading]);

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
          school_name: data.school_name || '',
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
      const res = await apiFetch('/trainer-profile', {
        method: 'PUT',
        body: JSON.stringify({ ...form, school_name: form.school_name || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save profile'); return; }
      setProfile(data);
      setSaved(true);
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Network error'); }
    setSaving(false);
  }

  function getInputProps(name) {
    return {
      style: {
        ...inputStyle,
        ...(focusedField === name ? inputFocusStyle : {}),
      },
      onFocus: () => setFocusedField(name),
      onBlur: () => setFocusedField(null),
    };
  }

  /* ── Loading skeleton ─────────────────────────────── */
  if (loading) return (
    <div style={{ maxWidth: 640, padding: '0 4px' }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ marginBottom: 32 }}>
        <Skeleton width={220} height={32} rounded={8} />
        <div style={{ marginTop: 8 }}><Skeleton width={300} height={16} rounded={6} /></div>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20,
        padding: 28, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20,
      }}>
        <Skeleton width={80} height={80} rounded={40} />
        <div style={{ flex: 1 }}>
          <Skeleton width={180} height={22} rounded={8} />
          <div style={{ marginTop: 8 }}><Skeleton width={120} height={14} rounded={6} /></div>
          <div style={{ marginTop: 6 }}><Skeleton width={140} height={14} rounded={6} /></div>
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20,
          padding: 28, marginBottom: 20,
        }}>
          <Skeleton width={140} height={14} rounded={6} />
          <div style={{ marginTop: 16 }}><Skeleton height={44} rounded={12} /></div>
          {i === 1 && <div style={{ marginTop: 12 }}><Skeleton height={44} rounded={12} /></div>}
          {i === 1 && <div style={{ marginTop: 12 }}><Skeleton height={100} rounded={12} /></div>}
        </div>
      ))}
      <Skeleton height={52} rounded={14} />
    </div>
  );

  return (
    <div style={{ maxWidth: 640, padding: '0 4px' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes successPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>

      {/* Page header */}
      <div style={{
        marginBottom: 32,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>Coach Profile</h1>
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 14,
          marginTop: 6,
        }}>Showcase your credentials and expertise</p>
      </div>

      {/* Profile header card */}
      {profile && (
        <GlassCard mounted={mounted} delay={0.05} style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar with gradient ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  padding: 3,
                  background: `linear-gradient(135deg, var(--primary), var(--primary-light, #ff8a50))`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(var(--primary-rgb),0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.06)',
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fff',
                }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile.first_name || 'C').charAt(0).toUpperCase()
                  }
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: 12,
                  border: '2px solid #0f0f1a',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {photoUploading ? '...' : '\u{1F4F7}'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                {profile.first_name && profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.first_name || 'Set your name'}
              </h2>
              {profile.specialty && (
                <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, marginTop: 3 }}>{profile.specialty}</p>
              )}
              {profile.school_name && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{'\u{1F3EB}'} {profile.school_name}</p>
              )}
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>Click photo to change</p>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    color: 'rgba(239,68,68,0.7)',
                    cursor: 'pointer',
                    marginTop: 2,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; e.currentTarget.style.textDecoration = 'none'; }}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      <form onSubmit={handleSave}>
        {/* Error / success messages */}
        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 14,
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.06)',
            color: '#f87171',
            fontSize: 13,
            marginBottom: 16,
            backdropFilter: 'blur(8px)',
          }}>{error}</div>
        )}
        {saved && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 14,
            border: '1px solid rgba(74,222,128,0.2)',
            background: 'rgba(74,222,128,0.06)',
            color: '#4ade80',
            fontSize: 13,
            marginBottom: 16,
            backdropFilter: 'blur(8px)',
            animation: 'successPulse 2s ease',
          }}>Profile saved!</div>
        )}

        {/* Personal Info */}
        <GlassCard mounted={mounted} delay={0.1} style={{ padding: 28, marginBottom: 20 }}>
          <div style={sectionLabel}>Personal Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Alex"
                {...getInputProps('first_name')}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Johnson"
                {...getInputProps('last_name')}
              />
            </div>
          </div>
        </GlassCard>

        {/* Professional Info */}
        <GlassCard mounted={mounted} delay={0.15} style={{ padding: 28, marginBottom: 20 }}>
          <div style={sectionLabel}>Professional Info</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Specialty</label>
              <select
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                {...getInputProps('specialty')}
              >
                <option value="" style={{ background: '#1a1a2e' }}>Select your specialty...</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s} style={{ background: '#1a1a2e' }}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Certifications</label>
              <input
                type="text"
                value={form.certifications}
                onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                placeholder="NASM-CPT, CSCS, USA Basketball Licensed..."
                {...getInputProps('certifications')}
              />
            </div>
            <div>
              <label style={labelStyle}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell players about your coaching philosophy, experience, and system..."
                rows={5}
                {...getInputProps('bio')}
                style={{
                  ...inputStyle,
                  ...(focusedField === 'bio' ? inputFocusStyle : {}),
                  resize: 'none',
                }}
              />
            </div>
          </div>
        </GlassCard>

        {/* School */}
        <GlassCard mounted={mounted} delay={0.2} style={{ padding: 28, marginBottom: 20 }}>
          <div style={sectionLabel}>School</div>
          <div>
            <label style={labelStyle}>School</label>
            <SchoolSearch
              value={form.school_name}
              onChange={(val) => setForm({ ...form, school_name: val })}
            />
          </div>
        </GlassCard>

        {/* Save button */}
        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s',
        }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 14,
              border: 'none',
              background: saving
                ? 'rgba(var(--primary-rgb),0.4)'
                : 'linear-gradient(135deg, var(--primary), var(--primary-light, #ff8a50))',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
              opacity: saving ? 0.6 : 1,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(var(--primary-rgb),0.3)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div style={{ marginTop: 32 }}>
        <GlassCard mounted={mounted} delay={0.3} danger style={{ padding: 28 }}>
          <div style={{
            ...sectionLabel,
            color: 'rgba(239,68,68,0.6)',
            marginBottom: 8,
          }}>Danger Zone</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.06)',
                color: '#f87171',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
            >
              Delete Account
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#fca5a5' }}>Are you sure? This is permanent.</span>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => { if (!deleting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(239,68,68,0.3)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
              >
                Cancel
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
