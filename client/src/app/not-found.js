'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const PUNS = [
  { heading: 'Out of bounds.',          sub: "Looks like this page took a bad pass. It doesn't exist or was moved." },
  { heading: 'Nothing but net... work error.', sub: "The URL swished right through — no page on the other side." },
  { heading: 'Traveling.',              sub: "This page moved too many steps without a dribble. We lost track of it." },
  { heading: 'Player not found.',       sub: "We checked the whole roster and this page isn't on it." },
  { heading: 'Ball don\'t lie.',        sub: "And neither do we — this page doesn't exist." },
  { heading: 'Bench warmer.',           sub: "This page never made it off the bench. Head back and try another route." },
  { heading: 'No look pass. Wrong way.', sub: "Somebody threw it behind their back and missed. This page is nowhere to be found." },
  { heading: 'Rejected.',              sub: "Swatted into the stands. This page got blocked at the rim." },
];

export default function NotFound() {
  const [visible, setVisible] = useState(false);
  const [pun, setPun] = useState(PUNS[0]);
  useEffect(() => {
    setPun(PUNS[Math.floor(Math.random() * PUNS.length)]);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#0f0f1a' }}>
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.6s ease',
      }}>
        {/* Big 404 */}
        <div style={{
          fontSize: 'clamp(80px, 20vw, 160px)',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, rgba(37,99,235,0.2) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8,
          fontFamily: 'var(--font-rajdhani), sans-serif',
        }}>
          404
        </div>

        {/* Court line decoration */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ height: 1, width: 60, backgroundColor: 'rgba(37,99,235,0.3)' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #2563eb', backgroundColor: 'transparent' }} />
          <div style={{ height: 1, width: 60, backgroundColor: 'rgba(37,99,235,0.3)' }} />
        </div>

        <h1 style={{
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 800,
          color: '#fff',
          marginBottom: 12,
          fontFamily: 'var(--font-rajdhani), sans-serif',
          letterSpacing: '0.02em',
        }}>
          {pun.heading}
        </h1>

        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 380, lineHeight: 1.7, margin: '0 auto 40px' }}>
          {pun.sub}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            padding: '12px 28px', borderRadius: 99,
            backgroundColor: '#2563eb', color: '#fff',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 28px', borderRadius: 99,
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
