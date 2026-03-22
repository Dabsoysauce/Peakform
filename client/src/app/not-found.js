'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

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
          Out of bounds.
        </h1>

        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 380, lineHeight: 1.7, margin: '0 auto 40px' }}>
          Looks like this page took a bad pass. It doesn't exist or was moved.
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
