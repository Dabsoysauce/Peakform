'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';

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

function CountUp({ to = 0, duration = 900 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!to) { setVal(0); return; }
    let current = 0;
    const step = to / (duration / 16);
    const id = setInterval(() => {
      current += step;
      if (current >= to) { setVal(to); clearInterval(id); }
      else setVal(Math.floor(current));
    }, 16);
    return () => clearInterval(id);
  }, [to, duration]);
  return val;
}

function GlassCard({ children, style, delay = 0, mounted, span, rowSpan, ...props }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, border-color 0.3s, box-shadow 0.3s`,
        gridColumn: span ? `span ${span}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        ...style,
      }}
      {...props}
    >
      {isHovered && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--primary-rgb),0.06), transparent 60%)`,
          zIndex: 0,
        }} />
      )}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.025, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

export default function PlayerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadData();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [id]);

  async function loadData() {
    try {
      const res = await apiFetch(`/teams/players/${id}/profile`);
      if (res.status === 403) { setError('You don\'t have access to this player\'s profile'); setLoading(false); return; }
      if (!res.ok) { setError('Failed to load player profile'); setLoading(false); return; }
      setData(await res.json());
    } catch { setError('Network error'); }
    setLoading(false);
  }

  const profile = data?.profile;
  const workouts = data?.workouts || [];
  const media = data?.media || [];
  const analyses = data?.analyses || [];

  const playerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const heightDisplay = profile?.height_inches ? `${Math.floor(profile.height_inches / 12)}'${profile.height_inches % 12}"` : null;

  const thisWeek = workouts.filter(w => {
    const d = new Date(w.created_at);
    return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  });

  const statsCards = [
    { label: 'Total Workouts', num: workouts.length, color: 'var(--primary)', bg: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.12), rgba(var(--primary-light-rgb),0.05))' },
    { label: 'This Week', num: thisWeek.length, color: '#3b82f6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(96,165,250,0.05))' },
    { label: 'Film Clips', num: media.length, color: '#8b5cf6', bg: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(167,139,250,0.05))' },
  ];

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <Link href="/trainer/teams" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Teams
        </Link>
        <div style={{ marginTop: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{error}</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>This profile is only visible to the player&apos;s coaches.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .player-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .stat-card:hover { transform: translateY(-3px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important; }
        @media (max-width: 768px) {
          .player-grid { grid-template-columns: 1fr !important; }
          .player-grid > * { grid-column: span 1 !important; grid-row: span 1 !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .player-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .player-grid > *:last-child { grid-column: span 2 !important; }
        }
      `}</style>

      {/* Back button */}
      <Link href="/trainer/teams" style={{
        color: 'var(--primary)', textDecoration: 'none', fontSize: 14, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24,
        opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Teams
      </Link>

      {/* Header */}
      <div style={{
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
        marginBottom: 40, display: 'flex', alignItems: 'center', gap: 20,
      }}>
        {loading ? <Skeleton width={72} height={72} rounded={36} /> : (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: profile?.profile_photo_url ? `url(${profile.profile_photo_url}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: 'white', flexShrink: 0,
              boxShadow: '0 8px 24px rgba(var(--primary-rgb),0.2)',
            }}>
              {!profile?.profile_photo_url && (playerName?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                {playerName || 'Player'}
              </h1>
              {profile?.school_name && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/></svg>
                  {profile.school_name}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Gradient line */}
      <div style={{
        height: 2, borderRadius: 1, marginBottom: 28,
        background: 'linear-gradient(90deg, var(--primary), var(--primary-light), #3b82f6, #8b5cf6, var(--primary))',
        backgroundSize: '200% 100%', animation: 'gradientMove 4s ease infinite', opacity: 0.4,
      }} />

      {/* Stats row */}
      <div className="stats-grid">
        {statsCards.map((s, i) => (
          <GlassCard key={s.label} mounted={mounted} delay={0.1 + i * 0.08} className="stat-card" style={{ cursor: 'default' }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {loading ? <Skeleton height={36} width={60} /> : (
                  <span style={{ textShadow: `0 0 30px ${s.color}40` }}><CountUp to={s.num} /></span>
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>{s.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main grid */}
      <div className="player-grid">
        {/* Profile Info */}
        <GlassCard mounted={mounted} delay={0.35} rowSpan={2}>
          <div style={{ padding: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>Player Info</h2>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3,4,5].map(i => <Skeleton key={i} height={16} width="80%" />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Age', value: profile?.age },
                  { label: 'Height', value: heightDisplay },
                  { label: 'Weight', value: profile?.weight_lbs ? `${profile.weight_lbs} lbs` : null },
                  { label: 'GPA', value: profile?.gpa },
                  { label: 'School', value: profile?.school_name },
                  { label: 'Goal', value: profile?.primary_goal },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))}
                {profile?.bio && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 6 }}>Bio</div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{profile.bio}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Recent Workouts */}
        <GlassCard mounted={mounted} delay={0.4} span={2}>
          <div style={{ padding: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>Recent Workouts</h2>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2,3].map(i => <Skeleton key={i} height={56} />)}</div>
            ) : workouts.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No workouts logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {workouts.slice(0, 6).map(w => (
                  <div key={w.id} style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{w.session_name || 'Workout'}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(w.created_at).toLocaleDateString()}</span>
                    </div>
                    {w.exercises && w.exercises.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {w.exercises.slice(0, 4).map((ex, j) => (
                          <span key={j} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(var(--primary-rgb),0.08)', color: 'var(--primary-light)',
                          }}>
                            {ex.exercise_name}: {ex.sets}x{ex.reps}{ex.weight_lbs ? ` @ ${ex.weight_lbs}lbs` : ''}
                          </span>
                        ))}
                        {w.exercises.length > 4 && (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>+{w.exercises.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Film Room */}
        <GlassCard mounted={mounted} delay={0.5} span={2}>
          <div style={{ padding: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>Film Room</h2>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2].map(i => <Skeleton key={i} height={64} />)}</div>
            ) : media.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No film uploaded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {media.slice(0, 5).map(m => {
                  const analysis = analyses.find(a => a.media_title === m.title);
                  return (
                    <div key={m.id} style={{
                      display: 'flex', gap: 14, padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      alignItems: 'center',
                    }}>
                      {m.thumbnail_url ? (
                        <img src={m.thumbnail_url} alt="" style={{ width: 64, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 64, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title || 'Untitled'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{new Date(m.created_at).toLocaleDateString()}</div>
                        {analysis && (
                          <div style={{ fontSize: 11, color: 'rgba(var(--primary-light-rgb),0.7)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            AI Analysis available
                          </div>
                        )}
                      </div>
                      {m.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {m.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </>
  );
}
