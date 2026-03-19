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
        return <li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{inlineBold(line.slice(2))}</li>;
      if (line.trim() === '') return null;
      return <p key={i} className="text-sm text-gray-300 leading-relaxed">{inlineBold(line)}</p>;
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">Progress</h1>

      <div className="rounded-xl border border-gray-800 p-6 max-w-2xl" style={{ backgroundColor: '#1e1e30' }}>
        <h2 className="text-lg font-black text-white mb-2">AI Scouting Report</h2>
        <p className="text-gray-400 text-sm mb-5">
          Generate a professional ~200-word basketball scouting report based on your profile, training data, and goals. Copy it directly into recruiting emails.
        </p>
        <button
          onClick={generateReport}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#7c3aed' }}
        >
          {loading ? 'Generating...' : '🤖 Generate Scouting Report'}
        </button>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}

        {scoutingReport && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setExpanded(!expanded)} className="text-sm font-bold text-white hover:text-gray-300">
                {expanded ? '▼ Hide Report' : '▶ Show Report'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(scoutingReport); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-xs px-3 py-1 rounded border font-medium hover:opacity-80"
                  style={{ borderColor: '#7c3aed', color: '#a78bfa' }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button onClick={generateReport} disabled={loading} className="text-xs text-purple-400 hover:underline disabled:opacity-50">
                  Regenerate ↺
                </button>
              </div>
            </div>
            {expanded && (
              <div className="rounded-xl border border-purple-800 p-4 space-y-1" style={{ backgroundColor: 'rgba(124,58,237,0.06)' }}>
                {renderReport(scoutingReport)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
