'use client';
import { useEffect, useState } from 'react';

const PUNS = [
  { heading: 'We bricked it.',         sub: "That shot hit nothing but the back of the backboard. Try again and we'll drain it next time." },
  { heading: 'Turnover.',              sub: "We coughed it up. Give us a chance to get back on defense and try again." },
  { heading: 'Shot clock violation.',  sub: "We ran out of time on this one. Reset and run the play again." },
  { heading: 'Flagrant foul.',         sub: "That was ugly — no two ways about it. Hit Try Again and we'll clean it up." },
  { heading: 'Air ball.',              sub: "Didn't even graze the rim. We'll put up a better shot on the next possession." },
  { heading: 'Double dribble.',        sub: "We got called for a violation. Ref is resetting the play — try again." },
  { heading: 'Technical foul.',        sub: "The bench got a little too rowdy. Calm down, reset, and let's run it back." },
  { heading: 'We got posterized.',     sub: "Absolutely stuffed at the rim. Dust yourself off and try again." },
  { heading: 'Five-second violation.', sub: "Took too long to inbound the page. Step back and run it again." },
  { heading: 'Goaltending.',           sub: "We interfered at the wrong moment. The play is dead — try again." },
];

export default function Error({ error, reset }) {
  const [visible, setVisible] = useState(false);
  const [pun] = useState(() => PUNS[Math.floor(Math.random() * PUNS.length)]);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#0f0f1a' }}>
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.6s ease',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 900,
          color: '#fff',
          marginBottom: 12,
          fontFamily: 'var(--font-rajdhani), sans-serif',
          letterSpacing: '0.02em',
        }}>
          {pun.heading}
        </h1>

        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 380, lineHeight: 1.7, margin: '0 auto 12px' }}>
          {pun.sub}
        </p>

        {error?.message && (
          <p style={{
            fontSize: 12, color: 'rgba(239,68,68,0.6)',
            fontFamily: 'monospace',
            marginBottom: 32,
            maxWidth: 400,
            margin: '0 auto 32px',
            wordBreak: 'break-word',
          }}>
            {error.message}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
          <button
            onClick={reset}
            style={{
              padding: '12px 28px', borderRadius: 99,
              backgroundColor: '#2563eb', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            Try Again
          </button>
          <a href="/" style={{
            padding: '12px 28px', borderRadius: 99,
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
            transition: 'background 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
