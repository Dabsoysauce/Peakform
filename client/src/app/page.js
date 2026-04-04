'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

/* ───────── TICKER DATA ───────── */
const TICKER_ITEMS = [
  'Jordan M. logged a 54-min workout',
  'Coach Williams viewed 3 profiles today',
  'Tyler K. just hit his vertical jump PR',
  'Alex R. uploaded new game film',
  'Marcus T. is on a 6-day workout streak',
  'Coach Davis viewed Jaylen\'s profile',
  'DeShawn B. crushed his sprint time',
  'Coach Torres left film feedback',
  'Isaiah W. logged his 20th workout this month',
  '2 coaches viewed profiles in the last hour',
];

/* ───────── FEATURE CARDS ───────── */
const FEATURES = [
  {
    title: 'Workout Tracking',
    desc: 'Log every set, rep, and weight. Track RPE, build a history coaches can actually see.',
    icon: '🏋️',
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  },
  {
    title: 'Film Room + AI',
    desc: 'Upload game film or YouTube links. Get AI-powered breakdowns of form, footwork, and IQ.',
    icon: '🎬',
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  {
    title: 'Team Chat',
    desc: 'Real-time messaging with your squad. DMs, group chats, emoji reactions — all built in.',
    icon: '💬',
    accent: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  },
  {
    title: 'Coach Discovery',
    desc: 'Know the instant a coach views your profile. Get recruited with real-time alerts.',
    icon: '👀',
    accent: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
  },
];

/* ───────── STEPS ───────── */
const STEPS = [
  { num: '01', title: 'Create Your Profile', desc: 'Sign up, add your stats, school, position, and bio. Your recruiting profile starts here.' },
  { num: '02', title: 'Train & Upload Film', desc: 'Log workouts, upload game tape, and get AI analysis on your technique and performance.' },
  { num: '03', title: 'Get Discovered', desc: 'Coaches browse, view profiles, and reach out. You get notified in real time when they look.' },
];

/* ───────── COUNTER HOOK ───────── */
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [started, target, duration]);

  return { count, ref };
}

/* ───────── SCROLL-REVEAL HOOK ───────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [heroReady, setHeroReady] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);
  const heroRef = useRef(null);

  // redirect logged-in users
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) window.location.href = '/dashboard';
  }, []);

  // scroll listener for navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // hero entrance
  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  // ticker rotation
  useEffect(() => {
    const id = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_ITEMS.length), 3000);
    return () => clearInterval(id);
  }, []);

  // mouse parallax
  const handleMouse = useCallback((e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMouse({ x, y });
  }, []);

  // stats counters
  const stat1 = useCountUp(5000);
  const stat2 = useCountUp(100);
  const stat3 = useCountUp(500);

  // section reveals
  const featReveal = useReveal();
  const statsReveal = useReveal();
  const stepsReveal = useReveal();
  const ctaReveal = useReveal();

  // particles
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    left: Math.random() * 100,
    top: Math.random() * 100,
    dur: 6 + Math.random() * 10,
    delay: Math.random() * 5,
    opacity: 0.15 + Math.random() * 0.25,
  }));

  return (
    <div style={{ background: '#08081a', color: '#fff', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', minHeight: '100vh' }}>

      {/* ───── GLOBAL KEYFRAMES ───── */}
      <style>{`
        @keyframes aurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-20px); }
        }
        @keyframes particleDrift {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-120px) translateX(30px); opacity: 0; }
        }
        @keyframes tickerSlide {
          0%   { transform: translateY(8px); opacity: 0; }
          15%  { transform: translateY(0); opacity: 1; }
          85%  { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-8px); opacity: 0; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(249,115,22,0.3); }
          50%      { box-shadow: 0 0 40px rgba(249,115,22,0.6); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes notifFloat1 { 0%,100%{ transform: translateY(0) rotate(-6deg); } 50%{ transform: translateY(-12px) rotate(-3deg); } }
        @keyframes notifFloat2 { 0%,100%{ transform: translateY(0) rotate(4deg); } 50%{ transform: translateY(-16px) rotate(7deg); } }
        @keyframes notifFloat3 { 0%,100%{ transform: translateY(0) rotate(2deg); } 50%{ transform: translateY(-10px) rotate(-2deg); } }
        @keyframes lineGrow { 0%{ height: 0; } 100%{ height: 100%; } }
        .rajdhani { font-family: 'Rajdhani', sans-serif; }
      `}</style>

      {/* ───── NAVBAR ───── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 clamp(16px, 4vw, 48px)',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,8,26,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="rajdhani" style={{ fontSize: 22, fontWeight: 700, color: '#f97316', letterSpacing: 2 }}>ATHLETE</span>
          <span className="rajdhani" style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>EDGE</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}>
            Sign In
          </Link>
          <Link href="/register" style={{
            background: 'linear-gradient(135deg, #e85d04, #f97316)',
            color: '#fff', padding: '8px 20px', borderRadius: 8, textDecoration: 'none',
            fontSize: 14, fontWeight: 600, border: 'none',
            boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════
         HERO SECTION
         ═══════════════════════════ */}
      <section
        ref={heroRef}
        onMouseMove={handleMouse}
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '120px clamp(16px, 5vw, 64px) 80px',
          overflow: 'hidden',
        }}
      >
        {/* Aurora bg */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'linear-gradient(135deg, #08081a 0%, #0c1a3a 25%, #1a0a2e 50%, #08081a 75%, #0a1628 100%)',
          backgroundSize: '400% 400%',
          animation: 'aurora 20s ease infinite',
        }} />
        {/* radial overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(249,115,22,0.08) 0%, transparent 60%)',
        }} />

        {/* Particles */}
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute', zIndex: 1,
            width: p.size, height: p.size, borderRadius: '50%',
            background: '#f97316',
            left: `${p.left}%`, top: `${p.top}%`,
            opacity: p.opacity,
            animation: `particleDrift ${p.dur}s ${p.delay}s ease-in-out infinite`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 900, width: '100%' }}>
          {/* Headline */}
          <h1 className="rajdhani" style={{
            fontSize: 'clamp(48px, 10vw, 112px)',
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            {['Train.', 'Film.', 'Get Noticed.'].map((word, i) => (
              <span key={i} style={{
                display: 'inline-block',
                marginRight: i < 2 ? 'clamp(10px, 2vw, 24px)' : 0,
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity 0.7s ${0.3 + i * 0.25}s ease-out, transform 0.7s ${0.3 + i * 0.25}s ease-out`,
                background: i === 2
                  ? 'linear-gradient(90deg, #f97316, #fb923c)'
                  : 'linear-gradient(90deg, #fff, #cbd5e1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {word}
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 22px)',
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 540, margin: '24px auto 0',
            lineHeight: 1.6,
            opacity: heroReady ? 1 : 0,
            transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s 1.1s ease-out, transform 0.7s 1.1s ease-out',
          }}>
            The basketball training platform that puts your game in front of the right coaches.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex', gap: 16, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap',
            opacity: heroReady ? 1 : 0,
            transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s 1.4s ease-out, transform 0.7s 1.4s ease-out',
          }}>
            <Link href="/register" style={{
              background: 'linear-gradient(135deg, #e85d04, #f97316)',
              color: '#fff', padding: '14px 36px', borderRadius: 12,
              textDecoration: 'none', fontSize: 16, fontWeight: 700,
              boxShadow: '0 4px 24px rgba(249,115,22,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'inline-block',
            }}>
              Start Free
            </Link>
            <Link href="/register?role=trainer" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', padding: '14px 36px', borderRadius: 12,
              textDecoration: 'none', fontSize: 16, fontWeight: 600,
              backdropFilter: 'blur(8px)',
              transition: 'background 0.2s, border-color 0.2s',
              display: 'inline-block',
            }}>
              I&apos;m a Coach
            </Link>
          </div>
        </div>

        {/* Floating Card Mockup */}
        <div style={{
          position: 'relative', zIndex: 2,
          marginTop: 60,
          opacity: heroReady ? 1 : 0,
          transform: heroReady
            ? `perspective(1000px) rotateY(${mouse.x * 8}deg) rotateX(${-mouse.y * 8}deg)`
            : 'perspective(1000px) translateY(40px)',
          transition: heroReady
            ? 'opacity 0.7s 1.6s ease-out'
            : 'opacity 0.7s 1.6s ease-out, transform 0.7s 1.6s ease-out',
        }}>
          <div style={{
            width: 'clamp(280px, 50vw, 400px)',
            background: 'linear-gradient(145deg, rgba(30,30,48,0.9), rgba(22,33,62,0.9))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: 'clamp(20px, 3vw, 32px)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(249,115,22,0.1)',
          }}>
            {/* card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>🏀</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Marcus Johnson</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>PG · Lincoln High · Class of 2026</div>
              </div>
            </div>
            {/* stat row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              {[{ label: 'Workouts', val: '147' }, { label: 'Film Clips', val: '23' }, { label: 'Coach Views', val: '12' }].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f97316' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* notification badge */}
            <div style={{
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Coach Williams viewed your profile 2m ago</span>
            </div>
          </div>
        </div>

        {/* Live ticker */}
        <div style={{
          position: 'relative', zIndex: 2,
          marginTop: 48,
          display: 'flex', alignItems: 'center', gap: 10,
          opacity: heroReady ? 1 : 0,
          transition: 'opacity 0.7s 2s ease-out',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            animation: 'glow 2s ease-in-out infinite',
            boxShadow: '0 0 8px #22c55e',
          }} />
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', height: 20, overflow: 'hidden' }}>
            <div key={tickerIdx} style={{ animation: 'tickerSlide 3s ease forwards' }}>
              {TICKER_ITEMS[tickerIdx]}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════
         FEATURES — HORIZONTAL SCROLL
         ═══════════════════════════ */}
      <section ref={featReveal.ref} style={{ padding: '100px 0 80px', position: 'relative' }}>
        <div style={{
          textAlign: 'center', marginBottom: 48,
          padding: '0 clamp(16px, 5vw, 64px)',
          opacity: featReveal.visible ? 1 : 0,
          transform: featReveal.visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.7s ease-out',
        }}>
          <h2 className="rajdhani" style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: 0,
            background: 'linear-gradient(90deg, #fff, #94a3b8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Everything You Need
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(14px, 1.8vw, 18px)', marginTop: 12 }}>
            Built for serious players and the coaches watching them.
          </p>
        </div>

        <div style={{
          display: 'flex', gap: 24,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          padding: '0 clamp(16px, 5vw, 64px) 24px',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              minWidth: 'clamp(260px, 70vw, 320px)',
              scrollSnapAlign: 'start',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              padding: 0,
              overflow: 'hidden',
              opacity: featReveal.visible ? 1 : 0,
              transform: featReveal.visible ? 'translateY(0)' : 'translateY(40px)',
              transition: `all 0.6s ${0.15 * i}s ease-out`,
              flexShrink: 0,
              cursor: 'default',
            }}>
              {/* Icon area */}
              <div style={{
                height: 160,
                background: f.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 56,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, transparent 60%, #08081a 100%)',
                }} />
                <span style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
                  {f.icon}
                </span>
              </div>
              {/* Text */}
              <div style={{ padding: '24px 24px 28px' }}>
                <h3 className="rajdhani" style={{
                  fontSize: 22, fontWeight: 700, margin: '0 0 10px',
                  color: f.accent,
                }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════
         STATS / SOCIAL PROOF
         ═══════════════════════════ */}
      <section ref={statsReveal.ref} style={{
        padding: '80px clamp(16px, 5vw, 64px)',
        opacity: statsReveal.visible ? 1 : 0,
        transform: statsReveal.visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.7s ease-out',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 'clamp(32px, 8vw, 100px)', flexWrap: 'wrap',
        }}>
          {[
            { hook: stat1, label: 'Workouts Logged', suffix: '+' },
            { hook: stat2, label: 'Active Coaches', suffix: '+' },
            { hook: stat3, label: 'Film Clips Analyzed', suffix: '+' },
          ].map((s, i) => (
            <div key={i} ref={s.hook.ref} style={{ textAlign: 'center', minWidth: 140 }}>
              <div className="rajdhani" style={{
                fontSize: 'clamp(40px, 7vw, 64px)', fontWeight: 800,
                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                lineHeight: 1,
              }}>
                {s.hook.count.toLocaleString()}{s.suffix}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════
         HOW IT WORKS — TIMELINE
         ═══════════════════════════ */}
      <section ref={stepsReveal.ref} style={{
        padding: '80px clamp(16px, 5vw, 64px) 100px',
        maxWidth: 680, margin: '0 auto',
      }}>
        <h2 className="rajdhani" style={{
          fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, textAlign: 'center', margin: '0 0 60px',
          opacity: stepsReveal.visible ? 1 : 0,
          transform: stepsReveal.visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease-out',
          background: 'linear-gradient(90deg, #fff, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          How It Works
        </h2>

        <div style={{ position: 'relative' }}>
          {/* Glowing timeline line */}
          <div style={{
            position: 'absolute', left: 24, top: 0, bottom: 0, width: 2,
            background: 'rgba(249,115,22,0.1)',
          }}>
            <div style={{
              width: '100%',
              background: 'linear-gradient(180deg, #f97316, #e85d04)',
              animation: stepsReveal.visible ? 'lineGrow 1.5s 0.3s ease-out forwards' : 'none',
              height: 0,
              borderRadius: 2,
              boxShadow: '0 0 12px rgba(249,115,22,0.4)',
            }} />
          </div>

          {STEPS.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 28, marginBottom: i < 2 ? 56 : 0,
              position: 'relative',
              opacity: stepsReveal.visible ? 1 : 0,
              transform: stepsReveal.visible ? 'translateX(0)' : 'translateX(-30px)',
              transition: `all 0.6s ${0.4 + i * 0.25}s ease-out`,
            }}>
              {/* Number badge */}
              <div style={{
                width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                background: 'linear-gradient(135deg, #f97316, #e85d04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 16,
                boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
                position: 'relative', zIndex: 1,
              }}>
                {step.num}
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 className="rajdhani" style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════
         FINAL CTA
         ═══════════════════════════ */}
      <section ref={ctaReveal.ref} style={{
        padding: '40px clamp(16px, 5vw, 64px) 120px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          position: 'relative',
          maxWidth: 640, width: '100%',
          opacity: ctaReveal.visible ? 1 : 0,
          transform: ctaReveal.visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'all 0.7s ease-out',
        }}>
          {/* Glow behind card */}
          <div style={{
            position: 'absolute', inset: -2,
            borderRadius: 26,
            background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(59,130,246,0.2))',
            filter: 'blur(40px)',
            zIndex: 0,
          }} />

          {/* Floating notification badges */}
          <div style={{
            position: 'absolute', top: -20, right: -10, zIndex: 2,
            background: 'rgba(30,30,48,0.9)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '8px 14px', fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            animation: 'notifFloat1 4s ease-in-out infinite',
            backdropFilter: 'blur(8px)',
          }}>
            🏀 New film uploaded
          </div>
          <div style={{
            position: 'absolute', bottom: 20, left: -16, zIndex: 2,
            background: 'rgba(30,30,48,0.9)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '8px 14px', fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            animation: 'notifFloat2 5s ease-in-out infinite',
            backdropFilter: 'blur(8px)',
          }}>
            👀 Coach Davis viewed your profile
          </div>
          <div style={{
            position: 'absolute', top: 30, left: -24, zIndex: 2,
            background: 'rgba(30,30,48,0.9)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '8px 14px', fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            animation: 'notifFloat3 4.5s ease-in-out infinite',
            backdropFilter: 'blur(8px)',
          }}>
            🔥 7-day workout streak
          </div>

          {/* Card */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'linear-gradient(145deg, rgba(30,30,48,0.95), rgba(22,33,62,0.95))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 'clamp(32px, 5vw, 56px)',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
          }}>
            <h2 className="rajdhani" style={{
              fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, margin: '0 0 16px',
              background: 'linear-gradient(90deg, #fff, #e2e8f0)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              lineHeight: 1.2,
            }}>
              Your future coach is already looking.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(14px, 1.8vw, 17px)', margin: '0 0 32px', lineHeight: 1.6 }}>
              Build your profile, upload your film, and let your work speak for itself.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={{
                background: 'linear-gradient(135deg, #e85d04, #f97316)',
                color: '#fff', padding: '14px 32px', borderRadius: 12,
                textDecoration: 'none', fontSize: 16, fontWeight: 700,
                boxShadow: '0 4px 24px rgba(249,115,22,0.4)',
              }}>
                Create Your Profile
              </Link>
              <Link href="/login" style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', padding: '14px 32px', borderRadius: 12,
                textDecoration: 'none', fontSize: 16, fontWeight: 600,
                backdropFilter: 'blur(8px)',
              }}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════
         FOOTER
         ═══════════════════════════ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '32px clamp(16px, 5vw, 64px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="rajdhani" style={{ fontSize: 16, fontWeight: 700, color: '#f97316' }}>ATHLETE</span>
          <span className="rajdhani" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>EDGE</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>&copy; {new Date().getFullYear()} Athlete Edge</span>
          <a href="mailto:ryan.dhalbisoi@gmail.com" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>ryan.dhalbisoi@gmail.com</a>
          <a href="mailto:shrey2425@gmail.com" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>shrey2425@gmail.com</a>
        </div>
      </footer>
    </div>
  );
}
