'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [form, setForm] = useState({ email: '', password: '', role: 'athlete' });
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const canvasRef = useRef(null);
  const codeInputRefs = useRef([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Particle animation
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
        ctx.fillStyle = `rgba(232,93,38,${p.o})`;
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
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      setStep('verify');
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (verifyCode.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: verifyCode }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      router.push(data.user.role === 'trainer' ? '/trainer' : '/dashboard');
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      const res = await fetch(`${API}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) setError(data.error || 'Failed to resend');
    } catch {
      setError('Network error');
    }
    setResending(false);
  }

  // Handle individual code box input
  function handleCodeBoxChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newCode = verifyCode.split('');
    newCode[index] = value.slice(-1);
    const joined = newCode.join('').replace(/undefined/g, '');
    setVerifyCode(joined.padEnd(index + (value ? 1 : 0), '').slice(0, 6));

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
    // Update the full code
    const finalCode = [...verifyCode.split('')];
    finalCode[index] = value.slice(-1) || '';
    setVerifyCode(finalCode.join('').slice(0, 6));
  }

  function handleCodeKeyDown(index, e) {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setVerifyCode(paste);
    const focusIdx = Math.min(paste.length, 5);
    codeInputRefs.current[focusIdx]?.focus();
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
      0%, 100% { box-shadow: 0 0 20px rgba(232,93,38,0.15); }
      50% { box-shadow: 0 0 40px rgba(232,93,38,0.25); }
    }
    @keyframes mailBounce {
      0%, 100% { transform: translateY(0) scale(1); }
      30% { transform: translateY(-8px) scale(1.05); }
      60% { transform: translateY(-3px) scale(1.02); }
    }
    @keyframes borderGlow {
      0%, 100% { border-color: rgba(232,93,38,0.4); box-shadow: 0 0 15px rgba(232,93,38,0.1); }
      50% { border-color: rgba(232,93,38,0.7); box-shadow: 0 0 25px rgba(232,93,38,0.2); }
    }
  `;

  const roleCards = [
    {
      value: 'athlete',
      label: 'Player',
      desc: 'Track workouts, upload film, and get AI analysis',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M4.93 4.93 C6.58 8.22 6.58 15.78 4.93 19.07"/>
          <path d="M19.07 4.93 C17.42 8.22 17.42 15.78 19.07 19.07"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
        </svg>
      ),
    },
    {
      value: 'trainer',
      label: 'Coach',
      desc: 'Manage teams, create plays, and assign training',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      ),
    },
  ];

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
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#e85d04' }}>ATHLETE</span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>EDGE</span>
        </Link>
        <Link href="/login" style={{
          fontSize: '14px', fontWeight: 600, color: '#e85d04',
          textDecoration: 'none', padding: '8px 20px', borderRadius: '10px',
          border: '1px solid rgba(232,93,4,0.3)', background: 'rgba(232,93,4,0.05)',
          transition: 'all 0.2s',
        }}>
          Sign In
        </Link>
      </nav>

      {/* Main split layout */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 10 }}>

        {/* Left decorative panel */}
        <div style={{
          flex: '0 0 50%', position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          background: 'linear-gradient(135deg, #0d0d22 0%, #12122e 30%, #0a1628 60%, #08081a 100%)',
        }} className="register-deco-panel">
          {/* Animated gradient mesh */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(232,93,38,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(249,115,22,0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 50%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 12s ease infinite',
          }} />

          {/* Particle canvas */}
          <canvas ref={canvasRef} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
          }} />

          {/* Branding */}
          <div style={{ position: 'relative', zIndex: 10, padding: '48px', maxWidth: '500px' }}>
            <div style={{
              fontSize: '56px', fontWeight: 900, lineHeight: 1.05, marginBottom: '16px',
              letterSpacing: '-2px',
            }}>
              <span style={{ color: '#e85d04' }}>ATHLETE</span>
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
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Players Active</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>2,400+</div>
                <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginTop: '4px' }}>Growing daily</div>
              </div>

              <div style={{
                position: 'absolute', top: '80px', right: '0',
                background: 'rgba(232,93,38,0.08)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(232,93,38,0.15)', borderRadius: '16px',
                padding: '20px 24px', minWidth: '180px',
                animation: 'floatCard2 7s ease-in-out infinite',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Analyses</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#e85d04' }}>50K+</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: '4px' }}>Films reviewed</div>
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Team Connected</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Coaches & players united</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div style={{
          flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', position: 'relative', overflowY: 'auto',
        }}>
          {/* Ambient glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,93,38,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            width: '100%', maxWidth: '440px', position: 'relative',
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
              {step === 'form' ? (
                <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                  <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <h1 style={{
                      fontSize: '30px', fontWeight: 900, color: '#fff', marginBottom: '8px',
                      letterSpacing: '-0.5px',
                    }}>Join Athlete Edge</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                      Create your free account today
                    </p>
                  </div>

                  {error && (
                    <div style={{
                      marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
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
                      backdropFilter: 'blur(10px)', boxSizing: 'border-box',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>or sign up with email</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  </div>

                  <form onSubmit={handleSubmit}>
                    {/* Role selector */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px',
                        color: 'rgba(255,255,255,0.45)',
                      }}>I am a...</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {roleCards.map((r) => {
                          const isActive = form.role === r.value;
                          return (
                            <button
                              key={r.value}
                              type="button"
                              onClick={() => setForm({ ...form, role: r.value })}
                              style={{
                                padding: '18px 16px', borderRadius: '16px',
                                cursor: 'pointer', transition: 'all 0.25s ease',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                textAlign: 'center',
                                background: isActive ? 'rgba(232,93,4,0.08)' : 'rgba(255,255,255,0.02)',
                                border: isActive ? '1.5px solid rgba(232,93,4,0.5)' : '1.5px solid rgba(255,255,255,0.06)',
                                color: isActive ? '#f97316' : 'rgba(255,255,255,0.35)',
                                boxShadow: isActive ? '0 0 20px rgba(232,93,4,0.1), inset 0 1px 0 rgba(232,93,4,0.1)' : 'none',
                                animation: isActive ? 'borderGlow 3s ease-in-out infinite' : 'none',
                              }}
                            >
                              <div style={{ marginBottom: '2px' }}>{r.icon}</div>
                              <div style={{ fontSize: '15px', fontWeight: 700 }}>{r.label}</div>
                              <div style={{
                                fontSize: '11px', lineHeight: '1.4',
                                color: isActive ? 'rgba(249,115,22,0.7)' : 'rgba(255,255,255,0.25)',
                              }}>{r.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px',
                        color: emailFocused ? '#e85d04' : 'rgba(255,255,255,0.45)',
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
                          border: emailFocused ? '1px solid #e85d04' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: emailFocused ? '0 0 0 3px rgba(232,93,4,0.12), 0 0 20px rgba(232,93,4,0.05)' : 'none',
                          transition: 'all 0.25s ease',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px',
                        color: passwordFocused ? '#e85d04' : 'rgba(255,255,255,0.45)',
                        transition: 'color 0.2s',
                      }}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Min. 6 characters"
                          required
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          style={{
                            width: '100%', padding: '12px 48px 12px 16px', borderRadius: '12px',
                            color: '#fff', fontSize: '14px', outline: 'none',
                            background: 'rgba(255,255,255,0.04)',
                            border: passwordFocused ? '1px solid #e85d04' : '1px solid rgba(255,255,255,0.08)',
                            boxShadow: passwordFocused ? '0 0 0 3px rgba(232,93,4,0.12), 0 0 20px rgba(232,93,4,0.05)' : 'none',
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
                        background: 'linear-gradient(135deg, #e85d04, #f97316)',
                        opacity: loading ? 0.5 : 1,
                        transition: 'all 0.25s ease',
                        animation: !loading ? 'pulseGlow 3s ease-in-out infinite' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 30px rgba(232,93,4,0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      {loading ? 'Sending code...' : 'Create Account'}
                    </button>
                  </form>

                  <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{ fontWeight: 600, color: '#e85d04', textDecoration: 'none' }}>
                      Sign in
                    </Link>
                  </p>
                </div>
              ) : (
                <div style={{ animation: 'fadeInUp 0.5s ease' }}>
                  <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    {/* Animated mail icon */}
                    <div style={{
                      width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08))',
                      border: '1px solid rgba(59,130,246,0.2)',
                      animation: 'mailBounce 2s ease-in-out infinite',
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <h1 style={{
                      fontSize: '26px', fontWeight: 900, color: '#fff', marginBottom: '8px',
                      letterSpacing: '-0.5px',
                    }}>Check your inbox</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.5' }}>
                      We sent a 6-digit code to<br />
                      <strong style={{ color: '#fff' }}>{form.email}</strong>
                    </p>
                  </div>

                  {error && (
                    <div style={{
                      marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#f87171', backdropFilter: 'blur(10px)',
                      animation: 'fadeInUp 0.3s ease',
                    }}>
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleVerify}>
                    {/* 6 individual code boxes */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '12px',
                        color: codeFocused ? '#e85d04' : 'rgba(255,255,255,0.45)',
                        textAlign: 'center', transition: 'color 0.2s',
                      }}>Verification Code</label>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <input
                            key={i}
                            ref={(el) => (codeInputRefs.current[i] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={verifyCode[i] || ''}
                            onFocus={() => setCodeFocused(true)}
                            onBlur={() => setCodeFocused(false)}
                            onChange={(e) => handleCodeBoxChange(i, e.target.value)}
                            onKeyDown={(e) => handleCodeKeyDown(i, e)}
                            onPaste={i === 0 ? handleCodePaste : undefined}
                            style={{
                              width: '48px', height: '56px', textAlign: 'center',
                              fontSize: '22px', fontWeight: 700, fontFamily: 'monospace',
                              color: '#fff', borderRadius: '12px', outline: 'none',
                              background: verifyCode[i] ? 'rgba(232,93,38,0.06)' : 'rgba(255,255,255,0.04)',
                              border: verifyCode[i] ? '1.5px solid rgba(232,93,38,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
                              boxShadow: verifyCode[i] ? '0 0 12px rgba(232,93,38,0.08)' : 'none',
                              transition: 'all 0.2s ease',
                              boxSizing: 'border-box',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '14px',
                        fontWeight: 700, color: '#fff', fontSize: '15px', border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        background: 'linear-gradient(135deg, #e85d04, #f97316)',
                        opacity: loading ? 0.5 : 1,
                        transition: 'all 0.25s ease',
                        animation: !loading ? 'pulseGlow 3s ease-in-out infinite' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 30px rgba(232,93,4,0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      {loading ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                  </form>

                  <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
                      Didn&apos;t receive the code?{' '}
                      <button
                        onClick={handleResend}
                        disabled={resending}
                        style={{
                          fontWeight: 600, color: '#e85d04', background: 'none', border: 'none',
                          cursor: resending ? 'not-allowed' : 'pointer', fontSize: '14px',
                          opacity: resending ? 0.5 : 1,
                        }}
                      >
                        {resending ? 'Resending...' : 'Resend code'}
                      </button>
                    </p>
                    <p style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(255,255,255,0.2)' }}>
                      Code expires in 10 minutes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile responsive style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .register-deco-panel {
          display: flex !important;
        }
        @media (max-width: 768px) {
          .register-deco-panel {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
