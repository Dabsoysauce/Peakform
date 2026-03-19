'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const TICKER_ITEMS = [
  '🏀 Jordan M. logged a 54-min workout',
  '👀 Coach Williams viewed 3 profiles today',
  '🎯 Tyler K. just hit his vertical jump PR',
  '🎬 Alex R. uploaded new game film',
  '📊 Marcus T. is on a 6-day workout streak',
  '👀 Coach Davis viewed Jaylen\'s profile',
  '🏆 DeShawn B. crushed his sprint time goal',
  '🎬 Coach Torres left film feedback',
  '🏀 Isaiah W. logged his 20th workout this month',
  '👀 2 coaches viewed profiles in the last hour',
];

const features = [
  {
    icon: '🏀',
    title: 'Workout Tracking',
    desc: 'Log every drill, lift, and sprint. Build a complete history of your training with session notes and performance tracking.',
    stat: '54 min avg session',
  },
  {
    icon: '🎯',
    title: 'Goal Setting & PRs',
    desc: 'Set vertical jump, sprint, and strength goals. Get notified the moment you crush a milestone.',
    stat: '300+ PRs broken',
  },
  {
    icon: '🎬',
    title: 'Film Room',
    desc: 'Upload game and practice film. Share your tape with coaches and get feedback that counts.',
    stat: 'AI-powered analysis',
  },
  {
    icon: '👀',
    title: 'Coach Interest Signals',
    desc: 'Know exactly when a coach views your profile. Get notified in real time and see who\'s recruiting you.',
    stat: 'New: real-time alerts',
  },
];

function useCountUp(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

function AnimatedStats() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const workouts = useCountUp(5000, 1800, visible);
  const prs = useCountUp(300, 1400, visible);
  const coaches = useCountUp(100, 1200, visible);

  return (
    <section ref={ref} className="py-20 border-t border-b border-gray-800" style={{ backgroundColor: '#16213e' }}>
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
        {[
          { val: workouts, suffix: '+', label: 'Workouts Logged' },
          { val: prs, suffix: '+', label: 'PRs Broken' },
          { val: coaches, suffix: '+', label: 'Active Coaches' },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-5xl font-black tabular-nums" style={{ color: '#2563eb' }}>
              {s.val.toLocaleString()}{s.suffix}
            </div>
            <div className="text-gray-400 mt-2 text-sm uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const tickerRef = useRef(null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f1a' }}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker 32s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 z-50" style={{ backgroundColor: 'rgba(15,15,26,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black" style={{ color: '#2563eb' }}>ATHLETE</span>
          <span className="text-2xl font-black text-white">EDGE</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-300 hover:text-white transition-colors font-medium text-sm">Login</Link>
          <Link href="/register" className="px-5 py-2 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90" style={{ backgroundColor: '#2563eb' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col lg:flex-row items-center justify-center gap-12 px-6 pt-20 pb-16 max-w-6xl mx-auto overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ backgroundColor: '#2563eb' }} />

        {/* Left: copy */}
        <div className="flex-1 text-center lg:text-left z-10">
          <div
            className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-6 border"
            style={{ color: '#2563eb', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)' }}
          >
            Built for High School Basketball
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Your High School<br />Season.{' '}
            <span style={{ color: '#2563eb' }}>Activated.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-lg mb-8 leading-relaxed">
            Track every workout. Upload your film. Know the moment a coach views your profile.
            The platform serious teams use to bring home championships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link href="/register" className="px-8 py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-105 shadow-lg" style={{ backgroundColor: '#2563eb' }}>
              I&apos;m a Player →
            </Link>
            <Link href="/register" className="px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 border" style={{ backgroundColor: 'transparent', borderColor: '#374151', color: '#9ca3af' }}>
              I&apos;m a Coach
            </Link>
          </div>
          <p className="text-gray-600 mt-5 text-sm">Free to start. No credit card required.</p>
        </div>

        {/* Right: mock player card */}
        <div className="flex-shrink-0 z-10">
          <div
            className="relative w-72 rounded-2xl border border-gray-700 p-5 shadow-2xl"
            style={{ backgroundColor: '#1e1e30' }}
          >
            {/* Card header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
                M
              </div>
              <div>
                <div className="font-black text-white text-base">Marcus Thompson</div>
                <div className="text-xs text-gray-400">Point Guard · Los Angeles, CA</div>
                <div className="text-xs text-gray-500">Jefferson High School</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[{ v: '6\'2"', l: 'Height' }, { v: '175', l: 'lbs' }, { v: '3.8', l: 'GPA' }].map((s) => (
                <div key={s.l} className="rounded-lg px-2 py-2 text-center" style={{ backgroundColor: '#16213e' }}>
                  <div className="text-white font-black text-sm">{s.v}</div>
                  <div className="text-gray-500 text-xs">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Goal badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563eb' }}>
                🎯 Get a Scholarship
              </span>
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                Class of 2026
              </span>
            </div>

            {/* Activity */}
            <div className="space-y-2 border-t border-gray-800 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">🎬 Film clips</span>
                <span className="text-white font-bold">12 uploaded</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">🏋️ Workouts</span>
                <span className="text-white font-bold">34 logged</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">👀 Coach views</span>
                <span className="font-bold" style={{ color: '#22c55e' }}>8 this week ↑</span>
              </div>
            </div>

            {/* Floating notification badge */}
            <div
              className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg border border-gray-700"
              style={{ backgroundColor: '#1a1a2e' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e' }} />
              Coach Davis just viewed
            </div>
          </div>
        </div>
      </section>

      {/* Live ticker */}
      <div className="border-t border-b border-gray-800 py-3 overflow-hidden" style={{ backgroundColor: '#16213e' }}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 px-4 text-xs font-bold uppercase tracking-widest border-r border-gray-700 pr-4 mr-2" style={{ color: '#2563eb' }}>
            Live
          </div>
          <div className="overflow-hidden flex-1" ref={tickerRef}>
            <div className="ticker-track">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="text-sm text-gray-400 whitespace-nowrap mx-8">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Everything You Need to{' '}
              <span style={{ color: '#2563eb' }}>Get Recruited</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Built specifically for high school ballers who want to be seen.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 100}>
              <div
                className="rounded-2xl p-6 border border-gray-800 hover:border-blue-600 transition-all group h-full cursor-default hover:-translate-y-1"
                style={{ backgroundColor: '#1e1e30' }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#2563eb' }}>{f.stat}</div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Animated stats */}
      <AnimatedStats />

      {/* How it works */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">From First Login to <span style={{ color: '#2563eb' }}>First Offer</span></h2>
            <p className="text-gray-400 text-lg">Three steps to building a profile coaches actually look at.</p>
          </div>
        </ScrollReveal>

        <div className="space-y-6">
          {[
            { step: '01', title: 'Build Your Profile', desc: 'Add your stats, GPA, school, and goals. Your public recruiting profile is live in minutes.' },
            { step: '02', title: 'Upload Film & Log Workouts', desc: 'Post game film, practice clips, and training sessions. Show coaches your work ethic and your game.' },
            { step: '03', title: 'Get Discovered', desc: 'When a coach views your profile, you get a real-time notification. Know exactly who\'s recruiting you.' },
          ].map((item, i) => (
            <ScrollReveal key={item.step} delay={i * 120}>
              <div className="flex items-start gap-6 rounded-2xl p-6 border border-gray-800" style={{ backgroundColor: '#1e1e30' }}>
                <div className="text-4xl font-black flex-shrink-0" style={{ color: 'rgba(37,99,235,0.3)' }}>{item.step}</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <ScrollReveal>
        <section className="text-center py-24 px-6 mx-4 lg:mx-auto max-w-4xl rounded-3xl mb-16 border border-gray-800" style={{ backgroundColor: '#1e1e30' }}>
          <div className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#2563eb' }}>Ready to be seen?</div>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Your Future Coach Is <br />Already Looking</h2>
          <p className="text-gray-400 mb-8 text-lg max-w-lg mx-auto">Join players who are getting noticed. Build your profile today — it's free.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-block px-10 py-4 rounded-xl font-bold text-lg text-white hover:scale-105 transition-transform shadow-xl"
              style={{ backgroundColor: '#2563eb' }}
            >
              Create My Profile Free
            </Link>
            <Link
              href="/login"
              className="inline-block px-10 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105 border border-gray-700 text-gray-300"
            >
              Sign In
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* Contact */}
      <section className="border-t border-gray-800 px-6 py-16 text-center" style={{ backgroundColor: '#16213e' }}>
        <h2 className="text-2xl font-black text-white mb-2">Contact Us</h2>
        <p className="text-gray-400 text-sm mb-4">Questions? Feedback? Reach out anytime.</p>
        <a
          href="mailto:ryan.dhalbisoi@gmail.com"
          className="inline-block text-base font-bold hover:underline"
          style={{ color: '#2563eb' }}
        >
          ryan.dhalbisoi@gmail.com
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-600 text-sm">
        <div className="flex justify-center items-center gap-2 mb-2">
          <span className="font-black" style={{ color: '#2563eb' }}>ATHLETE</span>
          <span className="font-black text-white">EDGE</span>
        </div>
        <p>© 2026 Athlete Edge. Built for ballers, by ballers.</p>
      </footer>
    </div>
  );
}
