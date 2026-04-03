'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const TICKER_ITEMS = [
  'Jordan M. logged a 54-min workout',
  'Coach Williams viewed 3 profiles today',
  'Tyler K. just hit his vertical jump PR',
  'Alex R. uploaded new game film',
  'Marcus T. is on a 6-day workout streak',
  'Coach Davis viewed Jaylen\'s profile',
  'DeShawn B. crushed his sprint time goal',
  'Coach Torres left film feedback',
  'Isaiah W. logged his 20th workout this month',
  '2 coaches viewed profiles in the last hour',
];

const features = [
  {
    label: 'Train',
    title: 'Every rep.\nEvery session.\nAll tracked.',
    desc: 'Log workouts with sets, reps, weight, and RPE. Build a complete history coaches can actually see.',
    stat: '54 min avg session',
    color: '#3b82f6',
  },
  {
    label: 'Achieve',
    title: 'Set goals.\nBreak records.\nGet notified.',
    desc: 'Set vertical jump, bench, squat and sprint goals. The moment you crush a milestone, we let you know.',
    stat: '300+ PRs broken',
    color: '#3b82f6',
  },
  {
    label: 'Film',
    title: 'Your game.\nOn tape.\nAI analyzed.',
    desc: 'Upload game and practice film. Get AI-powered breakdowns of your form, footwork, and mechanics.',
    stat: 'AI-powered analysis',
    color: '#3b82f6',
  },
  {
    label: 'Recruit',
    title: 'Know who\'s\nwatching.\nIn real time.',
    desc: 'Get a notification the instant a coach views your profile. Know exactly who is recruiting you.',
    stat: 'Real-time alerts',
    color: '#3b82f6',
  },
];

function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function update() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrollable = ref.current.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      setProgress(Math.max(0, Math.min(1, scrolled / scrollable)));
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [ref]);
  return progress;
}

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCountUp(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

function HeroReveal({ children, delay = 0 }) {
  const [ref, visible] = useInView(0.1);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function PinnedFeatures() {
  const containerRef = useRef(null);
  const progress = useScrollProgress(containerRef);
  const totalFeatures = features.length;
  const rawIndex = progress * totalFeatures;
  const featureIndex = Math.min(totalFeatures - 1, Math.floor(rawIndex));
  const f = features[featureIndex];

  return (
    <div ref={containerRef} style={{ height: `${totalFeatures * 100}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: 'linear-gradient(180deg, #08081a 0%, #0a0a22 100%)' }}>
        {/* Ambient orbs */}
        <div style={{
          position: 'absolute', top: '30%', left: '20%', width: 500, height: 500, borderRadius: '50%',
          background: `radial-gradient(circle, ${f.color}10 0%, transparent 70%)`,
          transition: 'all 1s ease', pointerEvents: 'none',
          animation: 'orb-float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '15%', width: 400, height: 400, borderRadius: '50%',
          background: `radial-gradient(circle, ${f.color === '#3b82f6' ? '#e85d04' : '#3b82f6'}08 0%, transparent 70%)`,
          transition: 'all 1s ease', pointerEvents: 'none',
          animation: 'orb-float 10s ease-in-out infinite reverse',
        }} />

        {/* Progress dots */}
        <div style={{
          position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10,
        }}>
          {features.map((feat, i) => (
            <div key={i} style={{
              width: 6, height: i === featureIndex ? 28 : 6,
              borderRadius: 99, transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
              background: i === featureIndex
                ? `linear-gradient(180deg, ${feat.color}, ${feat.color}80)`
                : 'rgba(255,255,255,0.12)',
              boxShadow: i === featureIndex ? `0 0 12px ${feat.color}40` : 'none',
            }} />
          ))}
        </div>

        {features.map((feat, i) => {
          const isActive = i === featureIndex;
          const isPast = i < featureIndex;
          return (
            <div key={feat.label} style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', textAlign: 'center', padding: '0 24px',
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scale(1)' : isPast ? 'scale(0.95)' : 'scale(1.03)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
              pointerEvents: isActive ? 'auto' : 'none',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.22em',
                textTransform: 'uppercase', color: feat.color,
                marginBottom: 24,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 0.5s ease 0.1s',
              }}>
                {feat.label}
              </div>

              <h2 style={{
                fontSize: 'clamp(44px, 8vw, 88px)',
                fontWeight: 900, color: '#fff',
                lineHeight: 1.05, marginBottom: 32,
                whiteSpace: 'pre-line',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.5s ease 0.15s',
              }}>
                {feat.title}
              </h2>

              <p style={{
                fontSize: 'clamp(16px, 2vw, 20px)',
                color: 'rgba(255,255,255,0.45)', maxWidth: 520,
                lineHeight: 1.7, marginBottom: 20,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all 0.5s ease 0.2s',
              }}>
                {feat.desc}
              </p>

              <div style={{
                display: 'inline-block', fontSize: 13, fontWeight: 600,
                color: feat.color, padding: '10px 24px',
                borderRadius: 99,
                border: `1px solid ${feat.color}30`,
                backgroundColor: `${feat.color}0a`,
                backdropFilter: 'blur(8px)',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 0.5s ease 0.25s',
              }}>
                {feat.stat}
              </div>

              {i === 0 && (
                <div style={{
                  position: 'absolute', bottom: 40,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  opacity: progress < 0.05 ? 1 : 0, transition: 'opacity 0.4s ease',
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Scroll</span>
                  <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)' }} />
                </div>
              )}
            </div>
          );
        })}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <div style={{
            height: '100%', width: `${progress * 100}%`, transition: 'width 0.1s linear',
            background: `linear-gradient(90deg, #3b82f6, #60a5fa)`,
          }} />
        </div>
      </div>
    </div>
  );
}

function StatsSection() {
  const [ref, visible] = useInView(0.3);
  const workouts = useCountUp(5000, 1800, visible);
  const prs = useCountUp(300, 1400, visible);
  const coaches = useCountUp(100, 1200, visible);

  return (
    <section ref={ref} style={{
      background: 'linear-gradient(180deg, #08081a 0%, #0c0c24 50%, #08081a 100%)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      padding: '120px 24px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, textAlign: 'center' }}>
        {[
          { val: workouts, suffix: '+', label: 'Workouts Logged', color: '#3b82f6' },
          { val: prs, suffix: '+', label: 'PRs Broken', color: '#3b82f6' },
          { val: coaches, suffix: '+', label: 'Active Coaches', color: '#22c55e' },
        ].map((s, i) => (
          <div key={s.label} style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: `all 0.7s ease ${i * 120}ms`,
          }}>
            <div style={{
              fontSize: 'clamp(44px, 7vw, 76px)', fontWeight: 900, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              background: `linear-gradient(135deg, ${s.color}, ${s.color}aa)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {s.val.toLocaleString()}{s.suffix}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Build Your Profile', desc: 'Add your stats, GPA, school, and goals. Your public recruiting profile is live in minutes.' },
    { num: '02', title: 'Upload Film & Log Workouts', desc: 'Post game film, practice clips, and training sessions. Show coaches your work ethic and your game.' },
    { num: '03', title: 'Get Discovered', desc: 'When a coach views your profile, you get a real-time notification. Know exactly who\'s recruiting you.' },
  ];

  return (
    <section style={{ background: 'linear-gradient(180deg, #08081a 0%, #0a0a22 100%)', padding: '140px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <HeroReveal delay={0}>
          <div style={{ textAlign: 'center', marginBottom: 100 }}>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 20 }}>How It Works</p>
            <h2 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
              From first login<br />to first offer.
            </h2>
          </div>
        </HeroReveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {steps.map((s, i) => (
            <HeroReveal key={s.num} delay={i * 100}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 40,
                padding: '48px 32px',
                borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.02)',
                marginBottom: i < steps.length - 1 ? 8 : 0,
                border: '1px solid rgba(255,255,255,0.04)',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, flexShrink: 0, lineHeight: 1, minWidth: 70,
                  background: 'linear-gradient(135deg, #3b82f6, #3b82f630)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {s.num}
                </div>
                <div>
                  <h3 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{s.title}</h3>
                  <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            </HeroReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlayerCard() {
  const [ref, visible] = useInView(0.2);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
      transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
      position: 'relative', width: 320, flexShrink: 0,
    }}>
      <div style={{
        borderRadius: 24, padding: 28,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#fff', flexShrink: 0,
          }}>M</div>
          <div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>Marcus Thompson</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Point Guard · LA, CA</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Jefferson High · Class of 2026</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[{ v: '6\'2"', l: 'Height' }, { v: '175', l: 'lbs' }, { v: '3.8', l: 'GPA' }].map(s => (
            <div key={s.l} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: '10px 6px', textAlign: 'center',
            }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{s.v}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 99, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontWeight: 600 }}>Scholarship</span>
          <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 99, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 600 }}>Class of 2026</span>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Film clips', val: '12 uploaded', color: '#fff' },
            { label: 'Workouts', val: '34 logged', color: '#fff' },
            { label: 'Coach views', val: '8 this week', color: '#22c55e' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification */}
      <div style={{
        position: 'absolute', top: -14, right: -14,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 99,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        fontSize: 12, fontWeight: 600, color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', boxShadow: '0 0 10px #22c55e' }} />
        Coach Davis just viewed
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
      window.location.replace(role === 'trainer' ? '/trainer' : '/dashboard');
      return;
    }
    setHeroVisible(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ backgroundColor: '#08081a', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track { display: flex; width: max-content; animation: ticker 36s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        .cta-btn { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.3); }
        .ghost-btn { transition: all 0.25s ease; }
        .ghost-btn:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.15) !important; }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: scrolled ? 'rgba(8,8,26,0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: '#fff' }}>
          ATHLETE<span style={{ color: '#3b82f6' }}>EDGE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>
            Sign In
          </Link>
          <Link href="/register" className="cta-btn" style={{
            fontSize: 13, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            padding: '8px 20px', borderRadius: 12, textDecoration: 'none',
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Mesh gradient background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 30% 60%, rgba(232,93,4,0.06) 0%, transparent 70%)',
        }} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.22em',
          textTransform: 'uppercase',
          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 28,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.8s ease 0.1s',
          position: 'relative',
        }}>
          Built for High School Basketball
        </div>

        <h1 style={{
          fontSize: 'clamp(48px, 10vw, 110px)',
          fontWeight: 900, color: '#fff',
          lineHeight: 1.0, letterSpacing: '-0.03em',
          marginBottom: 28, maxWidth: 900,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s',
          position: 'relative',
        }}>
          Your season.<br />
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 40%, #93c5fd 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Activated.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2.2vw, 20px)',
          color: 'rgba(255,255,255,0.45)',
          maxWidth: 560, lineHeight: 1.7, marginBottom: 48,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.9s ease 0.35s',
          position: 'relative',
        }}>
          Track every workout. Upload your film. Know the moment a coach views your profile.
        </p>

        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.9s ease 0.5s',
          position: 'relative',
        }}>
          <Link href="/register" className="cta-btn" style={{
            padding: '16px 36px', borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none',
            display: 'inline-block',
          }}>
            I&apos;m a Player
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginLeft: 8, verticalAlign: 'middle' }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
          <Link href="/register" className="ghost-btn" style={{
            padding: '16px 36px', borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 700, fontSize: 16, textDecoration: 'none',
            display: 'inline-block',
          }}>
            I&apos;m a Coach
          </Link>
        </div>

        <p style={{
          marginTop: 20, fontSize: 12,
          color: 'rgba(255,255,255,0.18)',
          opacity: heroVisible ? 1 : 0,
          transition: 'all 0.9s ease 0.65s',
          position: 'relative',
        }}>
          Free to start · No credit card required
        </p>

        <div style={{ marginTop: 80, width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <PlayerCard />
        </div>
      </section>

      {/* Ticker */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '14px 0', overflow: 'hidden',
        background: 'rgba(255,255,255,0.01)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            flexShrink: 0, paddingLeft: 24, paddingRight: 16,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#3b82f6',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            Live
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="ticker-track">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', marginRight: 64 }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PinnedFeatures />
      <StatsSection />
      <HowItWorks />

      {/* CTA */}
      <section style={{ background: 'linear-gradient(180deg, #0a0a22 0%, #08081a 100%)', padding: '140px 24px' }}>
        <HeroReveal>
          <div style={{
            maxWidth: 700, margin: '0 auto', textAlign: 'center',
            padding: '80px 48px',
            borderRadius: 28,
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.06)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Glow orb */}
            <div style={{
              position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
              width: 300, height: 300, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 20, position: 'relative' }}>
              Ready to be seen?
            </p>
            <h2 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20, position: 'relative' }}>
              Your future coach<br />is already looking.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 44, maxWidth: 440, margin: '0 auto 44px', position: 'relative' }}>
              Join players who are getting noticed. Build your profile today — it&apos;s free.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <Link href="/register" className="cta-btn" style={{
                padding: '16px 40px', borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none',
                display: 'inline-block',
              }}>
                Create My Profile Free
              </Link>
              <Link href="/login" className="ghost-btn" style={{
                padding: '16px 40px', borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 700, fontSize: 16, textDecoration: 'none',
                display: 'inline-block',
              }}>
                Sign In
              </Link>
            </div>
          </div>
        </HeroReveal>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: '#08081a', padding: '60px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', color: '#fff', marginBottom: 12 }}>
          ATHLETE<span style={{ color: '#3b82f6' }}>EDGE</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)', marginBottom: 10 }}>
          &copy; 2026 Athlete Edge. Built for ballers, by ballers.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a href="mailto:ryan.dhalbisoi@gmail.com" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none' }}>
            ryan.dhalbisoi@gmail.com
          </a>
          <a href="mailto:shrey2425@gmail.com" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none' }}>
            shrey2425@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
