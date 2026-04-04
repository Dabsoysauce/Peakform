'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadMediaFile, deleteMediaFile } from '../../lib/supabase';

// ── Offscreen play rendering (mirrors playbook canvas geometry) ──────────────
const PCW = 560, PCH = 440, PCX = PCW / 2;
const PM = 15;
const PCOURT_B = PCH - PM;
const PBASKET_Y = PCOURT_B - 46;
const PKEY_W = 144, PKEY_H = 172;
const PFT_Y = PCOURT_B - PKEY_H;
const PFT_R = PKEY_W / 2;
const PTHREE_R = 210;
const PCORNER_X = 190;
const PCORNER_TOP_Y = PBASKET_Y - Math.sqrt(PTHREE_R ** 2 - PCORNER_X ** 2);
const PTHREE_START = Math.atan2(PCORNER_TOP_Y - PBASKET_Y, -PCORNER_X);
const PTHREE_END = Math.atan2(PCORNER_TOP_Y - PBASKET_Y, PCORNER_X);
const PPLAYER_R = 17;

function _drawCourt(ctx) {
  ctx.fillStyle = '#1a5c2a';
  ctx.fillRect(0, 0, PCW, PCH);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeRect(PM, PM, PCW - PM * 2, PCH - PM * 2);
  ctx.strokeRect(PCX - PKEY_W / 2, PFT_Y, PKEY_W, PKEY_H);
  ctx.beginPath(); ctx.arc(PCX, PFT_Y, PFT_R, 0, Math.PI, true); ctx.stroke();
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.arc(PCX, PFT_Y, PFT_R, 0, Math.PI, false); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(PCX, PBASKET_Y, 38, Math.PI, 0); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(PCX - 26, PCOURT_B - 12); ctx.lineTo(PCX + 26, PCOURT_B - 12); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(PCX, PBASKET_Y, 11, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PCX - PCORNER_X, PCOURT_B); ctx.lineTo(PCX - PCORNER_X, PCORNER_TOP_Y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PCX + PCORNER_X, PCOURT_B); ctx.lineTo(PCX + PCORNER_X, PCORNER_TOP_Y); ctx.stroke();
  ctx.beginPath(); ctx.arc(PCX, PBASKET_Y, PTHREE_R, PTHREE_START, PTHREE_END, false); ctx.stroke();
}

function _drawArrowhead(ctx, x1, y1, x2, y2, size = 11) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(a - 0.45), y2 - size * Math.sin(a - 0.45));
  ctx.lineTo(x2 - size * Math.cos(a + 0.45), y2 - size * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill();
}

function _drawLine(ctx, line) {
  const { type, x1, y1, x2, y2 } = line;
  ctx.save();
  ctx.lineWidth = type === 'drive' ? 2.5 : 2;
  ctx.strokeStyle = 'white'; ctx.fillStyle = 'white';
  if (type === 'pass') {
    ctx.setLineDash([8, 5]);
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const ratio = dist > PPLAYER_R ? (dist - PPLAYER_R + 2) / dist : 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio); ctx.stroke();
    ctx.setLineDash([]);
    _drawArrowhead(ctx, x1, y1, x2, y2);
  } else if (type === 'drive') {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perp = angle + Math.PI / 2;
    const waves = Math.max(3, Math.floor(dist / 18));
    ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let i = 1; i <= waves * 2; i++) {
      const t = i / (waves * 2);
      const mx = x1 + (x2 - x1) * t, my = y1 + (y2 - y1) * t;
      const amp = (i % 2 === 0 ? 1 : -1) * 5;
      ctx.lineTo(mx + Math.cos(perp) * amp, my + Math.sin(perp) * amp);
    }
    ctx.stroke();
    _drawArrowhead(ctx, x1, y1, x2, y2);
  } else {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const ratio = dist > PPLAYER_R ? (dist - PPLAYER_R + 2) / dist : 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio); ctx.stroke();
    _drawArrowhead(ctx, x1, y1, x2, y2);
  }
  ctx.restore();
}

function _drawScreen(ctx, scr) {
  const { x1, y1, x2, y2 } = scr;
  const angle = Math.atan2(y2 - y1, x2 - x1), perp = angle + Math.PI / 2, len = 18;
  ctx.save(); ctx.strokeStyle = 'white'; ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x2 + Math.cos(perp) * len, y2 + Math.sin(perp) * len);
  ctx.lineTo(x2 - Math.cos(perp) * len, y2 - Math.sin(perp) * len);
  ctx.stroke(); ctx.restore();
}

function _drawPlayer(ctx, p) {
  const { type, x, y, label } = p;
  ctx.save();
  if (type === 'offense') {
    ctx.fillStyle = 'white'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, PPLAYER_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  } else {
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const s = PPLAYER_R - 4;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
    ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + PPLAYER_R + 10);
  }
  ctx.restore();
}

function _extractV1Objects(data) {
  if (data.v === 2 && data.phases && data.phases.length > 0) {
    const objs = data.phases[0].objects || [];
    const sx = PCW / 500, sy = PCH / 470;
    const players = objs.filter(o => o.type === 'player').map(o => ({
      type: o.team === 'defense' ? 'defense' : 'offense',
      x: o.x * sx, y: o.y * sy, label: o.number || '1',
    }));
    const lines = objs.filter(o => ['cut', 'pass', 'dribble', 'drive'].includes(o.type)).map(o => ({
      type: o.type === 'dribble' ? 'drive' : o.type,
      x1: o.x1 * sx, y1: o.y1 * sy, x2: o.x2 * sx, y2: o.y2 * sy,
    }));
    const screens = objs.filter(o => o.type === 'screen').map(o => ({
      x1: o.x1 * sx, y1: o.y1 * sy, x2: o.x2 * sx, y2: o.y2 * sy,
    }));
    return { players, lines, screens };
  }
  return { players: data.players || [], lines: data.lines || [], screens: data.screens || [] };
}

function renderPlayToBase64(canvasJson) {
  try {
    const data = JSON.parse(canvasJson);
    const { players, lines, screens } = _extractV1Objects(data);
    const canvas = document.createElement('canvas');
    canvas.width = PCW; canvas.height = PCH;
    const ctx = canvas.getContext('2d');
    _drawCourt(ctx);
    lines.forEach(l => _drawLine(ctx, l));
    screens.forEach(s => _drawScreen(ctx, s));
    players.forEach(p => _drawPlayer(ctx, p));
    return canvas.toDataURL('image/png').split(',')[1];
  } catch { return null; }
}


function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 p-6" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function isYouTube(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

function getYouTubeEmbed(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

function isSupabaseVideo(url) {
  return url && url.includes('supabase') && (
    url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.avi')
  );
}

function isSupabaseImage(url) {
  return url && url.includes('supabase') && (
    url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')
  );
}

// ── Tag Input Component ──────────────────────────────────────────────────────
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');

  function addTag(val) {
    const tag = val.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
      <div className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-gray-700 min-h-[40px] items-center cursor-text"
        style={{ backgroundColor: '#16213e' }}
        onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-200">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}
              className="text-gray-400 hover:text-white leading-none">&times;</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addTag(input); }}
          placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-white text-sm placeholder-gray-500 outline-none"
        />
      </div>
      <p className="text-xs text-gray-600 mt-1">Press Enter or comma to add a tag</p>
    </div>
  );
}

// ── Analysis Modal ───────────────────────────────────────────────────────────
function AnalysisModal({ media, onClose }) {
  const [step, setStep] = useState('loading'); // 'loading' | 'history' | 'pre' | 'analyzing' | 'done'
  const [focus, setFocus] = useState('both');
  const [frameBase64, setFrameBase64] = useState(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [playerFocus, setPlayerFocus] = useState(null);
  const [detectedPlayers, setDetectedPlayers] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const frameRef = useRef(null);

  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [imagePayload, setImagePayload] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const bottomRef = useRef(null);

  // Saved analyses
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);

  useEffect(() => {
    loadFrame();
    loadSavedAnalyses();
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, analysis]);

  async function loadSavedAnalyses() {
    try {
      const res = await apiFetch(`/media/${media.id}/analyses`);
      if (res.ok) {
        const data = await res.json();
        setSavedAnalyses(data);
        setStep(data.length > 0 ? 'history' : 'pre');
      } else {
        setStep('pre');
      }
    } catch {
      setStep('pre');
    }
  }

  function loadSavedAnalysis(saved) {
    setAnalysis(saved.analysis);
    setChatHistory(saved.chat_history || []);
    setActiveAnalysisId(saved.id);
    setFocus(saved.focus || 'both');
    setPlayerFocus(saved.player_focus || null);
    setStep('done');
  }

  async function extractVideoFrame(videoUrl, timeSeconds = 2) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.currentTime = timeSeconds;
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          canvas.getContext('2d').drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        } catch { reject(new Error('Canvas extraction failed')); }
      };
      video.onerror = () => reject(new Error('Video load failed'));
      video.load();
    });
  }

  async function extractMultipleFrames(videoUrl) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.onloadedmetadata = async () => {
        const duration = video.duration || 10;
        const times = duration > 6
          ? [1, duration * 0.25, duration * 0.5, duration * 0.75, Math.max(duration - 1, 1)]
          : [1, Math.max(duration / 2, 1)];
        const unique = [...new Set(times.map(t => Math.min(Math.round(t * 10) / 10, duration - 0.5)))];
        const frames = [];
        for (const t of unique) {
          try {
            const f = await extractVideoFrame(videoUrl, t);
            frames.push(f);
          } catch {}
        }
        resolve(frames);
      };
      video.onerror = () => resolve([]);
      video.load();
    });
  }

  async function loadFrame() {
    setFrameLoading(true);
    if (isSupabaseVideo(media.url)) {
      try {
        const b64 = await extractVideoFrame(media.url);
        setFrameBase64(b64);
      } catch {}
    }
    setFrameLoading(false);
  }

  async function detectPlayers() {
    setDetecting(true);
    try {
      const body = isSupabaseVideo(media.url) && frameBase64
        ? { base64_frame: frameBase64 }
        : { media_url: media.url };
      const res = await apiFetch('/ai/detect-players', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) setDetectedPlayers(data.players || []);
    } catch {}
    setDetecting(false);
  }

  function handleFrameClick(e) {
    const rect = frameRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPlayerFocus({ x, y });
  }

  async function analyzeFilm() {
    setStep('analyzing');
    setError('');
    setChatHistory([]);
    setActiveAnalysisId(null);
    try {
      const isVideo = isSupabaseVideo(media.url);
      const isImg = isSupabaseImage(media.url);
      let payload;

      if (isVideo) {
        if (!frameBase64) { setError('Could not extract video frame.'); setStep('pre'); return; }
        // Extract multiple frames for richer analysis
        let multiFrames = [];
        try { multiFrames = await extractMultipleFrames(media.url); } catch {}
        if (multiFrames.length > 1) {
          payload = { base64_frames: multiFrames };
        } else {
          payload = { base64_frame: frameBase64 };
        }
        setImagePayload({ base64_frame: frameBase64 });
      } else if (isImg) {
        payload = { media_url: media.url };
        setImagePayload({ media_url: media.url });
      } else {
        setError('AI analysis works on uploaded image and video files only.');
        setStep('pre');
        return;
      }

      let play_images = [];
      let play_names = [];
      try {
        const role = localStorage.getItem('role');
        if (role === 'trainer') {
          const playsRes = await apiFetch('/plays');
          if (playsRes.ok) {
            const plays = await playsRes.json();
            const topPlays = plays.slice(0, 3);
            play_images = topPlays
              .map(p => renderPlayToBase64(p.canvas_json))
              .filter(Boolean);
            play_names = topPlays.map(p => p.name || 'Unnamed Play');
          }
        }
      } catch {}

      const body = {
        ...payload,
        title: media.title,
        description: media.description,
        focus,
        player_focus: playerFocus,
        play_images,
        play_names,
      };

      const res = await apiFetch('/ai/analyze-film', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Analysis failed'); setStep('pre'); return; }
      setAnalysis(data.analysis);
      setStep('done');

      // Auto-save the new analysis
      try {
        const saveRes = await apiFetch(`/media/${media.id}/analyses`, {
          method: 'POST',
          body: JSON.stringify({ analysis: data.analysis, focus, player_focus: playerFocus, chat_history: [] }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          setActiveAnalysisId(saved.id);
          setSavedAnalyses(prev => [saved, ...prev]);
        }
      } catch {}
    } catch (err) { setError(err?.message || 'Analysis failed.'); setStep('pre'); }
  }

  async function handleShare() {
    setShareMsg('Sharing...');
    try {
      const res = await apiFetch('/ai/share-to-team', {
        method: 'POST',
        body: JSON.stringify({ content: analysis, title: media.title, type: 'film' }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareMsg(`Shared to ${data.sent} player${data.sent !== 1 ? 's' : ''}`);
      } else {
        setShareMsg(data.error || `Error ${res.status}`);
      }
    } catch (err) { setShareMsg(err?.message || 'Network error'); }
    setTimeout(() => setShareMsg(''), 4000);
  }

  async function handleChatSend(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const newHistory = [...chatHistory, { role: 'user', content: message }];
    setChatHistory(newHistory);

    try {
      const historyForApi = [
        { role: 'assistant', content: analysis },
        ...chatHistory,
      ];
      const res = await apiFetch('/ai/film-chat', {
        method: 'POST',
        body: JSON.stringify({ ...imagePayload, history: historyForApi, message }),
      });
      const data = await res.json();
      let updatedHistory;
      if (!res.ok) {
        updatedHistory = [...newHistory, { role: 'assistant', content: `Error: ${data.error}` }];
      } else {
        updatedHistory = [...newHistory, { role: 'assistant', content: data.reply }];
      }
      setChatHistory(updatedHistory);

      // Persist chat history
      if (activeAnalysisId) {
        try {
          await apiFetch(`/media/analyses/${activeAnalysisId}`, {
            method: 'PATCH',
            body: JSON.stringify({ chat_history: updatedHistory }),
          });
        } catch {}
      }
    } catch {
      setChatHistory([...newHistory, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setChatLoading(false);
  }

  function inlineBold(str) {
    const parts = str.split(/\*\*(.+?)\*\*/g);
    if (parts.length === 1) return str;
    return parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} className="font-bold text-white">{part}</strong> : part
    );
  }

  function renderText(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4)
        return <h3 key={i} className="text-sm font-black text-white uppercase tracking-wide mt-3 mb-1">{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('• '))
        return <li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{inlineBold(line.slice(2))}</li>;
      if (line.trim() === '') return null;
      return <p key={i} className="text-sm text-gray-300 leading-relaxed">{inlineBold(line)}</p>;
    });
  }

  const frameUrl = isSupabaseImage(media.url) ? media.url : (frameBase64 ? `data:image/jpeg;base64,${frameBase64}` : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-xl rounded-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">AI Film Analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{media.title || 'Untitled'}</p>
          </div>
          <div className="flex items-center gap-3">
            {step === 'done' && (
              <button onClick={handleShare}
                className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex-shrink-0"
                style={{ backgroundColor: '#16a34a', color: 'white' }}>
                {shareMsg || 'Share to Team'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Loading saved analyses */}
          {step === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          )}

          {/* Saved analyses history */}
          {step === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">Previous Analyses ({savedAnalyses.length})</p>
                <button onClick={() => setStep('pre')}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold text-white"
                  style={{ backgroundColor: '#2563eb' }}>
                  + New Analysis
                </button>
              </div>
              <div className="space-y-2">
                {savedAnalyses.map(sa => (
                  <button key={sa.id} onClick={() => loadSavedAnalysis(sa)}
                    className="w-full text-left p-3 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors"
                    style={{ backgroundColor: '#16213e' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white capitalize">{sa.focus || 'General'} Analysis</span>
                      <span className="text-xs text-gray-500">{new Date(sa.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{sa.analysis.slice(0, 150)}...</p>
                    {sa.chat_history?.length > 0 && (
                      <span className="text-xs text-blue-400 mt-1 inline-block">{sa.chat_history.length} follow-up messages</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Pre-screening questions */}
          {(step === 'pre') && (
            <div className="space-y-5">
              {savedAnalyses.length > 0 && (
                <button onClick={() => setStep('history')}
                  className="text-xs text-blue-400 hover:underline">
                  &larr; View previous analyses ({savedAnalyses.length})
                </button>
              )}
              {error && <div className="px-3 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>}

              <div>
                <p className="text-sm font-bold text-white mb-2">What's the focus?</p>
                <div className="flex gap-2">
                  {[['offense', 'Offense'], ['defense', 'Defense'], ['both', 'Both']].map(([val, label]) => (
                    <button key={val} onClick={() => setFocus(val)}
                      className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                      style={focus === val
                        ? { backgroundColor: '#2563eb', color: 'white' }
                        : { backgroundColor: '#16213e', color: '#9ca3af', border: '1px solid #374151' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">Focus on a specific player? <span className="text-gray-500 font-normal">(optional)</span></p>
                  {!detectedPlayers.length && frameUrl && (
                    <button onClick={detectPlayers} disabled={detecting}
                      className="text-xs text-blue-400 hover:underline disabled:opacity-50">
                      {detecting ? 'Detecting...' : 'Auto-detect players'}
                    </button>
                  )}
                </div>

                {frameUrl ? (
                  <div className="relative rounded-lg overflow-hidden cursor-crosshair border border-gray-700" ref={frameRef} onClick={handleFrameClick}>
                    <img src={frameUrl} alt="Film frame" className="w-full object-contain" style={{ maxHeight: 220 }} />

                    {detectedPlayers.map(p => (
                      <button key={p.id} onClick={e => { e.stopPropagation(); setPlayerFocus({ x: p.x, y: p.y }); }}
                        className="absolute rounded-full border-2 transition-all hover:scale-110"
                        style={{
                          left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 32, height: 32,
                          backgroundColor: playerFocus?.x === p.x ? 'rgba(37,99,235,0.7)' : 'rgba(0,0,0,0.5)',
                          borderColor: p.team === 'offense' ? 'white' : '#ef4444',
                        }} />
                    ))}

                    {playerFocus && !detectedPlayers.length && (
                      <div className="absolute pointer-events-none"
                        style={{ left: `${playerFocus.x * 100}%`, top: `${playerFocus.y * 100}%`, transform: 'translate(-50%, -50%)' }}>
                        <div className="w-7 h-7 rounded-full border-2 border-yellow-400 bg-yellow-400/30" />
                      </div>
                    )}

                    <div className="absolute bottom-1 left-1 right-1 text-center">
                      <span className="text-xs text-white/60 bg-black/40 px-2 py-0.5 rounded">
                        {playerFocus ? 'Player selected — click elsewhere to change' : 'Click on a player to focus on them'}
                      </span>
                    </div>
                  </div>
                ) : frameLoading ? (
                  <div className="rounded-lg border border-gray-700 h-32 flex items-center justify-center text-gray-500 text-sm">
                    Loading frame...
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-700 h-20 flex items-center justify-center text-gray-500 text-xs">
                    No preview available
                  </div>
                )}

                {playerFocus && (
                  <button onClick={() => { setPlayerFocus(null); setDetectedPlayers([]); }}
                    className="text-xs text-gray-500 hover:text-gray-300 mt-1">
                    Clear player focus &times;
                  </button>
                )}
              </div>

              <button onClick={analyzeFilm}
                className="w-full py-3 rounded-lg font-bold text-white hover:opacity-90"
                style={{ backgroundColor: '#2563eb' }}>
                Analyze Film
              </button>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Analyzing your film...</p>
            </div>
          )}

          {/* Step 3: Results + chat */}
          {step === 'done' && (
            <>
              {savedAnalyses.length > 0 && (
                <button onClick={() => setStep('history')}
                  className="text-xs text-blue-400 hover:underline">
                  &larr; View all analyses ({savedAnalyses.length})
                </button>
              )}
              <div className="space-y-1">{renderText(analysis)}</div>
              {chatHistory.length > 0 && (
                <div className="border-t border-gray-700 pt-4 space-y-4">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={{ backgroundColor: msg.role === 'user' ? '#2563eb' : '#16213e', color: 'white',
                          borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                          borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined }}>
                        {msg.role === 'assistant' ? <div className="space-y-1">{renderText(msg.content)}</div> : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2.5 rounded-2xl text-sm text-gray-400" style={{ backgroundColor: '#16213e' }}>Thinking...</div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {step === 'done' && (
          <form onSubmit={handleChatSend} className="px-4 py-3 border-t border-gray-700 flex gap-2 flex-shrink-0">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question about this film..."
              disabled={chatLoading}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
              style={{ backgroundColor: '#16213e' }} />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}
              className="px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-50 hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: '#2563eb' }}>Ask</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main Media Page ──────────────────────────────────────────────────────────
export default function MediaPage() {
  const [media, setMedia] = useState([]);
  const [allMedia, setAllMedia] = useState([]); // unfiltered, for extracting all tags
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('file');
  const [form, setForm] = useState({ title: '', description: '', url: '', media_type: 'video', tags: [] });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [analyzingMedia, setAnalyzingMedia] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const searchTimerRef = useRef(null);

  // Editing tags
  const [editingTagsFor, setEditingTagsFor] = useState(null);
  const [editTags, setEditTags] = useState([]);

  useEffect(() => { loadMedia(); }, []);

  // Derive all unique tags from the full unfiltered media list
  useEffect(() => {
    const tags = new Set();
    allMedia.forEach(m => (m.tags || []).forEach(t => tags.add(t)));
    setAllTags([...tags].sort());
  }, [allMedia]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchFilteredMedia();
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, activeTagFilters]);

  async function loadMedia() {
    setLoading(true);
    try {
      const res = await apiFetch('/media');
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
        setAllMedia(data);
      }
    } catch {}
    setLoading(false);
  }

  async function fetchFilteredMedia() {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (activeTagFilters.length > 0) params.set('tags', activeTagFilters.join(','));
      const qs = params.toString();
      const res = await apiFetch(`/media${qs ? `?${qs}` : ''}`);
      if (res.ok) setMedia(await res.json());
    } catch {}
  }

  function toggleTagFilter(tag) {
    setActiveTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function clearFilters() {
    setSearchQuery('');
    setActiveTagFilters([]);
  }

  function handleFileSelect(selected) {
    if (!selected) return;
    const maxSize = 100 * 1024 * 1024;
    if (selected.size > maxSize) { setFormError('File must be under 100MB'); return; }
    setFile(selected);
    setFormError('');
    const isVideo = selected.type.startsWith('video/');
    setForm((f) => ({ ...f, media_type: isVideo ? 'video' : 'image' }));
    if (!isVideo) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setUploading(true);

    try {
      let url = form.url;
      let media_type = form.media_type;

      if (uploadMode === 'file') {
        if (!file) { setFormError('Please select a file'); setUploading(false); return; }
        setUploadProgress('Uploading...');
        const userId = localStorage.getItem('userId');
        url = await uploadMediaFile(file, userId);
        media_type = file.type.startsWith('video/') ? 'video' : 'image';
      }

      const res = await apiFetch('/media', {
        method: 'POST',
        body: JSON.stringify({ title: form.title, description: form.description, url, media_type, tags: form.tags }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to save'); setUploading(false); return; }

      setShowModal(false);
      resetModal();
      loadMedia();
    } catch { setFormError('Upload failed. Try again.'); }
    setUploading(false);
    setUploadProgress('');
  }

  function resetModal() {
    setForm({ title: '', description: '', url: '', media_type: 'video', tags: [] });
    setFile(null);
    setFilePreview(null);
    setFormError('');
    setUploadProgress('');
  }

  async function handleDelete(m) {
    if (!confirm('Delete this media?')) return;
    setDeleteLoading(m.id);
    try {
      await apiFetch(`/media/${m.id}`, { method: 'DELETE' });
      if (m.url && m.url.includes('supabase')) {
        await deleteMediaFile(m.url).catch(() => {});
      }
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
      setAllMedia((prev) => prev.filter((x) => x.id !== m.id));
    } catch {}
    setDeleteLoading(null);
  }

  async function saveEditedTags(mediaId) {
    try {
      const res = await apiFetch(`/media/${mediaId}/tags`, {
        method: 'PATCH',
        body: JSON.stringify({ tags: editTags }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMedia(prev => prev.map(m => m.id === mediaId ? { ...m, tags: updated.tags } : m));
        setAllMedia(prev => prev.map(m => m.id === mediaId ? { ...m, tags: updated.tags } : m));
      }
    } catch {}
    setEditingTagsFor(null);
  }

  const hasFilters = searchQuery.trim() || activeTagFilters.length > 0;

  return (
    <div>
      {analyzingMedia && (
        <AnalysisModal media={analyzingMedia} onClose={() => setAnalyzingMedia(null)} />
      )}

      {/* Editing tags modal */}
      {editingTagsFor && (
        <Modal title="Edit Tags" onClose={() => setEditingTagsFor(null)}>
          <TagInput tags={editTags} onChange={setEditTags} />
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setEditingTagsFor(null)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white">
              Cancel
            </button>
            <button onClick={() => saveEditedTags(editingTagsFor)} className="flex-1 py-2.5 rounded-lg font-bold text-white" style={{ backgroundColor: '#2563eb' }}>
              Save Tags
            </button>
          </div>
        </Modal>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Film Room</h1>
          <p className="text-gray-400 mt-1">Upload and organize your game & practice film</p>
        </div>
        <button
          onClick={() => { setShowModal(true); resetModal(); }}
          className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#2563eb' }}
        >
          + Add Film
        </button>
      </div>

      {/* Search & Filter Bar */}
      {!loading && allMedia.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-gray-800" style={{ backgroundColor: '#1e1e30' }}>
          <div className="flex gap-3 items-center mb-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or tags..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white whitespace-nowrap">
                Clear filters
              </button>
            )}
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button key={tag} onClick={() => toggleTagFilter(tag)}
                  className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                  style={activeTagFilters.includes(tag)
                    ? { backgroundColor: 'var(--primary)', color: 'white' }
                    : { backgroundColor: '#16213e', color: '#9ca3af', border: '1px solid #374151' }
                  }>
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : media.length === 0 ? (
        <div className="rounded-xl p-12 border border-gray-800 text-center" style={{ backgroundColor: '#1e1e30' }}>
          {hasFilters ? (
            <>
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">No results</h3>
              <p className="text-gray-400 mb-6">No film matches your search or filters.</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90" style={{ backgroundColor: '#2563eb' }}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white mb-2">No film yet</h3>
              <p className="text-gray-400 mb-6">Upload game film, practice clips, or highlight reels.</p>
              <button onClick={() => { setShowModal(true); resetModal(); }} className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90" style={{ backgroundColor: '#2563eb' }}>
                Upload First Clip
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((m) => {
            const embedUrl = isYouTube(m.url) ? getYouTubeEmbed(m.url) : null;
            const isVideo = isSupabaseVideo(m.url);
            const isImage = isSupabaseImage(m.url);
            return (
              <div key={m.id} className="rounded-xl border border-gray-800 overflow-hidden hover:border-blue-600 transition-colors" style={{ backgroundColor: '#1e1e30' }}>
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                  {embedUrl ? (
                    <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : isVideo ? (
                    <video src={m.url} controls className="w-full h-full object-contain" />
                  ) : isImage ? (
                    <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                  ) : m.thumbnail_url ? (
                    <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-600">
                      <span className="text-4xl">🎬</span>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: '#2563eb' }}>Open Link</a>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm mb-1 truncate">{m.title || 'Untitled'}</h3>
                  {m.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{m.description}</p>}

                  {/* Tags */}
                  {m.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {m.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#16213e', color: '#9ca3af', border: '1px solid #374151' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{new Date(m.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingTagsFor(m.id); setEditTags(m.tags || []); }}
                        className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
                        title="Edit tags">
                        Tags
                      </button>
                      {(isSupabaseImage(m.url) || isSupabaseVideo(m.url)) && (
                        <button
                          onClick={() => setAnalyzingMedia(m)}
                          className="text-xs px-2.5 py-1 rounded border font-medium hover:opacity-80"
                          style={{ borderColor: '#2563eb', color: '#2563eb' }}
                        >
                          Analyze
                        </button>
                      )}
                      <button onClick={() => handleDelete(m)} disabled={deleteLoading === m.id} className="text-xs px-2.5 py-1 rounded border border-red-900 text-red-400 hover:bg-red-900/20 disabled:opacity-50">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Add Film" onClose={() => { setShowModal(false); resetModal(); }}>
          <div className="flex gap-2 mb-5">
            {['file', 'url'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setUploadMode(mode); resetModal(); }}
                className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
                style={{
                  backgroundColor: uploadMode === mode ? '#2563eb' : '#16213e',
                  color: uploadMode === mode ? 'white' : '#9ca3af',
                  border: `1px solid ${uploadMode === mode ? '#2563eb' : '#374151'}`,
                }}
              >
                {mode === 'file' ? 'Upload File' : 'Paste URL'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{formError}</div>}

            {uploadMode === 'file' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">File *</label>
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  style={{ backgroundColor: '#16213e' }}
                >
                  {file ? (
                    <div>
                      {filePreview
                        ? <img src={filePreview} alt="preview" className="w-full h-32 object-contain mb-2 rounded" />
                        : <div className="text-4xl mb-2">🎬</div>
                      }
                      <p className="text-sm text-white font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-2">📁</div>
                      <p className="text-sm text-gray-400">Drop file here or click to browse</p>
                      <p className="text-xs text-gray-600 mt-1">MP4, MOV, JPG, PNG · Max 100MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">URL *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or direct link"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  style={{ backgroundColor: '#16213e' }}
                />
                <p className="text-xs text-gray-500 mt-1">YouTube links embed automatically</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Shooting Form - Practice 3/17"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notes about this clip..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>

            <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowModal(false); resetModal(); }} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={uploading} className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#2563eb' }}>
                {uploading ? (uploadProgress || 'Uploading...') : 'Add Film'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
