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
    @keyframes mailBounce {
      0%, 100% { transform: translateY(0) scale(1); }
      30% { transform: translateY(-8px) scale(1.05); }
      60% { transform: translateY(-3px) scale(1.02); }
    }
    @keyframes borderGlow {
      0%, 100% { border-color: rgba(var(--primary-rgb),0.4); box-shadow: 0 0 15px rgba(var(--primary-rgb),0.1), inset 0 1px 0 rgba(var(--primary-rgb),0.08); }
      50% { border-color: rgba(var(--primary-rgb),0.7); box-shadow: 0 0 25px rgba(var(--primary-rgb),0.2), inset 0 1px 0 rgba(var(--primary-rgb),0.12); }
    }
    @keyframes codeBoxPulse {
      0%, 100% { box-shadow: 0 0 12px rgba(var(--primary-rgb),0.08); }
      50% { box-shadow: 0 0 20px rgba(var(--primary-rgb),0.15); }
    }
    @keyframes successPulse {
      0% { transform: scale(0.95); opacity: 0; }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); opacity: 1; }
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

  const glassInputStyle = (focused) => ({
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    color: '#fff', fontSize: '14px', outline: 'none',
    background: focused ? 'rgba(var(--primary-rgb),0.04)' : 'rgba(255,255,255,0.04)',
    border: focused ? '1px solid rgba(var(--primary-rgb),0.5)' : '1px solid rgba(255,255,255,0.08)',
    boxShadow: focused
      ? '0 0 0 3px rgba(var(--primary-rgb),0.1), 0 0 24px rgba(var(--primary-rgb),0.06), inset 0 1px 0 rgba(var(--primary-rgb),0.08)'
      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    boxSizing: 'border-box',
  });

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
        <Link href="/login" style={{
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
            background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(var(--primary-rgb),0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(var(--primary-light-rgb),0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 50%)',
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
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Players Active</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>2,400+</div>
                <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginTop: '4px' }}>Growing daily</div>
              </div>

              <div style={{
                position: 'absolute', top: '80px', right: '0',
                background: 'rgba(var(--primary-rgb),0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(var(--primary-rgb),0.15)', borderRadius: '16px',
                padding: '20px 24px', minWidth: '180px',
                animation: 'floatCard2 7s ease-in-out infinite',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(var(--primary-rgb),0.1)',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Analyses</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>50K+</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: '4px' }}>Films reviewed</div>
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
          {/* Ambient glow orb */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: 'glowOrb 6s ease-in-out infinite',
          }} />

          <div style={{
            width: '100%', maxWidth: '440px', position: 'relative',
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
              {step === 'form' ? (
                <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                  <div style={{
                    textAlign: 'center', marginBottom: '28px',
                    animation: mounted ? 'staggerIn 0.5s ease 0.1s both' : 'none',
                  }}>
                    <h1 style={{
                      fontSize: '30px', fontWeight: 900, color: '#fff', marginBottom: '8px',
                      letterSpacing: '-0.5px',
                      background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>Join Athlete Edge</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                      Create your free account today
                    </p>
                  </div>

                  {error && (
                    <div style={{
                      marginBottom: '20px', padding: '14px 16px', borderRadius: '14px', fontSize: '14px',
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
                    {/* Role selector */}
                    <div style={{
                      marginBottom: '20px',
                      animation: mounted ? 'staggerIn 0.5s ease 0.25s both' : 'none',
                    }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px',
                        color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2px',
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
                                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                textAlign: 'center',
                                background: isActive
                                  ? 'linear-gradient(135deg, rgba(var(--primary-rgb),0.1) 0%, rgba(var(--primary-rgb),0.04) 100%)'
                                  : 'rgba(255,255,255,0.02)',
                                border: isActive ? '1.5px solid rgba(var(--primary-rgb),0.5)' : '1.5px solid rgba(255,255,255,0.06)',
                                color: isActive ? 'var(--primary-light)' : 'rgba(255,255,255,0.35)',
                                boxShadow: isActive
                                  ? '0 0 20px rgba(var(--primary-rgb),0.1), inset 0 1px 0 rgba(var(--primary-rgb),0.1)'
                                  : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                                animation: isActive ? 'borderGlow 3s ease-in-out infinite' : 'none',
                                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }
                              }}
                            >
                              {/* Active glow indicator */}
                              {isActive && (
                                <div style={{
                                  position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                                  width: '40%', height: '2px',
                                  background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
                                  borderRadius: '2px',
                                }} />
                              )}
                              <div style={{ marginBottom: '2px' }}>{r.icon}</div>
                              <div style={{ fontSize: '15px', fontWeight: 700 }}>{r.label}</div>
                              <div style={{
                                fontSize: '11px', lineHeight: '1.4',
                                color: isActive ? 'rgba(var(--primary-light-rgb),0.7)' : 'rgba(255,255,255,0.25)',
                              }}>{r.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{
                      marginBottom: '18px',
                      animation: mounted ? 'staggerIn 0.5s ease 0.3s both' : 'none',
                    }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px',
                        color: emailFocused ? 'var(--primary)' : 'rgba(255,255,255,0.45)',
                        transition: 'color 0.3s ease', letterSpacing: '0.2px',
                      }}>Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        required
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        style={glassInputStyle(emailFocused)}
                      />
                    </div>

                    {/* Password */}
                    <div style={{
                      marginBottom: '24px',
                      animation: mounted ? 'staggerIn 0.5s ease 0.35s both' : 'none',
                    }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px',
                        color: passwordFocused ? 'var(--primary)' : 'rgba(255,255,255,0.45)',
                        transition: 'color 0.3s ease', letterSpacing: '0.2px',
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
                            ...glassInputStyle(passwordFocused),
                            padding: '13px 48px 13px 16px',
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
                    <div style={{ animation: mounted ? 'staggerIn 0.5s ease 0.4s both' : 'none' }}>
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          width: '100%', padding: '14px', borderRadius: '14px',
                          fontWeight: 700, color: '#fff', fontSize: '15px', border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
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
                        {loading ? 'Sending code...' : 'Create Account'}
                      </button>
                    </div>
                  </form>

                  <p style={{
                    textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)',
                    animation: mounted ? 'staggerIn 0.5s ease 0.45s both' : 'none',
                  }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{
                      fontWeight: 600, color: 'var(--primary)', textDecoration: 'none',
                      transition: 'opacity 0.2s',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
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
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.06))',
                      border: '1px solid rgba(59,130,246,0.2)',
                      animation: 'mailBounce 2s ease-in-out infinite',
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      boxShadow: '0 8px 32px rgba(59,130,246,0.08), inset 0 1px 0 rgba(59,130,246,0.1)',
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <h1 style={{
                      fontSize: '26px', fontWeight: 900, color: '#fff', marginBottom: '8px',
                      letterSpacing: '-0.5px',
                      background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>Check your inbox</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.5' }}>
                      We sent a 6-digit code to<br />
                      <strong style={{ color: 'var(--primary-light)' }}>{form.email}</strong>
                    </p>
                  </div>

                  {error && (
                    <div style={{
                      marginBottom: '20px', padding: '14px 16px', borderRadius: '14px', fontSize: '14px',
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

                  <form onSubmit={handleVerify}>
                    {/* 6 individual code boxes */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '12px',
                        color: codeFocused ? 'var(--primary)' : 'rgba(255,255,255,0.45)',
                        textAlign: 'center', transition: 'color 0.3s ease', letterSpacing: '0.2px',
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
                              background: verifyCode[i]
                                ? 'linear-gradient(135deg, rgba(var(--primary-rgb),0.08) 0%, rgba(var(--primary-rgb),0.03) 100%)'
                                : 'rgba(255,255,255,0.04)',
                              border: verifyCode[i] ? '1.5px solid rgba(var(--primary-rgb),0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                              boxShadow: verifyCode[i]
                                ? '0 0 16px rgba(var(--primary-rgb),0.1), inset 0 1px 0 rgba(var(--primary-rgb),0.08)'
                                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                              transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                              boxSizing: 'border-box',
                              animation: verifyCode[i] ? 'codeBoxPulse 2s ease-in-out infinite' : 'none',
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
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        backgroundSize: '200% auto',
                        opacity: loading ? 0.5 : 1,
                        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                        animation: !loading ? 'pulseGlow 3s ease-in-out infinite, shimmer 3s linear infinite' : 'none',
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
                          fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none',
                          cursor: resending ? 'not-allowed' : 'pointer', fontSize: '14px',
                          opacity: resending ? 0.5 : 1,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => { if (!resending) e.currentTarget.style.opacity = '0.8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = resending ? '0.5' : '1'; }}
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
