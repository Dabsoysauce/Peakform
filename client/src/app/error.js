'use client';
import { useEffect, useState } from 'react';

export default function Error({ error, reset }) {
  const [visible, setVisible] = useState(false);
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
          Something went wrong.
        </h1>

        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 380, lineHeight: 1.7, margin: '0 auto 12px' }}>
          An unexpected error occurred. It's not you — try again and it should be fine.
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
