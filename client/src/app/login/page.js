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

  // Particle animation on decorative panel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        o: Math.random() * 0.4 + 0.1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;
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
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(var(--primary-rgb),0.15); }
      50% { box-shadow: 0 0 40px rgba(var(--primary-rgb),0.25); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#08081a' }}>
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
        padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 20,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary)' }}>ATHLETE</span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>EDGE</span>
        </Link>
        <Link href="/register" style={{
          fontSize: '14px', fontWeight: 600, color: 'var(--primary)',
          textDecoration: 'none', padding: '8px 20px', borderRadius: '10px',
          border: '1px solid rgba(var(--primary-rgb),0.3)', background: 'rgba(var(--primary-rgb),0.05)',
          transition: 'all 0.2s',
        }}>
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
                background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
                padding: '20px 24px', minWidth: '200px',
                animation: 'floatCard1 6s ease-in-out infinite',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Session Logged</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>Upper Body</div>
                <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginTop: '4px' }}>+12% strength gain</div>
              </div>

              <div style={{
                position: 'absolute', top: '80px', right: '0',
                background: 'rgba(var(--primary-rgb),0.08)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(var(--primary-rgb),0.15)', borderRadius: '16px',
                padding: '20px 24px', minWidth: '180px',
                animation: 'floatCard2 7s ease-in-out infinite',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Goal Progress</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>87%</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: '4px' }}>3-point accuracy</div>
              </div>

              <div style={{
                position: 'absolute', bottom: '0', left: '40px',
                background: 'rgba(59,130,246,0.06)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59,130,246,0.12)', borderRadius: '16px',
                padding: '16px 20px', minWidth: '220px',
                animation: 'floatCard3 8s ease-in-out infinite',
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
          {/* Subtle ambient glow behind form */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            width: '100%', maxWidth: '420px', position: 'relative',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}>
            {/* Glass card */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '24px', padding: '40px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{
                  fontSize: '30px', fontWeight: 900, color: '#fff', marginBottom: '8px',
                  letterSpacing: '-0.5px',
                }}>Welcome Back</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                  Sign in to your Athlete Edge account
                </p>
              </div>

              {error && (
                <div style={{
                  marginBottom: '24px', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', backdropFilter: 'blur(10px)',
                  animation: 'fadeInUp 0.3s ease',
                }}>
                  {error}
                </div>
              )}

              {/* Google OAuth */}
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/api/auth/google`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  width: '100%', padding: '12px', borderRadius: '14px',
                  fontWeight: 600, color: '#fff', fontSize: '14px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                Continue with Google
              </a>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              </div>

              <form onSubmit={handleSubmit}>
                {/* Email field */}
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <label style={{
                    display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px',
                    color: emailFocused ? 'var(--primary)' : 'rgba(255,255,255,0.45)',
                    transition: 'color 0.2s',
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
                      width: '100%', padding: '12px 16px', borderRadius: '12px',
                      color: '#fff', fontSize: '14px', outline: 'none',
                      background: 'rgba(255,255,255,0.04)',
                      border: emailFocused ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: emailFocused ? '0 0 0 3px rgba(var(--primary-rgb),0.12), 0 0 20px rgba(var(--primary-rgb),0.05)' : 'none',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password field */}
                <div style={{ marginBottom: '24px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{
                      fontSize: '13px', fontWeight: 600,
                      color: passwordFocused ? 'var(--primary)' : 'rgba(255,255,255,0.45)',
                      transition: 'color 0.2s',
                    }}>Password</label>
                    <Link href="/forgot-password" style={{
                      fontSize: '12px', fontWeight: 600, color: 'var(--primary)',
                      textDecoration: 'none',
                    }}>
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
                        width: '100%', padding: '12px 48px 12px 16px', borderRadius: '12px',
                        color: '#fff', fontSize: '14px', outline: 'none',
                        background: 'rgba(255,255,255,0.04)',
                        border: passwordFocused ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: passwordFocused ? '0 0 0 3px rgba(var(--primary-rgb),0.12), 0 0 20px rgba(var(--primary-rgb),0.05)' : 'none',
                        transition: 'all 0.25s ease',
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
                      }}
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
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    fontWeight: 700, color: '#fff', fontSize: '15px', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.25s ease',
                    animation: !loading ? 'pulseGlow 3s ease-in-out infinite' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(var(--primary-rgb),0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
                Don&apos;t have an account?{' '}
                <Link href="/register" style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
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
