'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/api';

const CW = 560;
const CH = 440;
const CX = CW / 2;

// Court geometry
const M = 15; // margin
const COURT_B = CH - M;
const BASKET_Y = COURT_B - 46;
const KEY_W = 144;
const KEY_H = 172;
const FT_Y = COURT_B - KEY_H;
const FT_R = KEY_W / 2;
const THREE_R = 210;
const CORNER_X_DIST = 190; // horizontal dist from center to corner 3pt line
const CORNER_TOP_Y = BASKET_Y - Math.sqrt(THREE_R ** 2 - CORNER_X_DIST ** 2);
const THREE_START = Math.atan2(CORNER_TOP_Y - BASKET_Y, -CORNER_X_DIST);
const THREE_END = Math.atan2(CORNER_TOP_Y - BASKET_Y, CORNER_X_DIST);

const PLAYER_R = 17;

function drawCourt(ctx) {
  // Background
  ctx.fillStyle = '#1a5c2a';
  ctx.fillRect(0, 0, CW, CH);

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Court boundary
  ctx.strokeRect(M, M, CW - M * 2, CH - M * 2);

  // Key / paint
  ctx.strokeRect(CX - KEY_W / 2, FT_Y, KEY_W, KEY_H);

  // Free throw circle
  ctx.beginPath();
  ctx.arc(CX, FT_Y, FT_R, 0, Math.PI, true);
  ctx.stroke();
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(CX, FT_Y, FT_R, 0, Math.PI, false);
  ctx.stroke();
  ctx.setLineDash([]);

  // Restricted area arc
  ctx.beginPath();
  ctx.arc(CX, BASKET_Y, 38, Math.PI, 0);
  ctx.stroke();

  // Backboard
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - 26, COURT_B - 12);
  ctx.lineTo(CX + 26, COURT_B - 12);
  ctx.stroke();
  ctx.lineWidth = 1.5;

  // Basket (hoop)
  ctx.beginPath();
  ctx.arc(CX, BASKET_Y, 11, 0, Math.PI * 2);
  ctx.stroke();

  // Three-point corner lines
  ctx.beginPath();
  ctx.moveTo(CX - CORNER_X_DIST, COURT_B);
  ctx.lineTo(CX - CORNER_X_DIST, CORNER_TOP_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX + CORNER_X_DIST, COURT_B);
  ctx.lineTo(CX + CORNER_X_DIST, CORNER_TOP_Y);
  ctx.stroke();

  // Three-point arc (from left corner to right corner through top)
  ctx.beginPath();
  ctx.arc(CX, BASKET_Y, THREE_R, THREE_START, THREE_END, false);
  ctx.stroke();
}

function drawArrowhead(ctx, x1, y1, x2, y2, size = 11) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45));
  ctx.lineTo(x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

function drawLine(ctx, line, preview = false) {
  const { type, x1, y1, x2, y2 } = line;
  ctx.save();
  ctx.lineWidth = type === 'drive' ? 2.5 : 2;
  ctx.strokeStyle = preview ? 'rgba(255,255,255,0.5)' : 'white';
  ctx.fillStyle = preview ? 'rgba(255,255,255,0.5)' : 'white';

  if (type === 'pass') {
    ctx.setLineDash([8, 5]);
  } else if (type === 'drive') {
    ctx.setLineDash([]);
    // Draw wavy line
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perp = angle + Math.PI / 2;
    const waves = Math.max(3, Math.floor(dist / 18));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i <= waves * 2; i++) {
      const t = i / (waves * 2);
      const mx = x1 + (x2 - x1) * t;
      const my = y1 + (y2 - y1) * t;
      const amp = (i % 2 === 0 ? 1 : -1) * 5;
      ctx.lineTo(mx + Math.cos(perp) * amp, my + Math.sin(perp) * amp);
    }
    ctx.stroke();
    if (!preview) drawArrowhead(ctx, x1, y1, x2, y2);
    ctx.restore();
    return;
  } else {
    ctx.setLineDash([]);
  }

  // Shorten end so arrowhead doesn't overlap player circle
  const dist2 = Math.hypot(x2 - x1, y2 - y1);
  const ratio = dist2 > PLAYER_R ? (dist2 - PLAYER_R + 2) / dist2 : 1;
  const ex = x1 + (x2 - x1) * ratio;
  const ey = y1 + (y2 - y1) * ratio;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!preview) drawArrowhead(ctx, x1, y1, ex, ey);
  ctx.restore();
}

function drawScreenSymbol(ctx, scr, preview = false) {
  const { x, y, angle } = scr;
  const len = 18;
  ctx.save();
  ctx.strokeStyle = preview ? 'rgba(255,255,255,0.5)' : 'white';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const perp = angle + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(perp) * len, y + Math.sin(perp) * len);
  ctx.lineTo(x - Math.cos(perp) * len, y - Math.sin(perp) * len);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(ctx, p, selected = false) {
  const { type, x, y, label } = p;
  const isOff = type === 'offense';

  ctx.save();
  if (selected) {
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10;
  }

  if (isOff) {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  } else {
    // Defense: red X
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const s = PLAYER_R - 4;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + PLAYER_R + 10);
  }
  ctx.restore();
}

function hitPlayer(px, py, players) {
  return players.find(p => Math.hypot(p.x - px, p.y - py) <= PLAYER_R + 4);
}

function hitLine(px, py, lines) {
  return lines.find(l => {
    const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return false;
    const t = Math.max(0, Math.min(1, ((px - l.x1) * dx + (py - l.y1) * dy) / (len * len)));
    const cx = l.x1 + t * dx, cy = l.y1 + t * dy;
    return Math.hypot(px - cx, py - cy) < 8;
  });
}

function hitScreen(px, py, screens) {
  return screens.find(s => Math.hypot(s.x - px, s.y - py) <= 20);
}

const TOOLS = [
  { id: 'select', icon: '↖', label: 'Select / Move' },
  { id: 'offense', icon: 'O', label: 'Offense Player', color: 'white' },
  { id: 'defense', icon: 'X', label: 'Defense Player', color: '#ef4444' },
  { id: 'cut', icon: '→', label: 'Cut (movement)' },
  { id: 'pass', icon: '⇢', label: 'Pass (dashed)' },
  { id: 'drive', icon: '⟿', label: 'Drive (wavy)' },
  { id: 'screen', icon: '⊥', label: 'Screen' },
  { id: 'erase', icon: '✕', label: 'Erase' },
];

function AnalysisModal({ canvasPng, playName, onClose }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { analyze(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  async function analyze() {
    setLoading(true);
    try {
      const res = await apiFetch('/ai/analyze-play', {
        method: 'POST',
        body: JSON.stringify({ canvas_png: canvasPng, name: playName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysis(`Error: ${err.message}`);
    }
    setLoading(false);
  }

  async function handleChat(e) {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    const msg = input.trim();
    setInput('');
    setChatLoading(true);
    const newHistory = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    try {
      const historyForApi = [{ role: 'assistant', content: analysis }, ...chatHistory];
      const res = await apiFetch('/ai/film-chat', {
        method: 'POST',
        body: JSON.stringify({ base64_frame: canvasPng, history: historyForApi, message: msg }),
      });
      const data = await res.json();
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply || data.error }]);
    } catch {
      setChatHistory([...newHistory, { role: 'assistant', content: 'Something went wrong.' }]);
    }
    setChatLoading(false);
  }

  function renderText(text) {
    return (text || '').split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return <h3 key={i} className="text-sm font-black text-white uppercase tracking-wide mt-3 mb-1">{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('• '))
        return <li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{line.slice(2)}</li>;
      if (!line.trim()) return null;
      return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 flex flex-col max-h-[90vh]" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-black text-white">AI Play Analysis</h2>
            {playName && <p className="text-xs text-gray-500">{playName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Analyzing play...</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">{renderText(analysis)}</div>
              {chatHistory.length > 0 && (
                <div className="border-t border-gray-700 pt-4 space-y-3">
                  {chatHistory.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-xs px-4 py-2.5 rounded-2xl text-sm"
                        style={{ backgroundColor: m.role === 'user' ? '#2563eb' : '#16213e', color: 'white',
                          borderBottomRightRadius: m.role === 'user' ? 4 : undefined,
                          borderBottomLeftRadius: m.role === 'assistant' ? 4 : undefined }}>
                        {m.role === 'assistant' ? <div className="space-y-1">{renderText(m.content)}</div> : m.content}
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
        {!loading && (
          <form onSubmit={handleChat} className="px-4 py-3 border-t border-gray-700 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} disabled={chatLoading}
              placeholder="Ask about this play..."
              className="flex-1 px-4 py-2 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
              style={{ backgroundColor: '#16213e' }} />
            <button type="submit" disabled={chatLoading || !input.trim()}
              className="px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ backgroundColor: '#2563eb' }}>Ask</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PlaybookPage() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [players, setPlayers] = useState([]);
  const [lines, setLines] = useState([]);
  const [screens, setScreens] = useState([]);
  const [selected, setSelected] = useState(null); // { type: 'player'|'line'|'screen', id }
  const [drawingLine, setDrawingLine] = useState(null); // { x1, y1 }
  const [mousePos, setMousePos] = useState(null);
  const [dragging, setDragging] = useState(null);

  const [savedPlays, setSavedPlays] = useState([]);
  const [playName, setPlayName] = useState('Untitled Play');
  const [currentPlayId, setCurrentPlayId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [analysisModal, setAnalysisModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const nextId = useRef(1);
  function uid() { return nextId.current++; }

  // Load saved plays
  useEffect(() => {
    apiFetch('/plays').then(r => r.json()).then(setSavedPlays).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);
    drawCourt(ctx);

    lines.forEach(l => {
      const isSelected = selected?.type === 'line' && selected.id === l.id;
      if (isSelected) { ctx.save(); ctx.shadowColor = '#facc15'; ctx.shadowBlur = 8; }
      drawLine(ctx, l);
      if (isSelected) ctx.restore();
    });

    screens.forEach(s => {
      const isSelected = selected?.type === 'screen' && selected.id === s.id;
      if (isSelected) { ctx.save(); ctx.shadowColor = '#facc15'; ctx.shadowBlur = 8; }
      drawScreenSymbol(ctx, s);
      if (isSelected) ctx.restore();
    });

    players.forEach(p => drawPlayer(ctx, p, selected?.type === 'player' && selected.id === p.id));

    // Preview while drawing
    if (drawingLine && mousePos) {
      drawLine(ctx, { type: tool, x1: drawingLine.x1, y1: drawingLine.y1, x2: mousePos.x, y2: mousePos.y }, true);
    }
    if (tool === 'screen' && mousePos) {
      drawScreenSymbol(ctx, { x: mousePos.x, y: mousePos.y, angle: 0 }, true);
    }
  }, [players, lines, screens, selected, drawingLine, mousePos, tool]);

  function getCanvasPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handleMouseDown(e) {
    const pos = getCanvasPos(e);

    if (tool === 'select') {
      const p = hitPlayer(pos.x, pos.y, players);
      const l = !p && hitLine(pos.x, pos.y, lines);
      const s = !p && !l && hitScreen(pos.x, pos.y, screens);
      if (p) { setSelected({ type: 'player', id: p.id }); setDragging({ type: 'player', id: p.id, ox: pos.x - p.x, oy: pos.y - p.y }); }
      else if (l) setSelected({ type: 'line', id: l.id });
      else if (s) { setSelected({ type: 'screen', id: s.id }); setDragging({ type: 'screen', id: s.id, ox: pos.x - s.x, oy: pos.y - s.y }); }
      else setSelected(null);
      return;
    }

    if (tool === 'erase') {
      const p = hitPlayer(pos.x, pos.y, players);
      if (p) { setPlayers(prev => prev.filter(x => x.id !== p.id)); return; }
      const l = hitLine(pos.x, pos.y, lines);
      if (l) { setLines(prev => prev.filter(x => x.id !== l.id)); return; }
      const s = hitScreen(pos.x, pos.y, screens);
      if (s) { setScreens(prev => prev.filter(x => x.id !== s.id)); }
      return;
    }

    if (tool === 'offense' || tool === 'defense') {
      const count = players.filter(p => p.type === tool).length;
      const labels = ['1', '2', '3', '4', '5'];
      const label = labels[count % 5];
      setPlayers(prev => [...prev, { id: uid(), type: tool, x: pos.x, y: pos.y, label }]);
      return;
    }

    if (tool === 'screen') {
      setScreens(prev => [...prev, { id: uid(), x: pos.x, y: pos.y, angle: 0 }]);
      return;
    }

    if (['cut', 'pass', 'drive'].includes(tool)) {
      setDrawingLine({ x1: pos.x, y1: pos.y });
    }
  }

  function handleMouseMove(e) {
    const pos = getCanvasPos(e);
    setMousePos(pos);

    if (dragging) {
      if (dragging.type === 'player') {
        setPlayers(prev => prev.map(p => p.id === dragging.id ? { ...p, x: pos.x - dragging.ox, y: pos.y - dragging.oy } : p));
      }
      if (dragging.type === 'screen') {
        setScreens(prev => prev.map(s => s.id === dragging.id ? { ...s, x: pos.x - dragging.ox, y: pos.y - dragging.oy } : s));
      }
    }
  }

  function handleMouseUp(e) {
    const pos = getCanvasPos(e);
    if (drawingLine) {
      const dx = pos.x - drawingLine.x1, dy = pos.y - drawingLine.y1;
      if (Math.hypot(dx, dy) > 15) {
        setLines(prev => [...prev, { id: uid(), type: tool, x1: drawingLine.x1, y1: drawingLine.y1, x2: pos.x, y2: pos.y }]);
      }
      setDrawingLine(null);
    }
    setDragging(null);
  }

  function clearCanvas() {
    setPlayers([]); setLines([]); setScreens([]); setSelected(null);
    setCurrentPlayId(null); setPlayName('Untitled Play');
  }

  function loadPlay(play) {
    try {
      const data = JSON.parse(play.canvas_json);
      setPlayers(data.players || []);
      setLines(data.lines || []);
      setScreens(data.screens || []);
      setCurrentPlayId(play.id);
      setPlayName(play.name);
      setSelected(null);
    } catch {}
  }

  async function savePlay() {
    setSaving(true);
    const canvas_json = JSON.stringify({ players, lines, screens });
    try {
      if (currentPlayId) {
        const res = await apiFetch(`/plays/${currentPlayId}`, { method: 'PUT', body: JSON.stringify({ name: playName, canvas_json }) });
        const updated = await res.json();
        setSavedPlays(prev => prev.map(p => p.id === currentPlayId ? updated : p));
      } else {
        const res = await apiFetch('/plays', { method: 'POST', body: JSON.stringify({ name: playName, canvas_json }) });
        const created = await res.json();
        setSavedPlays(prev => [created, ...prev]);
        setCurrentPlayId(created.id);
      }
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch { setSaveMsg('Save failed'); }
    setSaving(false);
  }

  async function deletePlay(id) {
    if (!confirm('Delete this play?')) return;
    await apiFetch(`/plays/${id}`, { method: 'DELETE' });
    setSavedPlays(prev => prev.filter(p => p.id !== id));
    if (currentPlayId === id) clearCanvas();
  }

  function openAnalysis() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const png = canvas.toDataURL('image/png').split(',')[1];
    setAnalysisModal({ png, name: playName });
  }

  return (
    <div>
      {analysisModal && (
        <AnalysisModal
          canvasPng={analysisModal.png}
          playName={analysisModal.name}
          onClose={() => setAnalysisModal(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Playbook</h1>
        <p className="text-gray-400 mt-1">Draw up plays and get AI analysis</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Toolbar */}
        <div className="flex-shrink-0 flex flex-col gap-1 rounded-xl border border-gray-800 p-2" style={{ backgroundColor: '#1e1e30' }}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); setDrawingLine(null); }}
              title={t.label}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
              style={{
                backgroundColor: tool === t.id ? '#2563eb' : 'transparent',
                color: tool === t.id ? 'white' : (t.color || '#9ca3af'),
                border: tool === t.id ? 'none' : '1px solid transparent',
              }}
            >
              {t.icon}
            </button>
          ))}
          <div className="border-t border-gray-700 my-1" />
          <button onClick={clearCanvas} title="Clear canvas" className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 text-sm">
            🗑
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1">
          {/* Play name + save */}
          <div className="flex items-center gap-3 mb-3">
            <input
              value={playName}
              onChange={e => setPlayName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
              style={{ backgroundColor: '#16213e' }}
              placeholder="Play name..."
            />
            <button onClick={savePlay} disabled={saving}
              className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: '#2563eb' }}>
              {saving ? 'Saving...' : saveMsg || 'Save'}
            </button>
            <button onClick={openAnalysis}
              className="px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90"
              style={{ backgroundColor: '#16a34a', color: 'white' }}>
              🤖 Analyze
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-white inline-block" /> Cut</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ borderTop: '1.5px dashed white' }} /> Pass</span>
            <span className="flex items-center gap-1"><span className="text-white">⟿</span> Drive</span>
            <span className="flex items-center gap-1"><span className="text-white">⊥</span> Screen</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full inline-block bg-white" /> Offense</span>
            <span className="flex items-center gap-1 text-red-400"><span>✕</span> Defense</span>
          </div>

          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setMousePos(null); if (drawingLine) setDrawingLine(null); setDragging(null); }}
            className="rounded-xl border border-gray-700 w-full"
            style={{ cursor: tool === 'select' ? 'default' : tool === 'erase' ? 'crosshair' : 'crosshair', maxWidth: CW }}
          />

          <p className="text-xs text-gray-600 mt-2">
            {tool === 'select' ? 'Click to select · Drag to move' :
             tool === 'offense' || tool === 'defense' ? 'Click to place player' :
             tool === 'screen' ? 'Click to place screen' :
             tool === 'erase' ? 'Click element to delete' :
             'Click and drag to draw'}
          </p>
        </div>

        {/* Saved plays */}
        <div className="w-52 flex-shrink-0 rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="font-black text-white text-sm">Saved Plays</h3>
          </div>
          <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="text-gray-500 text-xs text-center py-6">Loading...</p>
            ) : savedPlays.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-6 px-3">No plays saved yet.<br />Draw one and hit Save.</p>
            ) : savedPlays.map(play => (
              <div key={play.id} className={`px-3 py-3 hover:bg-white/5 transition-colors ${currentPlayId === play.id ? 'bg-white/5' : ''}`}>
                <button onClick={() => loadPlay(play)} className="w-full text-left">
                  <p className="text-sm font-semibold text-white truncate">{play.name}</p>
                  <p className="text-xs text-gray-600">{new Date(play.created_at).toLocaleDateString()}</p>
                </button>
                <button onClick={() => deletePlay(play.id)} className="text-xs text-red-500 hover:text-red-400 mt-1">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
