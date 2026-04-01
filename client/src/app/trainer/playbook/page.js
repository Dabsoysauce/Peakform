'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadPlayDiagram } from '../../lib/supabase';

// ============================================================
// CONSTANTS
// ============================================================

const COURT_W = 500;
const COURT_H = 470;
const PLAYER_R = 15;

const COURT_TYPES = {
  NBA: {
    label: 'NBA', basketY: 425, backboardY: 437, backboardHW: 30,
    keyX: 170, keyW: 160, keyH: 190, ftR: 60,
    threeR: 238, cornerX: 220, restrictedR: 40,
  },
  NCAA: {
    label: 'NCAA', basketY: 425, backboardY: 437, backboardHW: 30,
    keyX: 190, keyW: 120, keyH: 190, ftR: 60,
    threeR: 222, cornerX: 216, restrictedR: 40,
  },
  HighSchool: {
    label: 'High School', basketY: 425, backboardY: 437, backboardHW: 30,
    keyX: 190, keyW: 120, keyH: 190, ftR: 60,
    threeR: 198, cornerX: 190, restrictedR: 40,
  },
  FIBA: {
    label: 'FIBA', basketY: 425, backboardY: 437, backboardHW: 30,
    keyX: 170, keyW: 160, keyH: 190, ftR: 60,
    threeR: 225, cornerX: 219, restrictedR: 40,
  },
};

const COLOR_PRESETS = [
  { id: 1, bg: '#1a5c2a', lines: 'rgba(255,255,255,0.85)', label: 'Classic' },
  { id: 2, bg: '#1a365d', lines: 'rgba(255,255,255,0.85)', label: 'Navy' },
  { id: 3, bg: '#92400e', lines: 'rgba(255,255,255,0.85)', label: 'Hardwood' },
  { id: 4, bg: '#374151', lines: 'rgba(209,213,219,0.85)', label: 'Slate' },
  { id: 5, bg: '#111827', lines: 'rgba(156,163,175,0.7)', label: 'Dark' },
];

const TOOL_GROUPS = [
  { label: 'General', tools: [
    { id: 'select', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>), tip: 'Select / Move' },
    { id: 'erase', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>), tip: 'Erase' },
  ]},
  { label: 'Players', tools: [
    { id: 'offense', icon: 'O', tip: 'Offense Player', color: '#ffffff' },
    { id: 'defense', icon: 'X', tip: 'Defense Player', color: '#ef4444' },
    { id: 'ball', icon: (<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="white" stroke="#333" strokeWidth="2.5"/><circle cx="12" cy="12" r="3" fill="#333"/></svg>), tip: 'Ball Handler' },
  ]},
  { label: 'Actions', tools: [
    { id: 'cut', icon: (<svg width="20" height="14" viewBox="0 0 20 14"><line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="2"/><polygon points="18,7 12,3 12,11" fill="currentColor"/></svg>), tip: 'Cut / Movement' },
    { id: 'pass', icon: (<svg width="20" height="14" viewBox="0 0 20 14"><line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2"/><polygon points="18,7 12,3 12,11" fill="currentColor"/></svg>), tip: 'Pass (dashed)' },
    { id: 'dribble', icon: (<svg width="20" height="14" viewBox="0 0 20 14"><path d="M2 7 Q5 2 8 7 Q11 12 14 7" stroke="currentColor" strokeWidth="2" fill="none"/><polygon points="18,7 12,3 12,11" fill="currentColor"/></svg>), tip: 'Dribble (zigzag)' },
    { id: 'screen', icon: (<svg width="16" height="16" viewBox="0 0 16 16"><line x1="8" y1="14" x2="8" y2="5" stroke="currentColor" strokeWidth="2"/><line x1="3" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>), tip: 'Screen' },
    { id: 'shot', icon: (<svg width="20" height="14" viewBox="0 0 20 14"><path d="M2 10 Q10 -2 18 10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="2 2"/></svg>), tip: 'Shot' },
  ]},
  { label: 'Annotate', tools: [
    { id: 'text', icon: 'T', tip: 'Text Label' },
  ]},
];

const ARROW_SUBTYPES = ['cut', 'pass', 'dribble', 'screen', 'shot'];
const PLAYER_TEAMS = ['offense', 'defense', 'ball'];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

let _idCounter = 1;
function uid() { return 'obj_' + (_idCounter++); }

function getSVGPoint(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

function arrowheadPoints(fromX, fromY, toX, toY, size = 10) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  return [
    [toX, toY],
    [toX - size * Math.cos(angle - 0.4), toY - size * Math.sin(angle - 0.4)],
    [toX - size * Math.cos(angle + 0.4), toY - size * Math.sin(angle + 0.4)],
  ];
}

function midControlPoint(x1, y1, x2, y2, offset = 30) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  return { x: mx + Math.cos(angle) * offset, y: my + Math.sin(angle) * offset };
}

function zigzagPath(x1, y1, x2, y2) {
  const d = dist(x1, y1, x2, y2);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perp = angle + Math.PI / 2;
  const waves = Math.max(3, Math.floor(d / 18));
  let path = `M ${x1} ${y1}`;
  for (let i = 1; i <= waves * 2; i++) {
    const t = i / (waves * 2);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    const amp = (i % 2 === 0 ? 1 : -1) * 5;
    path += ` L ${px + Math.cos(perp) * amp} ${py + Math.sin(perp) * amp}`;
  }
  return path;
}

function curvedZigzagPath(x1, y1, mx, my, x2, y2) {
  const steps = 30;
  let path = `M ${x1} ${y1}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const bx = (1-t)*(1-t)*x1 + 2*(1-t)*t*mx + t*t*x2;
    const by = (1-t)*(1-t)*y1 + 2*(1-t)*t*my + t*t*y2;
    const dt = 0.01;
    const t2 = Math.min(t + dt, 1);
    const bx2 = (1-t2)*(1-t2)*x1 + 2*(1-t2)*t2*mx + t2*t2*x2;
    const by2 = (1-t2)*(1-t2)*y1 + 2*(1-t2)*t2*my + t2*t2*y2;
    const angle = Math.atan2(by2 - by, bx2 - bx) + Math.PI / 2;
    const amp = (i % 2 === 0 ? 1 : -1) * 5;
    path += ` L ${bx + Math.cos(angle) * amp} ${by + Math.sin(angle) * amp}`;
  }
  return path;
}

function pointOnQuadBezier(x1, y1, mx, my, x2, y2, t) {
  return {
    x: (1-t)*(1-t)*x1 + 2*(1-t)*t*mx + t*t*x2,
    y: (1-t)*(1-t)*y1 + 2*(1-t)*t*my + t*t*y2,
  };
}

function hitTestPlayer(px, py, objects) {
  return objects.find(o => o.type === 'player' && dist(o.x, o.y, px, py) <= PLAYER_R + 4);
}

function hitTestArrow(px, py, objects) {
  return objects.find(o => {
    if (!ARROW_SUBTYPES.includes(o.type)) return false;
    if (o.shape === 1 && o.mx != null) {
      for (let t = 0; t <= 1; t += 0.05) {
        const pt = pointOnQuadBezier(o.x1, o.y1, o.mx, o.my, o.x2, o.y2, t);
        if (dist(px, py, pt.x, pt.y) < 8) return true;
      }
      return false;
    }
    const dx = o.x2 - o.x1, dy = o.y2 - o.y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return false;
    const t = Math.max(0, Math.min(1, ((px - o.x1) * dx + (py - o.y1) * dy) / (len * len)));
    return dist(px, py, o.x1 + t * dx, o.y1 + t * dy) < 8;
  });
}

function hitTestText(px, py, objects) {
  return objects.find(o => o.type === 'text' && px >= o.x - 5 && px <= o.x + (o.width || 80) + 5 && py >= o.y - (o.fontSize || 14) - 2 && py <= o.y + 5);
}

function hitTestControlPoint(px, py, objects, selectedId) {
  const obj = objects.find(o => o.id === selectedId);
  if (!obj || !ARROW_SUBTYPES.includes(obj.type) || obj.shape !== 1) return null;
  if (obj.mx != null && dist(px, py, obj.mx, obj.my) < 8) return { id: obj.id, point: 'control' };
  return null;
}

function migrateV1(data) {
  const objects = [];
  const scaleX = COURT_W / 560;
  const scaleY = COURT_H / 440;
  (data.players || []).forEach(p => {
    objects.push({
      id: uid(), type: 'player',
      team: p.type === 'offense' ? 'offense' : 'defense',
      number: p.label || '1',
      x: p.x * scaleX, y: p.y * scaleY,
      color: p.type === 'offense' ? '#ffffff' : '#ef4444',
    });
  });
  (data.lines || []).forEach(l => {
    objects.push({
      id: uid(), type: l.type || 'cut',
      x1: l.x1 * scaleX, y1: l.y1 * scaleY,
      x2: l.x2 * scaleX, y2: l.y2 * scaleY,
      shape: 0, color: '#ffffff', strokeType: l.type === 'pass' ? 'dashed' : 'solid',
      arrowhead: true, step: l.step || 0,
    });
  });
  (data.screens || []).forEach(s => {
    objects.push({
      id: uid(), type: 'screen',
      x1: s.x1 * scaleX, y1: s.y1 * scaleY,
      x2: s.x2 * scaleX, y2: s.y2 * scaleY,
      shape: 0, color: '#ffffff',
    });
  });
  return {
    v: 2,
    settings: { courtType: 'NBA', courtColor: COLOR_PRESETS[0] },
    phases: [{ id: uid(), title: '', objects, links: [] }],
  };
}

// ============================================================
// SVG COURT COMPONENT
// ============================================================

function CourtSVG({ courtType = 'NBA', colors, showGrid, gridSpacing = 5 }) {
  const c = COURT_TYPES[courtType] || COURT_TYPES.NBA;
  const cx = COURT_W / 2;
  const ftY = COURT_H - c.keyH;
  const cornerArcY = c.basketY - Math.sqrt(Math.max(0, c.threeR * c.threeR - c.cornerX * c.cornerX));
  const lineColor = colors?.lines || 'rgba(255,255,255,0.85)';
  const sw = 1.5;

  return (
    <g>
      {/* Court background */}
      <rect x={0} y={0} width={COURT_W} height={COURT_H} fill={colors?.bg || '#1a5c2a'} rx={4} />

      {/* Grid */}
      {showGrid && (
        <g stroke={lineColor} strokeWidth={0.3} opacity={0.15}>
          {Array.from({ length: Math.floor(COURT_W / (gridSpacing * 10)) + 1 }, (_, i) => (
            <line key={`gv${i}`} x1={i * gridSpacing * 10} y1={0} x2={i * gridSpacing * 10} y2={COURT_H} />
          ))}
          {Array.from({ length: Math.floor(COURT_H / (gridSpacing * 10)) + 1 }, (_, i) => (
            <line key={`gh${i}`} x1={0} y1={i * gridSpacing * 10} x2={COURT_W} y2={i * gridSpacing * 10} />
          ))}
        </g>
      )}

      <g stroke={lineColor} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Court boundary */}
        <rect x={0} y={0} width={COURT_W} height={COURT_H} rx={2} />

        {/* Half-court line */}
        <line x1={0} y1={0} x2={COURT_W} y2={0} strokeWidth={sw + 0.5} />

        {/* Center circle (bottom half) */}
        <path d={`M ${cx - 60} 0 A 60 60 0 0 1 ${cx + 60} 0`} />

        {/* Key / Paint */}
        <rect x={cx - c.keyW / 2} y={ftY} width={c.keyW} height={c.keyH} />

        {/* Free throw circle - solid top half */}
        <path d={`M ${cx - c.ftR} ${ftY} A ${c.ftR} ${c.ftR} 0 0 0 ${cx + c.ftR} ${ftY}`} />
        {/* Free throw circle - dashed bottom half */}
        <path d={`M ${cx - c.ftR} ${ftY} A ${c.ftR} ${c.ftR} 0 0 1 ${cx + c.ftR} ${ftY}`} strokeDasharray="6 5" />

        {/* Backboard */}
        <line x1={cx - c.backboardHW} y1={c.backboardY} x2={cx + c.backboardHW} y2={c.backboardY} strokeWidth={3} />

        {/* Basket / Rim */}
        <circle cx={cx} cy={c.basketY} r={9} />
        {/* Rim connector */}
        <line x1={cx} y1={c.backboardY} x2={cx} y2={c.basketY - 9} strokeWidth={1} />

        {/* Restricted area arc */}
        <path d={`M ${cx - c.restrictedR} ${COURT_H} A ${c.restrictedR} ${c.restrictedR} 0 0 1 ${cx + c.restrictedR} ${COURT_H}`} />

        {/* Three-point corner lines */}
        <line x1={cx - c.cornerX} y1={COURT_H} x2={cx - c.cornerX} y2={cornerArcY} />
        <line x1={cx + c.cornerX} y1={COURT_H} x2={cx + c.cornerX} y2={cornerArcY} />

        {/* Three-point arc */}
        <path d={`M ${cx - c.cornerX} ${cornerArcY} A ${c.threeR} ${c.threeR} 0 0 1 ${cx + c.cornerX} ${cornerArcY}`} />

        {/* Key hash marks */}
        {[1, 2, 3, 4].map(i => {
          const y = COURT_H - c.keyH + i * (c.keyH / 5);
          const kl = cx - c.keyW / 2;
          const kr = cx + c.keyW / 2;
          return (
            <g key={`hash${i}`}>
              <line x1={kl - 6} y1={y} x2={kl} y2={y} />
              <line x1={kr} y1={y} x2={kr + 6} y2={y} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

// ============================================================
// SVG OBJECT RENDERERS
// ============================================================

function renderPlayer(obj, isSelected, onMouseDown) {
  const { id, team, number, x, y, color } = obj;
  const selStroke = isSelected ? '#3b82f6' : 'transparent';
  const selWidth = isSelected ? 3 : 0;

  if (team === 'defense') {
    const s = PLAYER_R - 4;
    return (
      <g key={id} onMouseDown={e => onMouseDown(e, id)} style={{ cursor: 'pointer' }}>
        {isSelected && <circle cx={x} cy={y} r={PLAYER_R + 4} fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
        <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} stroke={color || '#ef4444'} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} stroke={color || '#ef4444'} strokeWidth={2.5} strokeLinecap="round" />
        <text x={x} y={y + PLAYER_R + 12} textAnchor="middle" fill={color || '#ef4444'} fontSize={11} fontWeight={700} style={{ userSelect: 'none' }}>{number}</text>
      </g>
    );
  }

  const isBall = team === 'ball';
  return (
    <g key={id} onMouseDown={e => onMouseDown(e, id)} style={{ cursor: 'pointer' }}>
      {isSelected && <circle cx={x} cy={y} r={PLAYER_R + 4} fill="none" stroke={selStroke} strokeWidth={selWidth} strokeDasharray="4 2" />}
      <circle cx={x} cy={y} r={PLAYER_R} fill={isBall ? (color || '#ffffff') : '#ffffff'} stroke={isBall ? '#374151' : '#333'} strokeWidth={isBall ? 2.5 : 2} />
      {isBall && <circle cx={x + 6} cy={y - 6} r={3.5} fill="none" stroke="#374151" strokeWidth={1.5} />}
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fill="#333" fontSize={isBall ? 11 : 12} fontWeight={700} style={{ userSelect: 'none' }}>{number}</text>
    </g>
  );
}

function renderArrow(obj, isSelected, onMouseDown, showControlPoint) {
  const { id, type, x1, y1, x2, y2, mx, my, shape, color = '#ffffff', strokeType = 'solid', arrowhead = true } = obj;
  const col = color;
  const sw = 2;
  const dash = strokeType === 'dashed' ? '8 5' : strokeType === 'dotted' ? '3 3' : undefined;

  let pathD, arrowFromX, arrowFromY;

  if (type === 'screen') {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perp = angle + Math.PI / 2;
    const barLen = 18;
    return (
      <g key={id} onMouseDown={e => onMouseDown(e, id)} style={{ cursor: 'pointer' }}>
        {isSelected && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth={6} opacity={0.3} strokeLinecap="round" />}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={sw} strokeLinecap="round" />
        <line
          x1={x2 + Math.cos(perp) * barLen} y1={y2 + Math.sin(perp) * barLen}
          x2={x2 - Math.cos(perp) * barLen} y2={y2 - Math.sin(perp) * barLen}
          stroke={col} strokeWidth={3} strokeLinecap="round"
        />
      </g>
    );
  }

  if (type === 'shot') {
    if (shape === 1 && mx != null) {
      pathD = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
      arrowFromX = mx; arrowFromY = my;
    } else {
      const cp = midControlPoint(x1, y1, x2, y2, -40);
      pathD = `M ${x1} ${y1} Q ${cp.x} ${cp.y} ${x2} ${y2}`;
      arrowFromX = cp.x; arrowFromY = cp.y;
    }
    return (
      <g key={id} onMouseDown={e => onMouseDown(e, id)} style={{ cursor: 'pointer' }}>
        {isSelected && <path d={pathD} stroke="#3b82f6" strokeWidth={6} fill="none" opacity={0.3} />}
        <path d={pathD} stroke={col} strokeWidth={sw} fill="none" strokeDasharray="4 4" strokeLinecap="round" />
      </g>
    );
  }

  const isCurved = shape === 1 && mx != null;

  if (type === 'dribble') {
    if (isCurved) {
      pathD = curvedZigzagPath(x1, y1, mx, my, x2, y2);
    } else {
      pathD = zigzagPath(x1, y1, x2, y2);
    }
    arrowFromX = isCurved ? mx : x1;
    arrowFromY = isCurved ? my : y1;
  } else if (isCurved) {
    pathD = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
    arrowFromX = mx; arrowFromY = my;
  } else {
    pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
    arrowFromX = x1; arrowFromY = y1;
  }

  const ah = arrowhead !== false ? arrowheadPoints(arrowFromX, arrowFromY, x2, y2, 10) : null;

  return (
    <g key={id} onMouseDown={e => onMouseDown(e, id)} style={{ cursor: 'pointer' }}>
      {isSelected && <path d={pathD} stroke="#3b82f6" strokeWidth={6} fill="none" opacity={0.3} strokeLinecap="round" />}
      <path d={pathD} stroke={col} strokeWidth={sw} fill="none" strokeDasharray={dash} strokeLinecap="round" />
      {ah && <polygon points={ah.map(p => p.join(',')).join(' ')} fill={col} />}
      {/* Step badge */}
      {obj.step > 0 && (() => {
        const bx = isCurved ? pointOnQuadBezier(x1, y1, mx, my, x2, y2, 0.5).x : (x1 + x2) / 2;
        const by = isCurved ? pointOnQuadBezier(x1, y1, mx, my, x2, y2, 0.5).y : (y1 + y2) / 2;
        return (
          <g>
            <circle cx={bx} cy={by} r={9} fill="#2563eb" />
            <text x={bx} y={by + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={10} fontWeight={700}>{obj.step}</text>
          </g>
        );
      })()}
      {/* Draggable control point */}
      {showControlPoint && isCurved && (
        <circle cx={mx} cy={my} r={5} fill="#2563eb" stroke="white" strokeWidth={1.5} style={{ cursor: 'move' }} data-control={id} />
      )}
    </g>
  );
}

function renderTextObj(obj, isSelected, onMouseDown) {
  const { id, x, y, value, fontSize = 14, color = '#ffffff' } = obj;
  return (
    <g key={id} onMouseDown={e => onMouseDown(e, id)} style={{ cursor: 'pointer' }}>
      {isSelected && <rect x={x - 4} y={y - fontSize - 2} width={(obj.width || 80) + 8} height={fontSize + 8} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" rx={3} />}
      <text x={x} y={y} fill={color} fontSize={fontSize} fontWeight={600} style={{ userSelect: 'none' }}>{value || 'Text'}</text>
    </g>
  );
}

// ============================================================
// AI MODALS (from existing implementation)
// ============================================================

function PlayGeneratorModal({ onClose, onApply }) {
  const [history, setHistory] = useState([
    { role: 'assistant', content: "Hey coach! Tell me about your team \u2014 what positions do you have, who are your strongest players, and what are your main struggles on offense? The more detail you give me, the better I can tailor a play for you." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setLoading(true);
    const newHistory = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    try {
      const res = await apiFetch('/ai/generate-play', {
        method: 'POST',
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      setHistory([...newHistory, { role: 'assistant', content: data.reply || data.error }]);
      if (data.play) setPendingPlay(data.play);
    } catch {
      setHistory([...newHistory, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setLoading(false);
  }

  function renderText(text) {
    return (text || '').split('\n').map((line, i) => {
      if (!line.trim()) return null;
      const parts = line.split(/\*\*(.+?)\*\*/g);
      const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-white">{p}</strong> : p);
      if (line.startsWith('- ') || line.startsWith('\u2022 '))
        return <li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{rendered}</li>;
      return <p key={i} className="text-sm text-gray-300 leading-relaxed">{rendered}</p>;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 flex flex-col max-h-[90vh]" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-black text-white">Ask AI For Help</h2>
            <p className="text-xs text-gray-500">Describe your team — AI will design a custom play</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {history.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mr-2 mt-0.5 text-xs font-black" style={{ backgroundColor: '#2563eb', color: 'white' }}>AI</div>
              )}
              <div className="max-w-xs px-4 py-2.5 rounded-2xl text-sm space-y-1"
                style={{ backgroundColor: m.role === 'user' ? '#2563eb' : '#16213e', color: 'white',
                  borderBottomRightRadius: m.role === 'user' ? 4 : undefined,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : undefined }}>
                {m.role === 'assistant' ? renderText(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mr-2 text-xs font-black" style={{ backgroundColor: '#2563eb', color: 'white' }}>AI</div>
              <div className="px-4 py-2.5 rounded-2xl text-sm text-gray-400" style={{ backgroundColor: '#16213e' }}>Designing your play...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {pendingPlay && (
          <div className="mx-4 mb-2 px-4 py-3 rounded-xl border border-green-700/50 flex items-center justify-between gap-3" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
            <div>
              <p className="text-sm font-bold text-green-400">&ldquo;{pendingPlay.name}&rdquo; is ready!</p>
              <p className="text-xs text-gray-500">Apply it to the canvas to see the diagram</p>
            </div>
            <button onClick={() => { onApply(pendingPlay); onClose(); }} className="px-4 py-2 rounded-lg font-bold text-white text-sm flex-shrink-0" style={{ backgroundColor: '#16a34a' }}>Apply</button>
          </div>
        )}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-700 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} disabled={loading} placeholder="Describe your team or ask a follow-up..."
            className="flex-1 px-4 py-2 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
            style={{ backgroundColor: '#16213e' }} autoFocus />
          <button type="submit" disabled={loading || !input.trim()} className="px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ backgroundColor: '#2563eb' }}>Send</button>
        </form>
      </div>
    </div>
  );
}

function AnalysisModal({ canvasPng, playName, onClose }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { analyze(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  async function analyze() {
    setLoading(true);
    try {
      const res = await apiFetch('/ai/analyze-play', { method: 'POST', body: JSON.stringify({ canvas_png: canvasPng, name: playName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err) { setAnalysis(`Error: ${err.message}`); }
    setLoading(false);
  }

  async function handleShare() {
    setShareMsg('Sharing...');
    try {
      const userId = localStorage.getItem('userId');
      let image_url = null;
      try { image_url = await uploadPlayDiagram(canvasPng, userId); } catch {}
      const res = await apiFetch('/ai/share-to-team', { method: 'POST', body: JSON.stringify({ content: analysis, title: playName, type: 'play', image_url }) });
      const data = await res.json();
      if (res.ok) setShareMsg(`Shared to ${data.sent} player${data.sent !== 1 ? 's' : ''}`);
      else setShareMsg(data.error || `Error ${res.status}`);
    } catch (err) { setShareMsg(err?.message || 'Network error'); }
    setTimeout(() => setShareMsg(''), 4000);
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
      const res = await apiFetch('/ai/film-chat', { method: 'POST', body: JSON.stringify({ base64_frame: canvasPng, history: historyForApi, message: msg }) });
      const data = await res.json();
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply || data.error }]);
    } catch {
      setChatHistory([...newHistory, { role: 'assistant', content: 'Something went wrong.' }]);
    }
    setChatLoading(false);
  }

  function inlineBold(str) {
    const parts = str.split(/\*\*(.+?)\*\*/g);
    if (parts.length === 1) return str;
    return parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-white">{part}</strong> : part);
  }

  function renderText(text) {
    return (text || '').split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4)
        return <h3 key={i} className="text-sm font-black text-white uppercase tracking-wide mt-3 mb-1">{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('\u2022 '))
        return <li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{inlineBold(line.slice(2))}</li>;
      if (!line.trim()) return null;
      return <p key={i} className="text-sm text-gray-300 leading-relaxed">{inlineBold(line)}</p>;
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
          <div className="flex items-center gap-3">
            {!loading && analysis && (
              <button onClick={handleShare} className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all" style={{ backgroundColor: '#16a34a', color: 'white' }}>
                {shareMsg || 'Share to Team'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
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
            <button type="submit" disabled={chatLoading || !input.trim()} className="px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ backgroundColor: '#2563eb' }}>Ask</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS PANEL
// ============================================================

function SettingsPanel({ settings, onChange, onClose }) {
  const s = settings;
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-72 border-l border-gray-700 shadow-2xl overflow-y-auto" style={{ backgroundColor: '#1e1e30' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="font-black text-white text-sm">Court Settings</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
      </div>
      <div className="p-4 space-y-5">
        {/* Court Type */}
        <div>
          <label className="text-xs text-gray-400 font-semibold mb-2 block">Court Type</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(COURT_TYPES).map(([key, ct]) => (
              <button key={key} onClick={() => onChange({ ...s, courtType: key })}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: s.courtType === key ? '#2563eb' : '#16213e', color: s.courtType === key ? 'white' : '#9ca3af', border: s.courtType === key ? '1px solid #3b82f6' : '1px solid #374151' }}>
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Court Color */}
        <div>
          <label className="text-xs text-gray-400 font-semibold mb-2 block">Court Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_PRESETS.map(cp => (
              <button key={cp.id} onClick={() => onChange({ ...s, courtColor: cp })}
                className="w-9 h-9 rounded-lg border-2 transition-all"
                style={{ backgroundColor: cp.bg, borderColor: s.courtColor?.id === cp.id ? '#3b82f6' : '#374151' }}
                title={cp.label} />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div>
          <label className="flex items-center gap-2 text-xs text-gray-400 font-semibold cursor-pointer">
            <input type="checkbox" checked={s.showGrid || false} onChange={e => onChange({ ...s, showGrid: e.target.checked })} className="rounded" />
            Show Grid Lines
          </label>
          {s.showGrid && (
            <div className="mt-2">
              <label className="text-xs text-gray-500 block mb-1">Grid Spacing: {s.gridSpacing || 5}ft</label>
              <input type="range" min={1} max={10} step={1} value={s.gridSpacing || 5}
                onChange={e => onChange({ ...s, gridSpacing: Number(e.target.value) })}
                className="w-full accent-blue-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROPERTY PANEL
// ============================================================

function PropertyPanel({ selectedObj, onUpdate, onDelete }) {
  if (!selectedObj) return null;
  const obj = selectedObj;

  function update(changes) { onUpdate(obj.id, changes); }

  if (obj.type === 'player') {
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Player</h4>
        {/* Team type */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Type</label>
          <div className="flex gap-1">
            {[['offense', 'O'], ['defense', 'X'], ['ball', 'BH']].map(([t, label]) => (
              <button key={t} onClick={() => update({ team: t, color: t === 'defense' ? '#ef4444' : '#ffffff' })}
                className="flex-1 py-1.5 rounded text-xs font-bold transition-all"
                style={{ backgroundColor: obj.team === t ? '#2563eb' : '#16213e', color: obj.team === t ? 'white' : '#9ca3af' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Number */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Label</label>
          <div className="flex gap-1">
            {['1', '2', '3', '4', '5'].map(n => (
              <button key={n} onClick={() => update({ number: n })}
                className="w-8 h-8 rounded text-xs font-bold transition-all"
                style={{ backgroundColor: obj.number === n ? '#2563eb' : '#16213e', color: obj.number === n ? 'white' : '#9ca3af' }}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            {['PG', 'SG', 'SF', 'PF', 'C'].map(n => (
              <button key={n} onClick={() => update({ number: n })}
                className="flex-1 py-1 rounded text-[10px] font-bold transition-all"
                style={{ backgroundColor: obj.number === n ? '#2563eb' : '#16213e', color: obj.number === n ? 'white' : '#9ca3af' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        {/* Color */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Color</label>
          <input type="color" value={obj.color || '#ffffff'} onChange={e => update({ color: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-gray-600" />
        </div>
        <button onClick={() => onDelete(obj.id)} className="w-full py-2 rounded-lg text-xs font-bold text-red-400 border border-red-800 hover:bg-red-900/20 transition-colors">Delete</button>
      </div>
    );
  }

  if (ARROW_SUBTYPES.includes(obj.type)) {
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Arrow</h4>
        {/* Arrow type */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Type</label>
          <div className="grid grid-cols-3 gap-1">
            {[['cut', 'Cut'], ['pass', 'Pass'], ['dribble', 'Dribble'], ['screen', 'Screen'], ['shot', 'Shot']].map(([t, label]) => (
              <button key={t} onClick={() => update({ type: t, strokeType: t === 'pass' ? 'dashed' : t === 'shot' ? 'dotted' : 'solid' })}
                className="py-1.5 rounded text-[10px] font-bold transition-all"
                style={{ backgroundColor: obj.type === t ? '#2563eb' : '#16213e', color: obj.type === t ? 'white' : '#9ca3af' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Shape: straight vs curved */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Shape</label>
          <div className="flex gap-1">
            <button onClick={() => update({ shape: 0 })}
              className="flex-1 py-1.5 rounded text-xs font-bold transition-all"
              style={{ backgroundColor: (obj.shape || 0) === 0 ? '#2563eb' : '#16213e', color: (obj.shape || 0) === 0 ? 'white' : '#9ca3af' }}>
              Straight
            </button>
            <button onClick={() => {
              const cp = midControlPoint(obj.x1, obj.y1, obj.x2, obj.y2, 30);
              update({ shape: 1, mx: cp.x, my: cp.y });
            }}
              className="flex-1 py-1.5 rounded text-xs font-bold transition-all"
              style={{ backgroundColor: obj.shape === 1 ? '#2563eb' : '#16213e', color: obj.shape === 1 ? 'white' : '#9ca3af' }}>
              Curved
            </button>
          </div>
        </div>
        {/* Stroke type */}
        {obj.type !== 'screen' && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Line Style</label>
            <div className="flex gap-1">
              {[['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']].map(([t, label]) => (
                <button key={t} onClick={() => update({ strokeType: t })}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold transition-all"
                  style={{ backgroundColor: obj.strokeType === t ? '#2563eb' : '#16213e', color: obj.strokeType === t ? 'white' : '#9ca3af' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Arrowhead toggle */}
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={obj.arrowhead !== false} onChange={e => update({ arrowhead: e.target.checked })} className="rounded" />
          Show Arrowhead
        </label>
        {/* Step number */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Step #</label>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => update({ step: n })}
                className="w-7 h-7 rounded text-[10px] font-bold transition-all"
                style={{ backgroundColor: (obj.step || 0) === n ? '#2563eb' : '#16213e', color: (obj.step || 0) === n ? 'white' : '#9ca3af' }}>
                {n === 0 ? '-' : n}
              </button>
            ))}
          </div>
        </div>
        {/* Color */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Color</label>
          <input type="color" value={obj.color || '#ffffff'} onChange={e => update({ color: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-gray-600" />
        </div>
        <button onClick={() => onDelete(obj.id)} className="w-full py-2 rounded-lg text-xs font-bold text-red-400 border border-red-800 hover:bg-red-900/20 transition-colors">Delete</button>
      </div>
    );
  }

  if (obj.type === 'text') {
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Text</h4>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Content</label>
          <input type="text" value={obj.value || ''} onChange={e => update({ value: e.target.value })}
            className="w-full px-2 py-1.5 rounded border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
            style={{ backgroundColor: '#16213e' }} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Font Size</label>
          <div className="flex gap-1 flex-wrap">
            {[10, 12, 14, 18, 24].map(s => (
              <button key={s} onClick={() => update({ fontSize: s })}
                className="px-2 py-1 rounded text-[10px] font-bold transition-all"
                style={{ backgroundColor: (obj.fontSize || 14) === s ? '#2563eb' : '#16213e', color: (obj.fontSize || 14) === s ? 'white' : '#9ca3af' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Color</label>
          <input type="color" value={obj.color || '#ffffff'} onChange={e => update({ color: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-gray-600" />
        </div>
        <button onClick={() => onDelete(obj.id)} className="w-full py-2 rounded-lg text-xs font-bold text-red-400 border border-red-800 hover:bg-red-900/20 transition-colors">Delete</button>
      </div>
    );
  }

  return null;
}

// ============================================================
// PHASE BAR
// ============================================================

function PhaseBar({ phases, activePhaseId, onSelect, onAdd, onDuplicate, onDelete, onRename, settings }) {
  const [editingTitle, setEditingTitle] = useState(null);

  return (
    <div className="flex items-center gap-2 px-1 py-2 overflow-x-auto">
      {phases.map((phase, i) => (
        <div key={phase.id} className="flex-shrink-0 group">
          <button onClick={() => onSelect(phase.id)}
            className="rounded-lg border-2 overflow-hidden transition-all"
            style={{ borderColor: phase.id === activePhaseId ? '#3b82f6' : '#374151', width: 90 }}>
            {/* Mini preview */}
            <svg viewBox={`0 0 ${COURT_W} ${COURT_H}`} width={90} height={84} className="block">
              <rect width={COURT_W} height={COURT_H} fill={settings.courtColor?.bg || '#1a5c2a'} />
              {/* Mini objects */}
              {(phase.objects || []).map(obj => {
                if (obj.type === 'player') {
                  return obj.team === 'defense'
                    ? <text key={obj.id} x={obj.x} y={obj.y + 4} textAnchor="middle" fill={obj.color || '#ef4444'} fontSize={20} fontWeight={900}>x</text>
                    : <circle key={obj.id} cx={obj.x} cy={obj.y} r={10} fill={obj.team === 'ball' ? '#ddd' : 'white'} stroke="#333" strokeWidth={2} />;
                }
                if (ARROW_SUBTYPES.includes(obj.type)) {
                  return <line key={obj.id} x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2} stroke="white" strokeWidth={2} opacity={0.7} />;
                }
                return null;
              })}
            </svg>
          </button>
          <div className="text-center mt-1">
            {editingTitle === phase.id ? (
              <input autoFocus value={phase.title || ''} onChange={e => onRename(phase.id, e.target.value)}
                onBlur={() => setEditingTitle(null)} onKeyDown={e => e.key === 'Enter' && setEditingTitle(null)}
                className="w-20 px-1 py-0.5 rounded text-[10px] text-center text-white border border-gray-600 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }} />
            ) : (
              <button onClick={() => setEditingTitle(phase.id)} className="text-[10px] text-gray-400 hover:text-white truncate block w-full">
                {phase.title || `Frame ${i + 1}`}
              </button>
            )}
          </div>
        </div>
      ))}
      {/* Add / Duplicate / Delete buttons */}
      <div className="flex-shrink-0 flex flex-col gap-1">
        <button onClick={onAdd} className="w-9 h-9 rounded-lg border border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-400 transition-colors text-lg" title="Add empty frame">+</button>
        <button onClick={onDuplicate} className="w-9 h-9 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500 hover:text-white transition-colors" title="Duplicate current frame">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        {phases.length > 1 && (
          <button onClick={onDelete} className="w-9 h-9 rounded-lg border border-red-800/50 flex items-center justify-center text-red-500/50 hover:text-red-400 transition-colors" title="Delete current frame">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PLAYBOOK PAGE
// ============================================================

export default function PlaybookPage() {
  const svgRef = useRef(null);

  // Phase state
  const [phases, setPhases] = useState([{ id: uid(), title: '', objects: [], links: [] }]);
  const [activePhaseId, setActivePhaseId] = useState(phases[0].id);

  // Tool state
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragControlPoint, setDragControlPoint] = useState(null);
  const [mousePos, setMousePos] = useState(null);

  // Settings
  const [settings, setSettings] = useState({
    courtType: 'NBA',
    courtColor: COLOR_PRESETS[0],
    showGrid: false,
    gridSpacing: 5,
  });

  // Play management
  const [playName, setPlayName] = useState('Untitled Play');
  const [currentPlayId, setCurrentPlayId] = useState(null);
  const [savedPlays, setSavedPlays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // UI panels
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayGenerator, setShowPlayGenerator] = useState(false);
  const [analysisModal, setAnalysisModal] = useState(null);
  const [showSavedPlays, setShowSavedPlays] = useState(true);

  // Undo/redo
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Animation
  const [animating, setAnimating] = useState(false);
  const [animPaused, setAnimPaused] = useState(false);
  const animRef = useRef(null);
  const animFrameRef = useRef(null);
  const ANIM_DURATION = 800;

  // Editing text
  const [editingTextId, setEditingTextId] = useState(null);

  // Computed: active phase objects
  const activePhase = useMemo(() => phases.find(p => p.id === activePhaseId), [phases, activePhaseId]);
  const objects = activePhase?.objects || [];

  const selectedObj = useMemo(() => objects.find(o => o.id === selectedId), [objects, selectedId]);

  // ---- History helpers ----
  function pushHistory() {
    setPast(prev => [...prev, JSON.parse(JSON.stringify(phases))]);
    setFuture([]);
  }

  function undo() {
    if (past.length === 0) return;
    setFuture(prev => [JSON.parse(JSON.stringify(phases)), ...prev]);
    const prev = past[past.length - 1];
    setPast(p => p.slice(0, -1));
    setPhases(prev);
  }

  function redo() {
    if (future.length === 0) return;
    setPast(prev => [...prev, JSON.parse(JSON.stringify(phases))]);
    const next = future[0];
    setFuture(f => f.slice(1));
    setPhases(next);
  }

  // ---- Object management ----
  function updateObjects(newObjects) {
    setPhases(prev => prev.map(p => p.id === activePhaseId ? { ...p, objects: newObjects } : p));
  }

  function updateObject(id, changes) {
    pushHistory();
    updateObjects(objects.map(o => o.id === id ? { ...o, ...changes } : o));
  }

  function deleteObject(id) {
    pushHistory();
    updateObjects(objects.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function addObject(obj) {
    pushHistory();
    updateObjects([...objects, obj]);
  }

  // ---- Phase management ----
  function addPhase() {
    pushHistory();
    const newPhase = { id: uid(), title: '', objects: [], links: [] };
    setPhases(prev => [...prev, newPhase]);
    setActivePhaseId(newPhase.id);
  }

  function duplicatePhase() {
    pushHistory();
    const src = phases.find(p => p.id === activePhaseId);
    if (!src) return;
    const newPhase = {
      id: uid(),
      title: src.title ? src.title + ' (copy)' : '',
      objects: JSON.parse(JSON.stringify(src.objects)).map(o => ({ ...o, id: uid() })),
      links: [],
    };
    const idx = phases.findIndex(p => p.id === activePhaseId);
    setPhases(prev => [...prev.slice(0, idx + 1), newPhase, ...prev.slice(idx + 1)]);
    setActivePhaseId(newPhase.id);
  }

  function deletePhase() {
    if (phases.length <= 1) return;
    pushHistory();
    const idx = phases.findIndex(p => p.id === activePhaseId);
    const newPhases = phases.filter(p => p.id !== activePhaseId);
    setPhases(newPhases);
    setActivePhaseId(newPhases[Math.min(idx, newPhases.length - 1)].id);
    setSelectedId(null);
  }

  function renamePhase(id, title) {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, title } : p));
  }

  // ---- SVG event handlers ----
  function getPos(e) {
    if (!svgRef.current) return { x: 0, y: 0 };
    return getSVGPoint(svgRef.current, e.clientX, e.clientY);
  }

  function handleMouseDown(e) {
    if (animating) return;
    if (e.target.closest('[data-control]')) return; // handled separately
    const pos = getPos(e);

    if (tool === 'select') {
      // Check control points first
      const cp = hitTestControlPoint(pos.x, pos.y, objects, selectedId);
      if (cp) {
        setDragControlPoint(cp);
        return;
      }

      const p = hitTestPlayer(pos.x, pos.y, objects);
      const a = !p && hitTestArrow(pos.x, pos.y, objects);
      const t = !p && !a && hitTestText(pos.x, pos.y, objects);

      if (p) {
        setSelectedId(p.id);
        setDragging({ id: p.id, ox: pos.x - p.x, oy: pos.y - p.y, type: 'player' });
      } else if (a) {
        setSelectedId(a.id);
        setDragging({ id: a.id, ox: pos.x, oy: pos.y, sx1: a.x1, sy1: a.y1, sx2: a.x2, sy2: a.y2, smx: a.mx, smy: a.my, type: 'arrow' });
      } else if (t) {
        setSelectedId(t.id);
        setDragging({ id: t.id, ox: pos.x - t.x, oy: pos.y - t.y, type: 'text' });
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool === 'erase') {
      const p = hitTestPlayer(pos.x, pos.y, objects);
      if (p) { deleteObject(p.id); return; }
      const a = hitTestArrow(pos.x, pos.y, objects);
      if (a) { deleteObject(a.id); return; }
      const t = hitTestText(pos.x, pos.y, objects);
      if (t) { deleteObject(t.id); return; }
      return;
    }

    if (PLAYER_TEAMS.includes(tool)) {
      const count = objects.filter(o => o.type === 'player' && o.team === tool).length;
      const labels = ['1', '2', '3', '4', '5'];
      addObject({
        id: uid(), type: 'player', team: tool,
        number: labels[count % 5],
        x: pos.x, y: pos.y,
        color: tool === 'defense' ? '#ef4444' : '#ffffff',
      });
      return;
    }

    if (ARROW_SUBTYPES.includes(tool)) {
      setDrawing({ type: tool, x1: pos.x, y1: pos.y });
      return;
    }

    if (tool === 'text') {
      const newId = uid();
      addObject({
        id: newId, type: 'text',
        x: pos.x, y: pos.y,
        value: 'Text', fontSize: 14, color: '#ffffff',
        width: 40,
      });
      setSelectedId(newId);
      setEditingTextId(newId);
      return;
    }
  }

  function handleObjMouseDown(e, id) {
    e.stopPropagation();
    if (animating) return;
    const pos = getPos(e);
    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    if (tool === 'erase') {
      deleteObject(id);
      return;
    }

    if (tool === 'select') {
      setSelectedId(id);
      if (obj.type === 'player') {
        setDragging({ id, ox: pos.x - obj.x, oy: pos.y - obj.y, type: 'player' });
      } else if (ARROW_SUBTYPES.includes(obj.type)) {
        setDragging({ id, ox: pos.x, oy: pos.y, sx1: obj.x1, sy1: obj.y1, sx2: obj.x2, sy2: obj.y2, smx: obj.mx, smy: obj.my, type: 'arrow' });
      } else if (obj.type === 'text') {
        setDragging({ id, ox: pos.x - obj.x, oy: pos.y - obj.y, type: 'text' });
      }
    }
  }

  function handleMouseMove(e) {
    const pos = getPos(e);
    setMousePos(pos);

    if (dragControlPoint) {
      updateObjects(objects.map(o => o.id === dragControlPoint.id ? { ...o, mx: pos.x, my: pos.y } : o));
      return;
    }

    if (dragging) {
      const d = dragging;
      if (d.type === 'player') {
        updateObjects(objects.map(o => o.id === d.id ? { ...o, x: pos.x - d.ox, y: pos.y - d.oy } : o));
      } else if (d.type === 'arrow') {
        const dx = pos.x - d.ox, dy = pos.y - d.oy;
        updateObjects(objects.map(o => o.id === d.id ? {
          ...o,
          x1: d.sx1 + dx, y1: d.sy1 + dy,
          x2: d.sx2 + dx, y2: d.sy2 + dy,
          mx: d.smx != null ? d.smx + dx : undefined,
          my: d.smy != null ? d.smy + dy : undefined,
        } : o));
      } else if (d.type === 'text') {
        updateObjects(objects.map(o => o.id === d.id ? { ...o, x: pos.x - d.ox, y: pos.y - d.oy } : o));
      }
    }
  }

  function handleMouseUp(e) {
    const pos = getPos(e);

    if (dragControlPoint) {
      pushHistory();
      setDragControlPoint(null);
      return;
    }

    if (dragging) {
      pushHistory();
      setDragging(null);
      return;
    }

    if (drawing) {
      const dx = pos.x - drawing.x1, dy = pos.y - drawing.y1;
      if (Math.hypot(dx, dy) > 15) {
        const maxStep = objects.filter(o => ARROW_SUBTYPES.includes(o.type)).reduce((max, o) => Math.max(max, o.step || 0), 0);
        addObject({
          id: uid(), type: drawing.type,
          x1: drawing.x1, y1: drawing.y1, x2: pos.x, y2: pos.y,
          shape: 0, color: '#ffffff',
          strokeType: drawing.type === 'pass' ? 'dashed' : drawing.type === 'shot' ? 'dotted' : 'solid',
          arrowhead: drawing.type !== 'screen',
          step: maxStep > 0 ? maxStep : 0,
        });
      }
      setDrawing(null);
    }
  }

  function handleMouseLeave() {
    setMousePos(null);
    setDrawing(null);
    setDragging(null);
    setDragControlPoint(null);
  }

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function handleKeyDown(e) {
      if (editingTextId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !e.target.closest('input, textarea')) {
        e.preventDefault();
        deleteObject(selectedId);
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) || (e.key === 'y' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); redo(); }
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey && !e.target.closest('input, textarea')) setTool('select');
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey && !e.target.closest('input, textarea')) setTool('erase');
      if (e.key === 'Escape') { setSelectedId(null); setDrawing(null); setEditingTextId(null); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, objects, past, future, editingTextId]);

  // ---- Save / Load ----
  useEffect(() => {
    apiFetch('/plays').then(r => r.json()).then(data => setSavedPlays(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function loadPlay(play) {
    try {
      let data = JSON.parse(play.canvas_json);
      if (!data.v || data.v < 2) {
        data = migrateV1(data);
      }
      setPhases(data.phases || [{ id: uid(), title: '', objects: [], links: [] }]);
      setActivePhaseId(data.phases?.[0]?.id || phases[0]?.id);
      if (data.settings) {
        setSettings(prev => ({
          ...prev,
          courtType: data.settings.courtType || prev.courtType,
          courtColor: data.settings.courtColor || prev.courtColor,
        }));
      }
      setCurrentPlayId(play.id);
      setPlayName(play.name);
      setSelectedId(null);
      setPast([]);
      setFuture([]);
    } catch {}
  }

  async function savePlay() {
    setSaving(true);
    const canvas_json = JSON.stringify({ v: 2, settings, phases });
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

  function clearCanvas() {
    pushHistory();
    const newId = uid();
    setPhases([{ id: newId, title: '', objects: [], links: [] }]);
    setActivePhaseId(newId);
    setSelectedId(null);
    setCurrentPlayId(null);
    setPlayName('Untitled Play');
  }

  function applyGeneratedPlay(play) {
    clearCanvas();
    const newPlayers = (play.players || []).map(p => ({
      id: uid(), type: 'player',
      team: p.type === 'offense' ? 'offense' : 'defense',
      number: p.label || '1',
      x: p.x * (COURT_W / 560), y: p.y * (COURT_H / 440),
      color: p.type === 'offense' ? '#ffffff' : '#ef4444',
    }));
    const newLines = (play.lines || []).map(l => ({
      id: uid(), type: l.type || 'cut',
      x1: l.x1 * (COURT_W / 560), y1: l.y1 * (COURT_H / 440),
      x2: l.x2 * (COURT_W / 560), y2: l.y2 * (COURT_H / 440),
      shape: 0, color: '#ffffff',
      strokeType: l.type === 'pass' ? 'dashed' : 'solid',
      arrowhead: true, step: l.step || 0,
    }));
    const newScreens = (play.screens || []).map(s => ({
      id: uid(), type: 'screen',
      x1: s.x1 * (COURT_W / 560), y1: s.y1 * (COURT_H / 440),
      x2: s.x2 * (COURT_W / 560), y2: s.y2 * (COURT_H / 440),
      shape: 0, color: '#ffffff',
    }));
    const allObjects = [...newPlayers, ...newLines, ...newScreens];
    setPhases([{ id: uid(), title: '', objects: allObjects, links: [] }]);
    setActivePhaseId(phases[0]?.id);
    if (play.name) setPlayName(play.name);
  }

  // ---- Export PNG ----
  async function exportPNG() {
    const svg = svgRef.current;
    if (!svg) return null;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const canvas = document.createElement('canvas');
    canvas.width = COURT_W * 2;
    canvas.height = COURT_H * 2;
    return new Promise(resolve => {
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  }

  async function openAnalysis() {
    const png = await exportPNG();
    if (png) setAnalysisModal({ png, name: playName });
  }

  // ---- Animation ----
  function getMaxStep() {
    return objects.filter(o => ARROW_SUBTYPES.includes(o.type)).reduce((max, o) => Math.max(max, o.step || 0), 0);
  }

  function startAnimation() {
    if (phases.length > 1) {
      // Animate between phases
      animRef.current = { mode: 'phases', phaseIdx: 0, progress: 0, startTime: null };
    } else {
      // Animate steps within single phase
      const maxStep = getMaxStep();
      if (maxStep === 0) return;
      const positions = {};
      objects.filter(o => o.type === 'player').forEach(p => { positions[p.id] = { x: p.x, y: p.y }; });
      animRef.current = { mode: 'steps', step: 1, maxStep, progress: 0, startTime: null, positions, stepStart: { ...positions } };
    }
    setAnimating(true);
    setAnimPaused(false);
  }

  function stopAnimation() {
    setAnimating(false);
    setAnimPaused(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animRef.current = null;
  }

  // ---- Animation tick for step-based ----
  const [animPositions, setAnimPositions] = useState(null);
  const [animPhaseBlend, setAnimPhaseBlend] = useState(null);

  useEffect(() => {
    if (!animating || animPaused) return;
    const anim = animRef.current;
    if (!anim) return;

    if (anim.mode === 'phases') {
      function tick(ts) {
        if (!animRef.current || animRef.current.mode !== 'phases') return;
        const a = animRef.current;
        if (!a.startTime) a.startTime = ts;
        const elapsed = ts - a.startTime;
        a.progress = Math.min(elapsed / ANIM_DURATION, 1);
        const eased = a.progress < 0.5 ? 2 * a.progress * a.progress : 1 - Math.pow(-2 * a.progress + 2, 2) / 2;

        const fromPhase = phases[a.phaseIdx];
        const toPhase = phases[Math.min(a.phaseIdx + 1, phases.length - 1)];

        if (fromPhase && toPhase && fromPhase.id !== toPhase.id) {
          // Blend player positions
          const blended = toPhase.objects.map(toObj => {
            if (toObj.type !== 'player') return toObj;
            const fromObj = fromPhase.objects.find(o => o.type === 'player' && o.number === toObj.number && o.team === toObj.team);
            if (!fromObj) return toObj;
            return { ...toObj, x: fromObj.x + (toObj.x - fromObj.x) * eased, y: fromObj.y + (toObj.y - fromObj.y) * eased };
          });
          setAnimPhaseBlend({ objects: blended, arrows: a.progress > 0.5 ? toPhase.objects.filter(o => ARROW_SUBTYPES.includes(o.type)) : fromPhase.objects.filter(o => ARROW_SUBTYPES.includes(o.type)) });
        }

        if (a.progress >= 1) {
          if (a.phaseIdx < phases.length - 2) {
            a.phaseIdx++;
            a.progress = 0;
            a.startTime = null;
            setActivePhaseId(phases[a.phaseIdx + 1].id);
            setTimeout(() => { animFrameRef.current = requestAnimationFrame(tick); }, 300);
            return;
          } else {
            setTimeout(() => { stopAnimation(); setAnimPhaseBlend(null); }, 500);
            return;
          }
        }
        animFrameRef.current = requestAnimationFrame(tick);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }

    if (anim.mode === 'steps') {
      function tick(ts) {
        if (!animRef.current || animRef.current.mode !== 'steps') return;
        const a = animRef.current;
        if (!a.startTime) a.startTime = ts;
        const elapsed = ts - a.startTime;
        a.progress = Math.min(elapsed / ANIM_DURATION, 1);
        const eased = a.progress < 0.5 ? 2 * a.progress * a.progress : 1 - Math.pow(-2 * a.progress + 2, 2) / 2;

        const stepArrows = objects.filter(o => ARROW_SUBTYPES.includes(o.type) && (o.step || 0) === a.step);
        const newPositions = { ...a.stepStart };

        for (const arrow of stepArrows) {
          // Find closest player to arrow start
          let closestId = null, minDist = Infinity;
          for (const [pid, pos] of Object.entries(a.stepStart)) {
            const d = dist(pos.x, pos.y, arrow.x1, arrow.y1);
            if (d < minDist) { minDist = d; closestId = pid; }
          }
          if (closestId && minDist < PLAYER_R * 3) {
            const start = a.stepStart[closestId];
            newPositions[closestId] = {
              x: start.x + (arrow.x2 - arrow.x1) * eased,
              y: start.y + (arrow.y2 - arrow.y1) * eased,
            };
          }
        }

        setAnimPositions({ ...newPositions });

        if (a.progress >= 1) {
          // Commit positions
          for (const [pid, pos] of Object.entries(newPositions)) {
            a.positions[pid] = pos;
          }
          if (a.step < a.maxStep) {
            a.step++;
            a.progress = 0;
            a.startTime = null;
            a.stepStart = { ...a.positions };
            setTimeout(() => { animFrameRef.current = requestAnimationFrame(tick); }, 300);
            return;
          } else {
            setTimeout(() => { stopAnimation(); setAnimPositions(null); }, 500);
            return;
          }
        }
        animFrameRef.current = requestAnimationFrame(tick);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [animating, animPaused]);

  // ---- Render objects with animation override ----
  function getDisplayObjects() {
    if (animPhaseBlend) {
      return [...animPhaseBlend.objects, ...animPhaseBlend.arrows];
    }
    if (animPositions) {
      return objects.map(o => {
        if (o.type === 'player' && animPositions[o.id]) {
          return { ...o, x: animPositions[o.id].x, y: animPositions[o.id].y };
        }
        return o;
      });
    }
    return objects;
  }

  const displayObjects = getDisplayObjects();

  // ---- Drawing preview ----
  function renderDrawingPreview() {
    if (!drawing || !mousePos) return null;
    const { type, x1, y1 } = drawing;
    const { x: x2, y: y2 } = mousePos;

    if (type === 'screen') {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const perp = angle + Math.PI / 2;
      const barLen = 18;
      return (
        <g opacity={0.5}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={2} />
          <line x1={x2 + Math.cos(perp) * barLen} y1={y2 + Math.sin(perp) * barLen}
            x2={x2 - Math.cos(perp) * barLen} y2={y2 - Math.sin(perp) * barLen}
            stroke="white" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    }

    if (type === 'dribble') {
      return <path d={zigzagPath(x1, y1, x2, y2)} stroke="white" strokeWidth={2} fill="none" opacity={0.5} />;
    }

    if (type === 'shot') {
      const cp = midControlPoint(x1, y1, x2, y2, -40);
      return <path d={`M ${x1} ${y1} Q ${cp.x} ${cp.y} ${x2} ${y2}`} stroke="white" strokeWidth={2} fill="none" strokeDasharray="4 4" opacity={0.5} />;
    }

    const dash = type === 'pass' ? '8 5' : undefined;
    const ah = arrowheadPoints(x1, y1, x2, y2, 10);
    return (
      <g opacity={0.5}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={2} strokeDasharray={dash} />
        <polygon points={ah.map(p => p.join(',')).join(' ')} fill="white" />
      </g>
    );
  }

  // Get cursor
  const cursor = tool === 'select' ? (dragging || dragControlPoint ? 'grabbing' : 'default') : 'crosshair';

  return (
    <div>
      {showPlayGenerator && <PlayGeneratorModal onClose={() => setShowPlayGenerator(false)} onApply={applyGeneratedPlay} />}
      {analysisModal && <AnalysisModal canvasPng={analysisModal.png} playName={analysisModal.name} onClose={() => setAnalysisModal(null)} />}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Play Creator</h1>
          <p className="text-gray-400 mt-1 text-sm">Design plays, animate, and get AI analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPlayGenerator(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#7c3aed' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/></svg>
            AI Generate
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity border border-gray-700 text-gray-300"
            style={{ backgroundColor: '#16213e' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Toolbar */}
        <div className="flex-shrink-0 rounded-xl border border-gray-800 p-2 space-y-2" style={{ backgroundColor: '#1e1e30' }}>
          {TOOL_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="border-t border-gray-700/50 my-2" />}
              <div className="text-[9px] text-gray-600 font-semibold uppercase tracking-wider px-1 mb-1">{group.label}</div>
              <div className="flex flex-col gap-0.5">
                {group.tools.map(t => (
                  <button key={t.id} onClick={() => { setTool(t.id); setDrawing(null); }} title={t.tip}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                    style={{
                      backgroundColor: tool === t.id ? '#2563eb' : 'transparent',
                      color: tool === t.id ? 'white' : (t.color || '#9ca3af'),
                    }}>
                    {t.icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-gray-700/50 my-2" />
          {/* Undo / Redo */}
          <div className="flex flex-col gap-0.5">
            <button onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            </button>
            <button onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Shift+Z)"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            </button>
          </div>
          <div className="border-t border-gray-700/50 my-2" />
          <button onClick={clearCanvas} title="Clear all"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>

        {/* Main editor area */}
        <div className="flex-1 min-w-0">
          {/* Play name + actions */}
          <div className="flex items-center gap-2 mb-2">
            <input value={playName} onChange={e => setPlayName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
              style={{ backgroundColor: '#16213e' }} placeholder="Play name..." />
            <button onClick={savePlay} disabled={saving}
              className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: '#2563eb' }}>
              {saving ? '...' : saveMsg || 'Save'}
            </button>
            <button onClick={openAnalysis}
              className="px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90"
              style={{ backgroundColor: '#16a34a', color: 'white' }}>
              Analyze
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-3 mb-2 text-[10px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-white inline-block" /> Cut</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 inline-block" style={{ borderTop: '1.5px dashed white' }} /> Pass</span>
            <span className="flex items-center gap-1"><span className="text-white text-xs">~</span> Dribble</span>
            <span className="flex items-center gap-1"><span className="text-white text-xs">T</span> Screen</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-white border border-gray-600" /></span>
            <span className="flex items-center gap-1 text-red-400">x Def</span>
          </div>

          {/* SVG Court */}
          <div className="rounded-xl border border-gray-700 overflow-hidden" style={{ maxWidth: 700 }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${COURT_W} ${COURT_H}`}
              className="w-full block"
              style={{ cursor }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <CourtSVG
                courtType={settings.courtType}
                colors={settings.courtColor}
                showGrid={settings.showGrid}
                gridSpacing={settings.gridSpacing}
              />

              {/* Objects */}
              {displayObjects.filter(o => ARROW_SUBTYPES.includes(o.type)).map(obj =>
                renderArrow(obj, selectedId === obj.id, handleObjMouseDown, selectedId === obj.id)
              )}
              {displayObjects.filter(o => o.type === 'text').map(obj =>
                renderTextObj(obj, selectedId === obj.id, handleObjMouseDown)
              )}
              {displayObjects.filter(o => o.type === 'player').map(obj =>
                renderPlayer(obj, selectedId === obj.id, handleObjMouseDown)
              )}

              {/* Drawing preview */}
              {renderDrawingPreview()}
            </svg>
          </div>

          {/* Phase bar */}
          <div className="mt-2 rounded-xl border border-gray-800 px-3" style={{ backgroundColor: '#1e1e30' }}>
            <PhaseBar
              phases={phases}
              activePhaseId={activePhaseId}
              onSelect={id => { setActivePhaseId(id); setSelectedId(null); }}
              onAdd={addPhase}
              onDuplicate={duplicatePhase}
              onDelete={deletePhase}
              onRename={renamePhase}
              settings={settings}
            />
          </div>

          {/* Animation controls */}
          <div className="flex items-center gap-3 mt-2">
            {!animating ? (
              <button onClick={startAnimation}
                disabled={phases.length <= 1 && getMaxStep() === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-30 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#2563eb' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                Animate
              </button>
            ) : (
              <>
                <button onClick={() => setAnimPaused(p => !p)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90"
                  style={{ backgroundColor: animPaused ? '#2563eb' : '#f59e0b' }}>
                  {animPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={stopAnimation}
                  className="px-4 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90"
                  style={{ backgroundColor: '#ef4444' }}>
                  Stop
                </button>
              </>
            )}
            <span className="text-[10px] text-gray-600 ml-auto">
              {animating ? 'Playing animation...' :
               tool === 'select' ? 'Click to select \u00b7 Drag to move \u00b7 Delete to remove' :
               PLAYER_TEAMS.includes(tool) ? 'Click on court to place' :
               ARROW_SUBTYPES.includes(tool) ? 'Click and drag to draw' :
               tool === 'text' ? 'Click to place text' :
               tool === 'erase' ? 'Click element to delete' : ''}
            </span>
          </div>
        </div>

        {/* Right panel: Properties / Saved Plays */}
        <div className="w-52 flex-shrink-0 space-y-3">
          {/* Property Panel */}
          {selectedObj && (
            <div className="rounded-xl border border-gray-800 p-4" style={{ backgroundColor: '#1e1e30' }}>
              <PropertyPanel selectedObj={selectedObj} onUpdate={updateObject} onDelete={deleteObject} />
            </div>
          )}

          {/* Text editing */}
          {editingTextId && selectedObj?.type === 'text' && (
            <div className="rounded-xl border border-gray-800 p-4" style={{ backgroundColor: '#1e1e30' }}>
              <label className="text-xs text-gray-400 font-semibold block mb-2">Edit Text</label>
              <input
                autoFocus
                value={selectedObj.value || ''}
                onChange={e => updateObject(editingTextId, { value: e.target.value })}
                onBlur={() => setEditingTextId(null)}
                onKeyDown={e => e.key === 'Enter' && setEditingTextId(null)}
                className="w-full px-2 py-1.5 rounded border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
          )}

          {/* Saved Plays */}
          <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
            <button onClick={() => setShowSavedPlays(p => !p)} className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-800 hover:bg-white/5">
              <h3 className="font-black text-white text-sm">Saved Plays</h3>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className={`transition-transform ${showSavedPlays ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showSavedPlays && (
              <div className="divide-y divide-gray-800 max-h-[300px] overflow-y-auto">
                {loading ? (
                  <p className="text-gray-500 text-xs text-center py-6">Loading...</p>
                ) : savedPlays.length === 0 ? (
                  <p className="text-gray-500 text-xs text-center py-6 px-3">No plays saved yet.</p>
                ) : savedPlays.map(play => (
                  <div key={play.id} className={`px-3 py-2.5 hover:bg-white/5 transition-colors ${currentPlayId === play.id ? 'bg-white/5' : ''}`}>
                    <button onClick={() => loadPlay(play)} className="w-full text-left">
                      <p className="text-xs font-semibold text-white truncate">{play.name}</p>
                      <p className="text-[10px] text-gray-600">{new Date(play.created_at).toLocaleDateString()}</p>
                    </button>
                    <button onClick={() => deletePlay(play.id)} className="text-[10px] text-red-500/50 hover:text-red-400 mt-0.5">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
