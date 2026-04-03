'use client';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function ProgressPage() {
  const [scoutingReport, setScoutingReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateReport() {
    setLoading(true);
    setError('');
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const res = await apiFetch('/ai/scouting-report', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate report'); return; }
      setScoutingReport(data.analysis);
      setExpanded(true);
    } catch { setError('Failed to generate report. Try again.'); }
    setLoading(false);
  }

  function inlineBold(str) {
    const parts = str.split(/\*\*(.+?)\*\*/g);
    if (parts.length === 1) return str;
    return parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} className="font-bold text-white">{part}</strong> : part
    );
  }

  function renderReport(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4)
        return <h3 key={i} className="text-sm font-black text-white uppercase tracking-wide mt-4 mb-1">{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('• '))
        return <li key={i} className="text-sm text-white/50 ml-4 leading-relaxed">{inlineBold(line.slice(2))}</li>;
      if (line.trim() === '') return null;
      return <p key={i} className="text-sm text-white/50 leading-relaxed">{inlineBold(line)}</p>;
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">Progress</h1>

      <div className="rounded-2xl border border-white/[0.06] p-6 max-w-2xl" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
        <h2 className="text-lg font-black text-white mb-2">AI Scouting Report</h2>
        <p className="text-white/40 text-sm mb-5">
          Generate a professional ~200-word basketball scouting report based on your profile, training data, and goals. Copy it directly into recruiting emails.
        </p>
        <button
          onClick={generateReport}
          disabled={loading}
          className="px-5 py-2.5 rounded-2xl font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}
        >
          {loading ? 'Generating...' : <><svg className="inline-block w-4 h-4 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor"/></svg> Generate Scouting Report</>}
        </button>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}

        {scoutingReport && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setExpanded(!expanded)} className="text-sm font-bold text-white hover:text-white/50">
                {expanded ? '▼ Hide Report' : '▶ Show Report'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(scoutingReport); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-xs px-3 py-1 rounded-2xl border font-medium hover:opacity-80"
                  style={{ borderColor: '#e85d04', color: '#f97316' }}
                >
                  {copied ? '✓ Copied!' : <><svg className="inline-block w-3 h-3 mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/></svg> Copy</>}
                </button>
                <button onClick={generateReport} disabled={loading} className="text-xs hover:underline disabled:opacity-50" style={{ color: '#e85d04' }}>
                  Regenerate ↺
                </button>
              </div>
            </div>
            {expanded && (
              <div className="rounded-2xl p-4 space-y-1" style={{ backgroundColor: 'rgba(232,93,4,0.06)', border: '1px solid rgba(232,93,4,0.2)' }}>
                {renderReport(scoutingReport)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
