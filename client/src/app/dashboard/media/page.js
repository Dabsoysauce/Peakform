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

// ── Shimmer Skeleton ────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 20, rounded = 12 }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
      backgroundSize: '300% 100%',
      animation: 'shimmer 1.6s ease infinite',
    }} />
  );
}

// ── Glass Modal ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg overflow-hidden" style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
      }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 24,
            lineHeight: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >&times;</button>
        </div>
        <div style={{ padding: 24 }}>
          {children}
        </div>
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
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Tags</label>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '10px 14px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        minHeight: 42,
        alignItems: 'center',
        cursor: 'text',
        transition: 'border-color 0.2s',
      }}
        onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
        {tags.map(tag => (
          <span key={tag} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(var(--primary-rgb),0.15)',
            color: 'var(--primary-light)',
            border: '1px solid rgba(var(--primary-rgb),0.2)',
            fontWeight: 600,
          }}>
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}
              style={{ color: 'rgba(var(--primary-rgb),0.6)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 14, lineHeight: 1, padding: 0 }}>&times;</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addTag(input); }}
          placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
          style={{
            flex: 1,
            minWidth: 80,
            background: 'transparent',
            color: '#ffffff',
            fontSize: 13,
            border: 'none',
            outline: 'none',
          }}
          className="placeholder-gray-500"
        />
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Press Enter or comma to add a tag</p>
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
  const [showPrefs, setShowPrefs] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    loadFrame();
    loadSavedAnalyses();
    loadPreferences();
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, analysis]);

  async function loadPreferences() {
    try {
      const res = await apiFetch('/ai/film-preferences');
      if (res.ok) {
        const data = await res.json();
        setCustomInstructions(data.custom_instructions || '');
      }
    } catch {}
  }

  async function savePreferences() {
    setPrefsSaving(true);
    setPrefsSaved(false);
    try {
      const res = await apiFetch('/ai/film-preferences', {
        method: 'PUT',
        body: JSON.stringify({ custom_instructions: customInstructions }),
      });
      if (res.ok) {
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2000);
      }
    } catch {}
    setPrefsSaving(false);
  }

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
      j % 2 === 1 ? <strong key={j} style={{ fontWeight: 700, color: '#ffffff' }}>{part}</strong> : part
    );
  }

  function renderText(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4)
        return <h3 key={i} style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 14, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('• '))
        return <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginLeft: 16, lineHeight: 1.7 }}>{inlineBold(line.slice(2))}</li>;
      if (line.trim() === '') return null;
      return <p key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{inlineBold(line)}</p>;
    });
  }

  const frameUrl = isSupabaseImage(media.url) ? media.url : (frameBase64 ? `data:image/jpeg;base64,${frameBase64}` : null);

  // Glass styles
  const glassCard = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]" style={glassCard}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>AI Film Analysis</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.title || 'Untitled'}</p>
          </div>
          <div className="flex items-center gap-3">
            {step === 'done' && (
              <button onClick={handleShare}
                style={{
                  fontSize: 12,
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontWeight: 700,
                  background: 'rgba(74,222,128,0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(74,222,128,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.15)'; }}
              >
                {shareMsg || 'Share to Team'}
              </button>
            )}
            <button onClick={onClose} style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: 22,
              lineHeight: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Loading saved analyses */}
          {step === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 16 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={14} />
            </div>
          )}

          {/* Saved analyses history */}
          {step === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="flex items-center justify-between">
                <p style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Previous Analyses ({savedAnalyses.length})</p>
                <button onClick={() => setStep('pre')}
                  style={{
                    fontSize: 12,
                    padding: '7px 14px',
                    borderRadius: 10,
                    fontWeight: 700,
                    background: 'rgba(var(--primary-rgb),0.15)',
                    color: 'var(--primary-light)',
                    border: '1px solid rgba(var(--primary-rgb),0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.25)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.15)'; }}
                >
                  + New Analysis
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedAnalyses.map(sa => (
                  <button key={sa.id} onClick={() => loadSavedAnalysis(sa)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 14,
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', textTransform: 'capitalize' }}>{sa.focus || 'General'} Analysis</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(sa.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sa.analysis.slice(0, 150)}...</p>
                    {sa.chat_history?.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--primary-light)', marginTop: 4, display: 'inline-block' }}>{sa.chat_history.length} follow-up messages</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Pre-screening questions */}
          {(step === 'pre') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {savedAnalyses.length > 0 && (
                <button onClick={() => setStep('history')}
                  style={{ fontSize: 12, color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  &larr; View previous analyses ({savedAnalyses.length})
                </button>
              )}
              {error && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#f87171',
                  fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>What's the focus?</p>
                <div className="flex gap-2">
                  {[['offense', 'Offense'], ['defense', 'Defense'], ['both', 'Both']].map(([val, label]) => (
                    <button key={val} onClick={() => setFocus(val)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        ...(focus === val
                          ? { background: 'rgba(var(--primary-rgb),0.2)', color: 'var(--primary-light)', border: '1px solid rgba(var(--primary-rgb),0.35)', boxShadow: '0 0 20px rgba(var(--primary-rgb),0.1)' }
                          : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }),
                      }}
                      onMouseEnter={(e) => { if (focus !== val) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}}
                      onMouseLeave={(e) => { if (focus !== val) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Focus on a specific player? <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>(optional)</span></p>
                  {!detectedPlayers.length && frameUrl && (
                    <button onClick={detectPlayers} disabled={detecting}
                      style={{ fontSize: 12, color: 'var(--primary-light)', background: 'none', border: 'none', cursor: detecting ? 'default' : 'pointer', opacity: detecting ? 0.5 : 1 }}
                      onMouseEnter={(e) => { if (!detecting) e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                    >
                      {detecting ? 'Detecting...' : 'Auto-detect players'}
                    </button>
                  )}
                </div>

                {frameUrl ? (
                  <div className="relative overflow-hidden" style={{ borderRadius: 14, cursor: 'crosshair', border: '1px solid rgba(255,255,255,0.08)' }} ref={frameRef} onClick={handleFrameClick}>
                    <img src={frameUrl} alt="Film frame" className="w-full object-contain" style={{ maxHeight: 220 }} />

                    {detectedPlayers.map(p => (
                      <button key={p.id} onClick={e => { e.stopPropagation(); setPlayerFocus({ x: p.x, y: p.y }); }}
                        className="absolute rounded-full transition-all hover:scale-110"
                        style={{
                          left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 32, height: 32,
                          backgroundColor: playerFocus?.x === p.x ? 'rgba(var(--primary-rgb),0.7)' : 'rgba(0,0,0,0.5)',
                          border: `2px solid ${p.team === 'offense' ? 'white' : '#ef4444'}`,
                        }} />
                    ))}

                    {playerFocus && !detectedPlayers.length && (
                      <div className="absolute pointer-events-none"
                        style={{ left: `${playerFocus.x * 100}%`, top: `${playerFocus.y * 100}%`, transform: 'translate(-50%, -50%)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--primary-light)', background: 'rgba(var(--primary-rgb),0.3)' }} />
                      </div>
                    )}

                    <div className="absolute bottom-1 left-1 right-1 text-center">
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.5)', padding: '2px 10px', borderRadius: 8, backdropFilter: 'blur(8px)' }}>
                        {playerFocus ? 'Player selected -- click elsewhere to change' : 'Click on a player to focus on them'}
                      </span>
                    </div>
                  </div>
                ) : frameLoading ? (
                  <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', height: 128, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Skeleton width="80%" height={12} />
                    <Skeleton width="50%" height={12} />
                  </div>
                ) : (
                  <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                    No preview available
                  </div>
                )}

                {playerFocus && (
                  <button onClick={() => { setPlayerFocus(null); setDetectedPlayers([]); }}
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                  >
                    Clear player focus &times;
                  </button>
                )}
              </div>

              {/* Personalize toggle */}
              <button onClick={() => setShowPrefs(!showPrefs)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 13,
                  color: customInstructions ? 'var(--primary-light)' : 'rgba(255,255,255,0.4)',
                  background: showPrefs ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${showPrefs ? 'rgba(var(--primary-rgb),0.25)' : 'rgba(255,255,255,0.06)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.08)'; e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = showPrefs ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = showPrefs ? 'rgba(var(--primary-rgb),0.25)' : 'rgba(255,255,255,0.06)'; }}
              >
                <span style={{ fontSize: 16 }}>{showPrefs ? '\u25BC' : '\u25B6'}</span>
                Personalize AI Analysis
                {customInstructions && <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>Active</span>}
              </button>

              {showPrefs && (
                <div style={{
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid rgba(var(--primary-rgb),0.15)',
                  background: 'rgba(var(--primary-rgb),0.04)',
                }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10, lineHeight: 1.5 }}>
                    Tell the AI what to focus on. This applies to all your future analyses.
                  </p>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g., Focus on my shooting form and release point. Pay attention to defensive positioning and help-side rotations. I'm a point guard so emphasize ball handling and court vision."
                    maxLength={2000}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#fff',
                      fontSize: 13,
                      lineHeight: 1.5,
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{customInstructions.length}/2000</span>
                    <button onClick={savePreferences}
                      disabled={prefsSaving}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 12,
                        color: '#fff',
                        background: prefsSaved ? '#4ade80' : 'rgba(var(--primary-rgb),0.8)',
                        border: 'none',
                        cursor: prefsSaving ? 'not-allowed' : 'pointer',
                        opacity: prefsSaving ? 0.6 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {prefsSaving ? 'Saving...' : prefsSaved ? 'Saved!' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              <button onClick={analyzeFilm}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.25)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(var(--primary-rgb),0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--primary-rgb),0.25)'; }}
              >
                Analyze Film
              </button>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {step === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 16 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Analyzing your film...</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300 }}>
                <Skeleton width="100%" height={10} />
                <Skeleton width="75%" height={10} />
                <Skeleton width="50%" height={10} />
              </div>
            </div>
          )}

          {/* Step 3: Results + chat */}
          {step === 'done' && (
            <>
              {savedAnalyses.length > 0 && (
                <button onClick={() => setStep('history')}
                  style={{ fontSize: 12, color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  &larr; View all analyses ({savedAnalyses.length})
                </button>
              )}
              <div style={{
                padding: 16,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{renderText(analysis)}</div>
              </div>
              {chatHistory.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '10px 16px',
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: '#ffffff',
                        borderRadius: 16,
                        ...(msg.role === 'user'
                          ? {
                              background: 'rgba(var(--primary-rgb),0.2)',
                              border: '1px solid rgba(var(--primary-rgb),0.25)',
                              borderBottomRightRadius: 4,
                            }
                          : {
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderBottomLeftRadius: 4,
                            }),
                      }}>
                        {msg.role === 'assistant' ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{renderText(msg.content)}</div> : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: 16,
                        borderBottomLeftRadius: 4,
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.35)',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(var(--primary-rgb),0.5)', animation: 'pulseGlow 1.2s ease infinite' }} />
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(var(--primary-rgb),0.5)', animation: 'pulseGlow 1.2s ease infinite 0.2s' }} />
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(var(--primary-rgb),0.5)', animation: 'pulseGlow 1.2s ease infinite 0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
          </div>
        </div>

        {step === 'done' && (
          <form onSubmit={handleChatSend} className="flex gap-2 flex-shrink-0" style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question about this film..."
              disabled={chatLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
                opacity: chatLoading ? 0.5 : 1,
                transition: 'border-color 0.2s',
              }}
              className="placeholder-gray-500"
              onFocus={(e) => { e.target.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                fontWeight: 700,
                color: '#ffffff',
                fontSize: 13,
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                border: 'none',
                cursor: (chatLoading || !chatInput.trim()) ? 'default' : 'pointer',
                opacity: (chatLoading || !chatInput.trim()) ? 0.4 : 1,
                transition: 'all 0.2s',
                flexShrink: 0,
              }}>Ask</button>
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

  // Mount animation
  const [mounted, setMounted] = useState(false);

  useEffect(() => { loadMedia(); }, []);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

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

  // Shared glass styles
  const glassInput = {
    width: '100%',
    padding: '11px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const glassBtn = (active) => ({
    flex: 1,
    padding: '11px 0',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ...(active
      ? { background: 'rgba(var(--primary-rgb),0.2)', color: 'var(--primary-light)', border: '1px solid rgba(var(--primary-rgb),0.35)' }
      : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }),
  });

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes gradientMove {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .media-grid-card {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, box-shadow 0.3s;
        }
        .media-grid-card:hover {
          transform: translateY(-4px);
          border-color: rgba(var(--primary-rgb),0.25) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(var(--primary-rgb),0.08) !important;
        }
        @media (max-width: 640px) {
          .media-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div>
        {analyzingMedia && (
          <AnalysisModal media={analyzingMedia} onClose={() => setAnalyzingMedia(null)} />
        )}

        {/* Editing tags modal */}
        {editingTagsFor && (
          <Modal title="Edit Tags" onClose={() => setEditingTagsFor(null)}>
            <TagInput tags={editTags} onChange={setEditTags} />
            <div className="flex gap-3" style={{ paddingTop: 16 }}>
              <button type="button" onClick={() => setEditingTagsFor(null)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                Cancel
              </button>
              <button onClick={() => saveEditedTags(editingTagsFor)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 16px rgba(var(--primary-rgb),0.2)',
                }}>
                Save Tags
              </button>
            </div>
          </Modal>
        )}

        {/* Page Header */}
        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          marginBottom: 32,
        }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
              }}>
                Film Room
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: 14,
                marginTop: 4,
                fontWeight: 500,
              }}>
                Upload and organize your game & practice film
              </p>
            </div>
            <button
              onClick={() => { setShowModal(true); resetModal(); }}
              style={{
                padding: '11px 22px',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 14,
                color: '#ffffff',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.25)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(var(--primary-rgb),0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--primary-rgb),0.25)'; }}
            >
              + Add Film
            </button>
          </div>
          {/* Animated gradient line */}
          <div style={{
            marginTop: 20,
            height: 2,
            borderRadius: 1,
            background: 'linear-gradient(90deg, var(--primary), var(--primary-light), #3b82f6, #8b5cf6, var(--primary))',
            backgroundSize: '200% 100%',
            animation: 'gradientMove 4s ease infinite',
            opacity: 0.4,
          }} />
        </div>

        {/* Search & Filter Bar */}
        {!loading && allMedia.length > 0 && (
          <div style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.06)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}>
            <div className="flex gap-3 items-center" style={{ marginBottom: allTags.length > 0 ? 12 : 0 }}>
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or tags..."
                  style={{
                    ...glassInput,
                    paddingLeft: 40,
                  }}
                  className="placeholder-gray-500"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              {hasFilters && (
                <button onClick={clearFilters}
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  Clear filters
                </button>
              )}
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button key={tag} onClick={() => toggleTagFilter(tag)}
                    style={{
                      fontSize: 12,
                      padding: '5px 14px',
                      borderRadius: 20,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ...(activeTagFilters.includes(tag)
                        ? { background: 'rgba(var(--primary-rgb),0.2)', color: 'var(--primary-light)', border: '1px solid rgba(var(--primary-rgb),0.3)' }
                        : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }),
                    }}
                    onMouseEnter={(e) => { if (!activeTagFilters.includes(tag)) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}}
                    onMouseLeave={(e) => { if (!activeTagFilters.includes(tag)) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="media-grid">
            {[1,2,3].map(i => (
              <div key={i} style={{
                borderRadius: 18,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}>
                <Skeleton width="100%" height={180} rounded={0} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="100%" height={10} />
                  <Skeleton width="40%" height={10} />
                </div>
              </div>
            ))}
          </div>
        ) : media.length === 0 ? (
          <div style={{
            borderRadius: 20,
            padding: 48,
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}>
            {hasFilters ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>&#128269;</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>No results</h3>
                <p style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 24, fontSize: 14 }}>No film matches your search or filters.</p>
                <button onClick={clearFilters}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.25)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(var(--primary-rgb),0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--primary-rgb),0.25)'; }}
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>&#127916;</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>No film yet</h3>
                <p style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 24, fontSize: 14 }}>Upload game film, practice clips, or highlight reels.</p>
                <button onClick={() => { setShowModal(true); resetModal(); }}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.25)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(var(--primary-rgb),0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--primary-rgb),0.25)'; }}
                >
                  Upload First Clip
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="media-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {media.map((m, idx) => {
              const embedUrl = isYouTube(m.url) ? getYouTubeEmbed(m.url) : null;
              const isVideo = isSupabaseVideo(m.url);
              const isImage = isSupabaseImage(m.url);
              return (
                <div key={m.id} className="media-grid-card"
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
                    transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${0.1 + idx * 0.06}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${0.1 + idx * 0.06}s, border-color 0.3s, box-shadow 0.3s`,
                  }}>
                  <div style={{ aspectRatio: '16/9', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {embedUrl ? (
                      <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : isVideo ? (
                      <video src={m.url} controls className="w-full h-full object-contain" />
                    ) : isImage ? (
                      <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                    ) : m.thumbnail_url ? (
                      <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.2)' }}>
                        <span style={{ fontSize: 36 }}>&#127916;</span>
                        <a href={m.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: 'var(--primary-light)', textDecoration: 'none', transition: 'opacity 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                        >Open Link</a>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontWeight: 700, color: '#ffffff', fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title || 'Untitled'}</h3>
                    {m.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.description}</p>}

                    {/* Tags */}
                    {m.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1" style={{ marginBottom: 10 }}>
                        {m.tags.map(tag => (
                          <span key={tag} style={{
                            fontSize: 11,
                            padding: '2px 10px',
                            borderRadius: 20,
                            background: 'rgba(var(--primary-rgb),0.1)',
                            color: 'var(--primary-light)',
                            border: '1px solid rgba(var(--primary-rgb),0.15)',
                            fontWeight: 600,
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{new Date(m.created_at).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingTagsFor(m.id); setEditTags(m.tags || []); }}
                          style={{
                            fontSize: 11,
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            color: 'rgba(255,255,255,0.35)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                          title="Edit tags">
                          Tags
                        </button>
                        {(isSupabaseImage(m.url) || isSupabaseVideo(m.url)) && (
                          <button
                            onClick={() => setAnalyzingMedia(m)}
                            style={{
                              fontSize: 11,
                              padding: '5px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(var(--primary-rgb),0.25)',
                              background: 'rgba(var(--primary-rgb),0.08)',
                              color: 'var(--primary-light)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.18)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.08)'; }}
                          >
                            Analyze
                          </button>
                        )}
                        <button onClick={() => handleDelete(m)} disabled={deleteLoading === m.id}
                          style={{
                            fontSize: 11,
                            padding: '5px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.2)',
                            background: 'rgba(239,68,68,0.06)',
                            color: '#f87171',
                            cursor: deleteLoading === m.id ? 'default' : 'pointer',
                            opacity: deleteLoading === m.id ? 0.5 : 1,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { if (deleteLoading !== m.id) e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                        >
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
            <div className="flex gap-2" style={{ marginBottom: 20 }}>
              {['file', 'url'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setUploadMode(mode); resetModal(); }}
                  style={glassBtn(uploadMode === mode)}
                >
                  {mode === 'file' ? 'Upload File' : 'Paste URL'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#f87171',
                  fontSize: 13,
                }}>
                  {formError}
                </div>
              )}

              {uploadMode === 'file' ? (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>File *</label>
                  <div
                    ref={dropRef}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(255,255,255,0.1)',
                      borderRadius: 16,
                      padding: 24,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    {file ? (
                      <div>
                        {filePreview
                          ? <img src={filePreview} alt="preview" className="w-full object-contain" style={{ height: 128, marginBottom: 8, borderRadius: 8 }} />
                          : <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.6 }}>&#127916;</div>
                        }
                        <p style={{ fontSize: 13, color: '#ffffff', fontWeight: 600 }}>{file.name}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>&#128193;</div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Drop file here or click to browse</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>MP4, MOV, JPG, PNG -- Max 100MB</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>URL *</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... or direct link"
                    required
                    style={glassInput}
                    className="placeholder-gray-500"
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.08)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>YouTube links embed automatically</p>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Shooting Form - Practice 3/17"
                  style={glassInput}
                  className="placeholder-gray-500"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Notes about this clip..."
                  rows={2}
                  style={{
                    ...glassInput,
                    resize: 'none',
                  }}
                  className="placeholder-gray-500"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />

              <div className="flex gap-3" style={{ paddingTop: 8 }}>
                <button type="button" onClick={() => { setShowModal(false); resetModal(); }}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={uploading}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    border: 'none',
                    cursor: uploading ? 'default' : 'pointer',
                    opacity: uploading ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 16px rgba(var(--primary-rgb),0.2)',
                  }}>
                  {uploading ? (uploadProgress || 'Uploading...') : 'Add Film'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  );
}
