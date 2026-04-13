'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
      router.replace(role === 'trainer' ? '/trainer' : '/dashboard');
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced particle animation with connecting lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];
    let w, h;
    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * (w || 800),
        y: Math.random() * (h || 600),
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        o: Math.random() * 0.5 + 0.1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(var(--primary-rgb),${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(var(--primary-rgb),${p.o})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
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

  const keyframes = `
    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes floatCard1 {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50% { transform: translateY(-18px) rotate(-1deg); }
    }
    @keyframes floatCard2 {
      0%, 100% { transform: translateY(0px) rotate(1deg); }
      50% { transform: translateY(-14px) rotate(2deg); }
    }
    @keyframes floatCard3 {
      0%, 100% { transform: translateY(0px) rotate(-1deg); }
      50% { transform: translateY(-20px) rotate(0deg); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes staggerIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(var(--primary-rgb),0.15); }
      50% { box-shadow: 0 0 40px rgba(var(--primary-rgb),0.3); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes borderPulse {
      0%, 100% { border-color: rgba(255,255,255,0.07); }
      50% { border-color: rgba(255,255,255,0.12); }
    }
    @keyframes glowOrb {
      0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
    }
  `;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg, #08081a)' }}>
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />

      {/* Noise texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 20,
        background: 'rgba(8,8,26,0.6)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary)' }}>ATHLETE</span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>EDGE</span>
        </Link>
        <Link href="/register" style={{
          fontSize: '14px', fontWeight: 600, color: 'var(--primary)',
          textDecoration: 'none', padding: '8px 20px', borderRadius: '10px',
          border: '1px solid rgba(var(--primary-rgb),0.3)',
          background: 'rgba(var(--primary-rgb),0.05)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease',
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.12)';
            e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.5)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(var(--primary-rgb),0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.05)';
            e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Create Account
        </Link>
      </nav>

      {/* Main split layout */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 10 }}>

        {/* Left decorative panel - hidden on mobile */}
        <div style={{
          flex: '0 0 50%', position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          background: 'linear-gradient(135deg, #0d0d22 0%, #12122e 30%, #0a1628 60%, #08081a 100%)',
        }} className="login-deco-panel">
          {/* Animated gradient mesh */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(var(--primary-rgb),0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(var(--primary-light-rgb),0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 50%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 12s ease infinite',
          }} />

          {/* Particle canvas */}
          <canvas ref={canvasRef} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
          }} />

          {/* Branding content */}
          <div style={{ position: 'relative', zIndex: 10, padding: '48px', maxWidth: '500px' }}>
            <div style={{
              fontSize: '56px', fontWeight: 900, lineHeight: 1.05, marginBottom: '16px',
              letterSpacing: '-2px',
            }}>
              <span style={{ color: 'var(--primary)' }}>ATHLETE</span>
              <br />
              <span style={{ color: '#ffffff' }}>EDGE</span>
            </div>
            <p style={{
              fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              marginBottom: '48px', letterSpacing: '-0.3px',
            }}>
              Train Smarter. Get Noticed.
            </p>

            {/* Floating stat cards */}
            <div style={{ position: 'relative', height: '260px' }}>
              <div style={{
                position: 'absolute', top: '0', left: '0',
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
                padding: '20px 24px', minWidth: '200px',
                animation: 'floatCard1 6s ease-in-out infinite',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Session Logged</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>Upper Body</div>
                <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginTop: '4px' }}>+12% strength gain</div>
              </div>

              <div style={{
                position: 'absolute', top: '80px', right: '0',
                background: 'rgba(var(--primary-rgb),0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(var(--primary-rgb),0.15)', borderRadius: '16px',
                padding: '20px 24px', minWidth: '180px',
                animation: 'floatCard2 7s ease-in-out infinite',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(var(--primary-rgb),0.1)',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Goal Progress</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>87%</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: '4px' }}>3-point accuracy</div>
              </div>

              <div style={{
                position: 'absolute', bottom: '0', left: '40px',
                background: 'rgba(59,130,246,0.04)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(59,130,246,0.12)', borderRadius: '16px',
                padding: '16px 20px', minWidth: '220px',
                animation: 'floatCard3 8s ease-in-out infinite',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(59,130,246,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M15 10l-4 4l6 6l4-16l-18 7l4 2l2 6l3-4"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Film Analyzed</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>AI found 3 improvements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div style={{
          flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', position: 'relative',
        }}>
          {/* Ambient glow orb behind form */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: 'glowOrb 6s ease-in-out infinite',
          }} />

          <div style={{
            width: '100%', maxWidth: '420px', position: 'relative',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Glass card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
              backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px', padding: '40px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.06) inset',
              animation: 'borderPulse 4s ease-in-out infinite',
            }}>
              <div style={{
                textAlign: 'center', marginBottom: '32px',
                animation: mounted ? 'staggerIn 0.5s ease 0.1s both' : 'none',
              }}>
                <h1 style={{
                  fontSize: '30px', fontWeight: 900, color: '#fff', marginBottom: '8px',
                  letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Welcome Back</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                  Sign in to your Athlete Edge account
                </p>
              </div>

              {error && (
                <div style={{
                  marginBottom: '24px', padding: '14px 16px', borderRadius: '14px', fontSize: '14px',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  animation: 'fadeInUp 0.3s ease',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.08)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Email field */}
                <div style={{
                  marginBottom: '20px', position: 'relative',
                  animation: mounted ? 'staggerIn 0.5s ease 0.25s both' : 'none',
                }}>
                  <label style={{
                    display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px',
                    color: emailFocused ? 'var(--primary)' : 'rgba(255,255,255,0.45)',
                    transition: 'color 0.3s ease',
                    letterSpacing: '0.2px',
                  }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    style={{
                      width: '100%', padding: '13px 16px', borderRadius: '12px',
                      color: '#fff', fontSize: '14px', outline: 'none',
                      background: emailFocused ? 'rgba(var(--primary-rgb),0.04)' : 'rgba(255,255,255,0.04)',
                      border: emailFocused ? '1px solid rgba(var(--primary-rgb),0.5)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: emailFocused
                        ? '0 0 0 3px rgba(var(--primary-rgb),0.1), 0 0 24px rgba(var(--primary-rgb),0.06), inset 0 1px 0 rgba(var(--primary-rgb),0.08)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password field */}
                <div style={{
                  marginBottom: '24px', position: 'relative',
                  animation: mounted ? 'staggerIn 0.5s ease 0.3s both' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{
                      fontSize: '13px', fontWeight: 600,
                      color: passwordFocused ? 'var(--primary)' : 'rgba(255,255,255,0.45)',
                      transition: 'color 0.3s ease',
                      letterSpacing: '0.2px',
                    }}>Password</label>
                    <Link href="/forgot-password" style={{
                      fontSize: '12px', fontWeight: 600, color: 'var(--primary)',
                      textDecoration: 'none', transition: 'opacity 0.2s',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      style={{
                        width: '100%', padding: '13px 48px 13px 16px', borderRadius: '12px',
                        color: '#fff', fontSize: '14px', outline: 'none',
                        background: passwordFocused ? 'rgba(var(--primary-rgb),0.04)' : 'rgba(255,255,255,0.04)',
                        border: passwordFocused ? '1px solid rgba(var(--primary-rgb),0.5)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: passwordFocused
                          ? '0 0 0 3px rgba(var(--primary-rgb),0.1), 0 0 24px rgba(var(--primary-rgb),0.06), inset 0 1px 0 rgba(var(--primary-rgb),0.08)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                        color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div style={{ animation: mounted ? 'staggerIn 0.5s ease 0.35s both' : 'none' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '14px',
                      fontWeight: 700, color: '#fff', fontSize: '15px', border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading
                        ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                        : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                      backgroundSize: '200% auto',
                      opacity: loading ? 0.5 : 1,
                      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                      animation: !loading ? 'pulseGlow 3s ease-in-out infinite, shimmer 3s linear infinite' : 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      letterSpacing: '0.3px',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(var(--primary-rgb),0.45), 0 0 60px rgba(var(--primary-rgb),0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <p style={{
                textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)',
                animation: mounted ? 'staggerIn 0.5s ease 0.4s both' : 'none',
              }}>
                Don&apos;t have an account?{' '}
                <Link href="/register" style={{
                  fontWeight: 600, color: 'var(--primary)', textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile responsive style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .login-deco-panel {
          display: flex !important;
        }
        @media (max-width: 768px) {
          .login-deco-panel {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
