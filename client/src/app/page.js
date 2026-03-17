'use client';
import Link from 'next/link';

const features = [
  {
    icon: '🏀',
    title: 'Workout Tracking',
    desc: 'Log every drill, lift, and sprint. Build a complete history of your training with session notes and performance tracking.',
  },
  {
    icon: '🎯',
    title: 'Goal Setting & PRs',
    desc: 'Set vertical jump, sprint, and strength goals. Get notified the moment you crush a milestone.',
  },
  {
    icon: '🎬',
    title: 'Film Room',
    desc: 'Upload and organize game and practice film. Share your tape with your coach and get feedback that counts.',
  },
  {
    icon: '💬',
    title: 'Team Chat',
    desc: 'Real-time messaging with your squad. Coaches can broadcast updates and keep players locked in.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black" style={{ color: '#2563eb' }}>ATHLETE</span>
          <span className="text-2xl font-black text-white">EDGE</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-gray-300 hover:text-white transition-colors font-medium"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 rounded-lg font-semibold text-white transition-colors"
            style={{ backgroundColor: '#2563eb' }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundColor: '#2563eb' }}
        />
        <div
          className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-6 border"
          style={{ color: '#2563eb', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)' }}
        >
          Built for High School Basketball
        </div>
        <h1 className="text-6xl font-black text-white mb-6 leading-tight">
          Train Smarter.<br />
          <span style={{ color: '#2563eb' }}>Gain the Edge.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
          Athlete Edge is the all-in-one platform for high school basketball players and coaches.
          Track workouts, hit PRs, upload film, and stay connected with your team — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-105 shadow-lg"
            style={{ backgroundColor: '#2563eb' }}
          >
            I&apos;m a Player
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 border"
            style={{ backgroundColor: '#1e1e30', borderColor: '#2563eb', color: '#2563eb' }}
          >
            I&apos;m a Coach
          </Link>
        </div>
        <p className="text-gray-600 mt-6 text-sm">No credit card required. Free to start.</p>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black text-white mb-4">Everything You Need to <span style={{ color: '#2563eb' }}>Level Up</span></h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Tools built for the court and the weight room.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-6 border border-gray-800 hover:border-blue-600 transition-colors group"
              style={{ backgroundColor: '#1e1e30' }}
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats banner */}
      <section className="py-16 border-t border-b border-gray-800" style={{ backgroundColor: '#16213e' }}>
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { val: '5,000+', label: 'Workouts Logged' },
            { val: '300+', label: 'PRs Broken' },
            { val: '100+', label: 'Coach Teams' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-black" style={{ color: '#2563eb' }}>{s.val}</div>
              <div className="text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-24 px-6">
        <h2 className="text-4xl font-black text-white mb-4">Ready to Gain Your <span style={{ color: '#2563eb' }}>Edge?</span></h2>
        <p className="text-gray-400 mb-8 text-lg">Join players and coaches already training smarter.</p>
        <Link
          href="/register"
          className="inline-block px-10 py-4 rounded-xl font-bold text-lg text-white hover:scale-105 transition-transform shadow-xl"
          style={{ backgroundColor: '#2563eb' }}
        >
          Start Training Free
        </Link>
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
