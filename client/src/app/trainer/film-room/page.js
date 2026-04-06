'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadMediaFile, deleteMediaFile } from '../../lib/supabase';

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

// ── Glass Card Component ────────────────────────────────────────────────────
function GlassCard({ children, style, className = '', ...props }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 20,
        transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
        ...style,
      }}
      {...props}
    >
      {isHovered && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--primary-rgb),0.06), transparent 60%)`,
          zIndex: 0,
        }} />
      )}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.025, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 512, borderRadius: 20, overflow: 'hidden',
        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >&times;</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
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
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Tags</label>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 14px', borderRadius: 12,
          border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
          minHeight: 42, alignItems: 'center', cursor: 'text', transition: 'border-color 0.2s',
        }}
        onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 10px',
            borderRadius: 20, background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary)',
            border: '1px solid rgba(var(--primary-rgb),0.25)', fontWeight: 600,
          }}>
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}
              style={{ background: 'none', border: 'none', color: 'rgba(var(--primary-rgb),0.6)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--primary-rgb),0.6)'}
            >&times;</button>
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
            flex: 1, minWidth: 80, background: 'transparent', color: 'white', fontSize: 13,
            border: 'none', outline: 'none', padding: 0,
          }}
        />
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Press Enter or comma to add a tag</p>
    </div>
  );
}

// ── Analysis Modal ───────────────────────────────────────────────────────────
function AnalysisModal({ media, onClose }) {
  const [step, setStep] = useState('loading');
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
      const res = await apiFetch(`/trainer-media/${media.id}/analyses`);
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
        const playsRes = await apiFetch('/plays');
        if (playsRes.ok) {
          const plays = await playsRes.json();
          const topPlays = plays.slice(0, 3);
          play_images = topPlays
            .map(p => renderPlayToBase64(p.canvas_json))
            .filter(Boolean);
          play_names = topPlays.map(p => p.name || 'Unnamed Play');
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

      try {
        const saveRes = await apiFetch(`/trainer-media/${media.id}/analyses`, {
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

      if (activeAnalysisId) {
        try {
          await apiFetch(`/trainer-media/analyses/${activeAnalysisId}`, {
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
      j % 2 === 1 ? <strong key={j} style={{ fontWeight: 700, color: 'white' }}>{part}</strong> : part
    );
  }

  function renderText(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4)
        return <h3 key={i} style={{ fontSize: 13, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 14, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('• '))
        return <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 16, lineHeight: 1.7 }}>{inlineBold(line.slice(2))}</li>;
      if (line.trim() === '') return null;
      return <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{inlineBold(line)}</p>;
    });
  }

  const frameUrl = isSupabaseImage(media.url) ? media.url : (frameBase64 ? `data:image/jpeg;base64,${frameBase64}` : null);

  const glassBtn = (active) => ({
    flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: active ? '1px solid rgba(var(--primary-rgb),0.4)' : '1px solid var(--glass-border)',
    background: active ? 'rgba(var(--primary-rgb),0.15)' : 'var(--glass-input-bg)',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    transition: 'all 0.25s ease',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 580, borderRadius: 24, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)', boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: 'white', margin: 0 }}>AI Film Analysis</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.title || 'Untitled'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step === 'done' && (
              <button onClick={handleShare} style={{
                fontSize: 12, padding: '7px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                border: '1px solid rgba(74,222,128,0.3)',
                background: 'rgba(74,222,128,0.12)', color: '#4ade80',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.12)'; }}
              >
                {shareMsg || 'Share to Team'}
              </button>
            )}
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >&times;</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {step === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div className="film-spinner" />
            </div>
          )}

          {step === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Previous Analyses ({savedAnalyses.length})</p>
                <button onClick={() => setStep('pre')} style={{
                  fontSize: 12, padding: '7px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid rgba(var(--primary-rgb),0.3)', background: 'rgba(var(--primary-rgb),0.12)',
                  color: 'var(--primary)', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.12)'}
                >+ New Analysis</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedAnalyses.map(sa => (
                  <button key={sa.id} onClick={() => loadSavedAnalysis(sa)}
                    className="film-saved-analysis-btn"
                    style={{
                      width: '100%', textAlign: 'left', padding: 14, borderRadius: 14,
                      border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
                      cursor: 'pointer', transition: 'all 0.25s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.4)'; e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--glass-input-bg)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'white', textTransform: 'capitalize' }}>{sa.focus || 'General'} Analysis</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(sa.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{sa.analysis.slice(0, 150)}...</p>
                    {sa.chat_history?.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--primary)', marginTop: 6, display: 'inline-block' }}>{sa.chat_history.length} follow-up messages</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(step === 'pre') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {savedAnalyses.length > 0 && (
                <button onClick={() => setStep('history')}
                  style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >&larr; View previous analyses ({savedAnalyses.length})</button>
              )}
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12, fontSize: 13,
                  border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171',
                }}>{error}</div>
              )}

              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 10 }}>What&apos;s the focus?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['offense', 'Offense'], ['defense', 'Defense'], ['both', 'Both']].map(([val, label]) => (
                    <button key={val} onClick={() => setFocus(val)} style={glassBtn(focus === val)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                    Focus on a specific player? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                  </p>
                  {!detectedPlayers.length && frameUrl && (
                    <button onClick={detectPlayers} disabled={detecting}
                      style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', opacity: detecting ? 0.5 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >{detecting ? 'Detecting...' : 'Auto-detect players'}</button>
                  )}
                </div>

                {frameUrl ? (
                  <div ref={frameRef} onClick={handleFrameClick} style={{
                    position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'crosshair',
                    border: '1px solid var(--glass-border)',
                  }}>
                    <img src={frameUrl} alt="Film frame" style={{ width: '100%', objectFit: 'contain', maxHeight: 220, display: 'block' }} />

                    {detectedPlayers.map(p => (
                      <button key={p.id} onClick={e => { e.stopPropagation(); setPlayerFocus({ x: p.x, y: p.y }); }}
                        style={{
                          position: 'absolute', borderRadius: '50%', border: '2px solid',
                          transition: 'all 0.2s', cursor: 'pointer',
                          left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 32, height: 32, background: 'none', padding: 0,
                          backgroundColor: playerFocus?.x === p.x ? 'rgba(var(--primary-rgb),0.5)' : 'rgba(0,0,0,0.5)',
                          borderColor: p.team === 'offense' ? 'white' : '#ef4444',
                        }} />
                    ))}

                    {playerFocus && !detectedPlayers.length && (
                      <div style={{
                        position: 'absolute', pointerEvents: 'none',
                        left: `${playerFocus.x * 100}%`, top: `${playerFocus.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: '2px solid #facc15', background: 'rgba(250,204,21,0.3)',
                        }} />
                      </div>
                    )}

                    <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)',
                        padding: '3px 10px', borderRadius: 8, backdropFilter: 'blur(4px)',
                      }}>
                        {playerFocus ? 'Player selected — click elsewhere to change' : 'Click on a player to focus on them'}
                      </span>
                    </div>
                  </div>
                ) : frameLoading ? (
                  <div style={{
                    borderRadius: 14, border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
                    height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontSize: 13,
                  }}>Loading frame...</div>
                ) : (
                  <div style={{
                    borderRadius: 14, border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
                    height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontSize: 12,
                  }}>No preview available</div>
                )}

                {playerFocus && (
                  <button onClick={() => { setPlayerFocus(null); setDetectedPlayers([]); }}
                    style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'white'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >Clear player focus &times;</button>
                )}
              </div>

              {/* Personalize toggle */}
              <button onClick={() => setShowPrefs(!showPrefs)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13,
                  color: customInstructions ? 'var(--primary-light)' : 'rgba(255,255,255,0.4)',
                  background: showPrefs ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${showPrefs ? 'rgba(var(--primary-rgb),0.25)' : 'rgba(255,255,255,0.06)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.08)'; e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = showPrefs ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = showPrefs ? 'rgba(var(--primary-rgb),0.25)' : 'rgba(255,255,255,0.06)'; }}
              >
                <span style={{ fontSize: 16 }}>{showPrefs ? '\u25BC' : '\u25B6'}</span>
                Personalize AI Analysis
                {customInstructions && <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>Active</span>}
              </button>

              {showPrefs && (
                <div style={{
                  padding: 14, borderRadius: 14,
                  border: '1px solid rgba(var(--primary-rgb),0.15)',
                  background: 'rgba(var(--primary-rgb),0.04)',
                }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10, lineHeight: 1.5 }}>
                    Tell the AI what to focus on. This applies to all your future analyses.
                  </p>
                  <textarea
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    placeholder="e.g., Focus on pick-and-roll defense. Analyze help-side rotations and closeout technique. Pay attention to transition offense and fast break decisions."
                    maxLength={2000}
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                      color: '#fff', fontSize: 13, lineHeight: 1.5, resize: 'vertical',
                      outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{customInstructions.length}/2000</span>
                    <button onClick={savePreferences}
                      disabled={prefsSaving}
                      style={{
                        padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                        color: '#fff', background: prefsSaved ? '#4ade80' : 'rgba(var(--primary-rgb),0.8)',
                        border: 'none', cursor: prefsSaving ? 'not-allowed' : 'pointer',
                        opacity: prefsSaving ? 0.6 : 1, transition: 'all 0.2s',
                      }}
                    >{prefsSaving ? 'Saving...' : prefsSaved ? 'Saved!' : 'Save'}</button>
                  </div>
                </div>
              )}

              <button onClick={analyzeFilm} style={{
                width: '100%', padding: '13px 0', borderRadius: 14, fontWeight: 800, fontSize: 14,
                color: 'white', cursor: 'pointer', border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light, #f08050))',
                boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.3)',
                transition: 'all 0.25s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(var(--primary-rgb),0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--primary-rgb),0.3)'; }}
              >Analyze Film</button>
            </div>
          )}

          {step === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 16 }}>
              <div className="film-spinner" />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Analyzing your film...</p>
            </div>
          )}

          {step === 'done' && (
            <>
              {savedAnalyses.length > 0 && (
                <button onClick={() => setStep('history')}
                  style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >&larr; View all analyses ({savedAnalyses.length})</button>
              )}

              {/* Analysis results in a glass card */}
              <div style={{
                padding: 16, borderRadius: 14, background: 'var(--glass-input-bg)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{renderText(analysis)}</div>
              </div>

              {/* Chat history */}
              {chatHistory.length > 0 && (
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%', padding: '10px 16px', borderRadius: 18, fontSize: 13, lineHeight: 1.6,
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, var(--primary), var(--primary-light, #f08050))'
                          : 'var(--glass-input-bg)',
                        color: 'white',
                        border: msg.role === 'assistant' ? '1px solid var(--glass-border)' : 'none',
                        borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                        borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 18,
                        boxShadow: msg.role === 'user' ? '0 4px 16px rgba(var(--primary-rgb),0.2)' : 'none',
                      }}>
                        {msg.role === 'assistant' ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{renderText(msg.content)}</div> : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        padding: '10px 16px', borderRadius: 18, fontSize: 13, color: 'var(--text-muted)',
                        background: 'var(--glass-input-bg)', border: '1px solid var(--glass-border)',
                        borderBottomLeftRadius: 4,
                      }}>Thinking...</div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Chat input bar */}
        {step === 'done' && (
          <form onSubmit={handleChatSend} style={{
            padding: '14px 20px', borderTop: '1px solid var(--glass-border)',
            display: 'flex', gap: 10, flexShrink: 0, background: 'rgba(0,0,0,0.15)',
          }}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question about this film..."
              disabled={chatLoading}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 14,
                border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
                color: 'white', fontSize: 13, outline: 'none',
                opacity: chatLoading ? 0.5 : 1, transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.4)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
            />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: '10px 18px', borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                border: 'none', color: 'white', opacity: (chatLoading || !chatInput.trim()) ? 0.4 : 1,
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light, #f08050))',
                transition: 'all 0.2s', flexShrink: 0,
              }}>Ask</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main Trainer Film Room Page ──────────────────────────────────────────────
export default function TrainerFilmRoomPage() {
  const [media, setMedia] = useState([]);
  const [allMedia, setAllMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingMedia, setAnalyzingMedia] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('file');
  const [form, setForm] = useState({ title: '', description: '', url: '', media_type: 'video', tags: [] });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const searchTimerRef = useRef(null);

  // Editing tags
  const [editingTagsFor, setEditingTagsFor] = useState(null);
  const [editTags, setEditTags] = useState([]);

  useEffect(() => {
    loadMedia();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tags = new Set();
    allMedia.forEach(m => (m.tags || []).forEach(t => tags.add(t)));
    setAllTags([...tags].sort());
  }, [allMedia]);

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
      const res = await apiFetch('/trainer-media');
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
      const res = await apiFetch(`/trainer-media${qs ? `?${qs}` : ''}`);
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

      const res = await apiFetch('/trainer-media', {
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
      await apiFetch(`/trainer-media/${m.id}`, { method: 'DELETE' });
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
      const res = await apiFetch(`/trainer-media/${mediaId}/tags`, {
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

  const isTrainerUpload = (m) => m.user_email === localStorage.getItem('email');
  const hasFilters = searchQuery.trim() || activeTagFilters.length > 0;

  const inputStyle = {
    width: '100%', padding: '10px 16px', borderRadius: 12,
    border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
    color: 'white', fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
  };

  return (
    <>
      <style>{`
        :root {
          --primary: #e85d26;
          --primary-light: #f08050;
          --primary-rgb: 232,93,38;
          --bg-dark: #0f0f1a;
          --glass-bg: rgba(255,255,255,0.03);
          --glass-border: rgba(255,255,255,0.06);
          --glass-input-bg: rgba(255,255,255,0.04);
          --glass-hover: rgba(255,255,255,0.06);
          --text-primary: #ffffff;
          --text-secondary: rgba(255,255,255,0.6);
          --text-muted: rgba(255,255,255,0.3);
          --success: #4ade80;
          --danger: #ef4444;
        }
        @keyframes gradientLine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes filmCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .film-spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 2px solid rgba(var(--primary-rgb),0.2);
          border-top-color: var(--primary);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .film-media-card {
          animation: filmCardIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        .film-media-card:hover {
          border-color: rgba(var(--primary-rgb),0.3) !important;
          box-shadow: 0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(var(--primary-rgb),0.1) !important;
          transform: translateY(-2px) !important;
        }
        .film-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 1024px) { .film-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .film-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div>
        {analyzingMedia && (
          <AnalysisModal media={analyzingMedia} onClose={() => setAnalyzingMedia(null)} />
        )}

        {editingTagsFor && (
          <Modal title="Edit Tags" onClose={() => setEditingTagsFor(null)}>
            <TagInput tags={editTags} onChange={setEditTags} />
            <div style={{ display: 'flex', gap: 12, paddingTop: 20 }}>
              <button type="button" onClick={() => setEditingTagsFor(null)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
                  color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >Cancel</button>
              <button onClick={() => saveEditedTags(editingTagsFor)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                  color: 'white', cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >Save Tags</button>
            </div>
          </Modal>
        )}

        {/* Page Header */}
        <div style={{
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Film Room</h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>Upload and analyze film from you and your players</p>
            </div>
            <button
              onClick={() => { setShowModal(true); resetModal(); }}
              style={{
                padding: '10px 22px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                color: 'white', cursor: 'pointer', border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.25)',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(var(--primary-rgb),0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--primary-rgb),0.25)'; }}
            >+ Add Film</button>
          </div>
          {/* Animated gradient line */}
          <div style={{
            height: 2, borderRadius: 2, marginTop: 4,
            background: 'linear-gradient(90deg, var(--primary), #f08050, #3b82f6, var(--primary))',
            backgroundSize: '300% 100%',
            animation: 'gradientLine 4s ease infinite',
            opacity: 0.6,
          }} />
        </div>

        {/* Search & Filter Bar */}
        {!loading && allMedia.length > 0 && (
          <GlassCard style={{
            marginBottom: 24, padding: 20,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: allTags.length > 0 ? 14 : 0 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or tags..."
                  style={{
                    ...inputStyle, paddingLeft: 42,
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                />
              </div>
              {hasFilters && (
                <button onClick={clearFilters}
                  style={{
                    fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >Clear filters</button>
              )}
            </div>
            {allTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allTags.map(tag => {
                  const active = activeTagFilters.includes(tag);
                  return (
                    <button key={tag} onClick={() => toggleTagFilter(tag)}
                      style={{
                        fontSize: 12, padding: '5px 14px', borderRadius: 20, fontWeight: 600, cursor: 'pointer',
                        border: active ? '1px solid rgba(var(--primary-rgb),0.4)' : '1px solid var(--glass-border)',
                        background: active ? 'rgba(var(--primary-rgb),0.15)' : 'var(--glass-input-bg)',
                        color: active ? 'var(--primary)' : 'var(--text-secondary)',
                        transition: 'all 0.25s ease',
                      }}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <div className="film-spinner" />
          </div>
        ) : media.length === 0 ? (
          <GlassCard style={{
            padding: 48, textAlign: 'center',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
            transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}>
            {hasFilters ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8 }}>No results</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>No film matches your search or filters.</p>
                <button onClick={clearFilters} style={{
                  padding: '11px 28px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                  color: 'white', cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  transition: 'all 0.2s',
                }}>Clear Filters</button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8 }}>No film yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>Upload game film, practice clips, or highlight reels.</p>
                <button onClick={() => { setShowModal(true); resetModal(); }} style={{
                  padding: '11px 28px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                  color: 'white', cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  transition: 'all 0.2s',
                }}>Upload First Clip</button>
              </>
            )}
          </GlassCard>
        ) : (
          <div className="film-grid">
            {media.map((m, idx) => {
              const embedUrl = isYouTube(m.url) ? getYouTubeEmbed(m.url) : null;
              const isVideo = isSupabaseVideo(m.url);
              const isImage = isSupabaseImage(m.url);
              const playerName = !isTrainerUpload(m) ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : '';
              return (
                <div key={m.id} className="film-media-card" style={{
                  borderRadius: 20, overflow: 'hidden',
                  background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--glass-border)',
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  animationDelay: `${idx * 0.05}s`,
                }}>
                  {/* Thumbnail */}
                  <div style={{
                    aspectRatio: '16/9', background: 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {embedUrl ? (
                      <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : isVideo ? (
                      <video src={m.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : isImage ? (
                      <img src={m.url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : m.thumbnail_url ? (
                      <img src={m.thumbnail_url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
                        </svg>
                        <a href={m.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >Open Link</a>
                      </div>
                    )}
                  </div>

                  {/* Card info */}
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontWeight: 700, color: 'white', fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title || 'Untitled'}
                    </h3>
                    {m.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {m.description}
                      </p>
                    )}
                    {playerName && (
                      <p style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 8, fontWeight: 600 }}>{playerName}</p>
                    )}

                    {/* Tags */}
                    {m.tags?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                        {m.tags.map(tag => (
                          <span key={tag} style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                            background: 'rgba(var(--primary-rgb),0.1)', color: 'rgba(var(--primary-rgb),0.8)',
                            border: '1px solid rgba(var(--primary-rgb),0.15)',
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString()}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setEditingTagsFor(m.id); setEditTags(m.tags || []); }}
                          style={{
                            fontSize: 11, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                            border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
                            color: 'var(--text-secondary)', transition: 'all 0.2s', fontWeight: 600,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'white'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          title="Edit tags"
                        >Tags</button>

                        {(isSupabaseImage(m.url) || isSupabaseVideo(m.url)) && (
                          <button
                            onClick={() => setAnalyzingMedia(m)}
                            style={{
                              fontSize: 11, padding: '5px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                              border: '1px solid rgba(var(--primary-rgb),0.3)',
                              background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.1)'; }}
                          >Analyze</button>
                        )}

                        {isTrainerUpload(m) && (
                          <button onClick={() => handleDelete(m)} disabled={deleteLoading === m.id}
                            style={{
                              fontSize: 11, padding: '5px 12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                              border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)',
                              color: '#f87171', transition: 'all 0.2s',
                              opacity: deleteLoading === m.id ? 0.5 : 1,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                          >Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showModal && (
          <Modal title="Add Film" onClose={() => { setShowModal(false); resetModal(); }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['file', 'url'].map((mode) => {
                const active = uploadMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setUploadMode(mode); resetModal(); }}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      border: active ? '1px solid rgba(var(--primary-rgb),0.4)' : '1px solid var(--glass-border)',
                      background: active ? 'rgba(var(--primary-rgb),0.15)' : 'var(--glass-input-bg)',
                      color: active ? 'var(--primary)' : 'var(--text-muted)',
                      transition: 'all 0.25s',
                    }}
                  >
                    {mode === 'file' ? 'Upload File' : 'Paste URL'}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12, fontSize: 13,
                  border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171',
                }}>{formError}</div>
              )}

              {uploadMode === 'file' ? (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>File *</label>
                  <div
                    ref={dropRef}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--glass-border)', borderRadius: 16, padding: 24,
                      textAlign: 'center', cursor: 'pointer', background: 'var(--glass-input-bg)',
                      transition: 'all 0.25s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  >
                    {file ? (
                      <div>
                        {filePreview
                          ? <img src={filePreview} alt="preview" style={{ width: '100%', height: 128, objectFit: 'contain', marginBottom: 8, borderRadius: 8 }} />
                          : <div style={{ marginBottom: 8 }}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
                              </svg>
                            </div>
                        }
                        <p style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{file.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Drop file here or click to browse</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>MP4, MOV, JPG, PNG -- Max 100MB</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="video/*,image/*" style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(e.target.files[0])} />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>URL *</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... or direct link"
                    required
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>YouTube links embed automatically</p>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Shooting Form - Practice 3/17"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Notes about this clip..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                />
              </div>

              <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />

              <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                <button type="button" onClick={() => { setShowModal(false); resetModal(); }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12, cursor: 'pointer',
                    border: '1px solid var(--glass-border)', background: 'var(--glass-input-bg)',
                    color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >Cancel</button>
                <button type="submit" disabled={uploading}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                    color: 'white', cursor: 'pointer', border: 'none',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    opacity: uploading ? 0.5 : 1, transition: 'all 0.2s',
                  }}
                >{uploading ? (uploadProgress || 'Uploading...') : 'Add Film'}</button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  );
}
