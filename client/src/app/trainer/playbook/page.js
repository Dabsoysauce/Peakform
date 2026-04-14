'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadPlayDiagram } from '../../lib/supabase';

// ============================================================
// CONSTANTS
// ============================================================

const COURT_W = 500;
const COURT_H = 470;
const COURT_H_FULL = COURT_H * 2;
const PLAYER_R = 15;
const SNAP_RADIUS = PLAYER_R + 12;
const ANIM_PHASE_MS = 1200;

const COURT_TYPES = {
  NBA: { label:'NBA', basketY:425, backboardY:437, backboardHW:30, keyW:160, keyH:190, ftR:60, threeR:238, cornerX:220, restrictedR:40 },
  NCAA: { label:'NCAA', basketY:425, backboardY:437, backboardHW:30, keyW:120, keyH:190, ftR:60, threeR:222, cornerX:216, restrictedR:40 },
  HighSchool: { label:'High School', basketY:425, backboardY:437, backboardHW:30, keyW:120, keyH:190, ftR:60, threeR:198, cornerX:190, restrictedR:40 },
  FIBA: { label:'FIBA', basketY:425, backboardY:437, backboardHW:30, keyW:160, keyH:190, ftR:60, threeR:225, cornerX:219, restrictedR:40 },
};

const COLOR_PRESETS = [
  { id:1, bg:'#1a5c2a', lines:'rgba(255,255,255,0.85)', label:'Classic' },
  { id:2, bg:'#1a365d', lines:'rgba(255,255,255,0.85)', label:'Navy' },
  { id:3, bg:'#92400e', lines:'rgba(255,255,255,0.85)', label:'Hardwood' },
  { id:4, bg:'#374151', lines:'rgba(209,213,219,0.85)', label:'Slate' },
  { id:5, bg:'#111827', lines:'rgba(156,163,175,0.7)', label:'Dark' },
];

const ACTION_TOOLS = [
  { id:'dribble', label:'Dribble', icon:'M2 7Q5 2 8 7Q11 12 14 7', iconType:'path', dash:null },
  { id:'pass', label:'Pass', icon:null, iconType:'dashed', dash:'4 3' },
  { id:'cut', label:'Cut', icon:null, iconType:'solid', dash:null },
  { id:'screen', label:'Screen', icon:null, iconType:'screen', dash:null },
  { id:'shot', label:'Shot', icon:null, iconType:'arc', dash:'3 3' },
  { id:'handoff', label:'Handoff', icon:null, iconType:'handoff', dash:null },
];

const ARROW_SUBTYPES = ['cut','pass','dribble','screen','shot','handoff'];

function parsePlayerTool(tool) {
  const m = tool.match(/^(offense|defense|ball)_(\w+)$/);
  return m ? { team: m[1], number: m[2] } : null;
}
function isPlayerTool(tool) { return parsePlayerTool(tool) !== null; }

// ============================================================
// GLASS DESIGN SYSTEM
// ============================================================

const MOUNT_KEYFRAMES = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes pulseGlow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

const cssVars = {
  '--glass-bg': 'rgba(255,255,255,0.03)',
  '--glass-bg-strong': 'rgba(30, 30, 48, 0.85)',
  '--glass-border': 'rgba(255, 255, 255, 0.06)',
  '--glass-border-hover': 'rgba(255, 255, 255, 0.15)',
  '--glass-blur': 'blur(16px)',
  '--glass-blur-strong': 'blur(40px)',
  '--primary': '#e85d26',
  '--primary-rgb': '232, 93, 38',
  '--primary-light': '#ff7a45',
  '--primary-light-rgb': '255, 122, 69',
  '--primary-glow': 'rgba(232, 93, 38, 0.3)',
  '--accent': '#2563eb',
  '--accent-light': '#3b82f6',
  '--accent-glow': 'rgba(37, 99, 235, 0.25)',
  '--surface': '#16213e',
  '--surface-light': 'rgba(22, 33, 62, 0.7)',
  '--bg-dark': '#0f0f1a',
  '--card-bg': 'rgba(30, 30, 48, 0.5)',
  '--text-primary': '#ffffff',
  '--text-secondary': '#9ca3af',
  '--text-muted': '#6b7280',
  '--success': '#4ade80',
  '--danger': '#ef4444',
};

const glassCard = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const glassCardStrong = {
  background: 'var(--glass-bg-strong)',
  backdropFilter: 'var(--glass-blur-strong)',
  WebkitBackdropFilter: 'var(--glass-blur-strong)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const glassInput = {
  background: 'rgba(22, 33, 62, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const gradientBtn = {
  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
  boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)',
};

const accentBtn = {
  background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
  boxShadow: '0 4px 15px var(--accent-glow)',
};

const glassToolBtn = (active) => ({
  background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'rgba(255,255,255,0.03)',
  backdropFilter: active ? 'none' : 'blur(16px)',
  WebkitBackdropFilter: active ? 'none' : 'blur(16px)',
  border: active ? '1.5px solid var(--accent-light)' : '1px solid rgba(255,255,255,0.06)',
  color: active ? 'white' : '#d1d5db',
  boxShadow: active ? '0 2px 10px var(--accent-glow)' : 'none',
  transition: 'all 0.2s ease',
});

const glassToolBtnMuted = (active) => ({
  background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'rgba(255,255,255,0.03)',
  backdropFilter: active ? 'none' : 'blur(16px)',
  WebkitBackdropFilter: active ? 'none' : 'blur(16px)',
  border: active ? '1.5px solid var(--accent-light)' : '1px solid rgba(255,255,255,0.06)',
  color: active ? 'white' : '#9ca3af',
  boxShadow: active ? '0 2px 10px var(--accent-glow)' : 'none',
  transition: 'all 0.2s ease',
});

// ============================================================
// UTILITIES
// ============================================================

let _idc = 1;
function uid() { return 'o' + (_idc++); }

function getSVGPoint(svg, cx, cy) {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x:0, y:0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function dist(x1,y1,x2,y2) { return Math.hypot(x2-x1,y2-y1); }

function arrowheadPts(fx,fy,tx,ty,s=10) {
  const a = Math.atan2(ty-fy,tx-fx);
  return [[tx,ty],[tx-s*Math.cos(a-0.4),ty-s*Math.sin(a-0.4)],[tx-s*Math.cos(a+0.4),ty-s*Math.sin(a+0.4)]];
}

function midCP(x1,y1,x2,y2,off=30) {
  const mx=(x1+x2)/2, my=(y1+y2)/2, a=Math.atan2(y2-y1,x2-x1)+Math.PI/2;
  return { x: mx+Math.cos(a)*off, y: my+Math.sin(a)*off };
}

function zigzag(x1,y1,x2,y2) {
  const d=dist(x1,y1,x2,y2), a=Math.atan2(y2-y1,x2-x1), p=a+Math.PI/2;
  const w=Math.max(3,Math.floor(d/18));
  let s=`M ${x1} ${y1}`;
  for(let i=1;i<=w*2;i++){const t=i/(w*2),px=x1+(x2-x1)*t,py=y1+(y2-y1)*t,amp=(i%2===0?1:-1)*5;s+=` L ${px+Math.cos(p)*amp} ${py+Math.sin(p)*amp}`;}
  return s;
}

function curvedZigzag(x1,y1,mx,my,x2,y2) {
  const steps=30; let s=`M ${x1} ${y1}`;
  for(let i=1;i<=steps;i++){
    const t=i/steps,bx=(1-t)*(1-t)*x1+2*(1-t)*t*mx+t*t*x2,by=(1-t)*(1-t)*y1+2*(1-t)*t*my+t*t*y2;
    const t2=Math.min(t+0.01,1),bx2=(1-t2)*(1-t2)*x1+2*(1-t2)*t2*mx+t2*t2*x2,by2=(1-t2)*(1-t2)*y1+2*(1-t2)*t2*my+t2*t2*y2;
    const a=Math.atan2(by2-by,bx2-bx)+Math.PI/2,amp=(i%2===0?1:-1)*5;
    s+=` L ${bx+Math.cos(a)*amp} ${by+Math.sin(a)*amp}`;
  }
  return s;
}

function ptOnBez(x1,y1,mx,my,x2,y2,t) {
  return { x:(1-t)*(1-t)*x1+2*(1-t)*t*mx+t*t*x2, y:(1-t)*(1-t)*y1+2*(1-t)*t*my+t*t*y2 };
}

function findSnap(x, y, objects, excludeId = null) {
  let best = null, bd = Infinity;
  for (const o of objects) {
    if (o.type !== 'player' || o.id === excludeId) continue;
    const d = dist(o.x, o.y, x, y);
    if (d < SNAP_RADIUS && d < bd) { best = o; bd = d; }
  }
  return best;
}

function resolveArrow(arrow, objects) {
  let { x1,y1,x2,y2,mx,my } = arrow;
  if (arrow.startLink) { const p = objects.find(o => o.id === arrow.startLink); if (p) { x1=p.x; y1=p.y; } }
  if (arrow.endLink) { const p = objects.find(o => o.id === arrow.endLink); if (p) { x2=p.x; y2=p.y; } }
  if (arrow.shape === 1 && mx == null) { const c = midCP(x1,y1,x2,y2,30); mx=c.x; my=c.y; }
  return { x1,y1,x2,y2,mx,my };
}

function hitPlayer(px,py,objs) { return objs.find(o=>o.type==='player'&&dist(o.x,o.y,px,py)<=PLAYER_R+4); }

function hitArrow(px,py,objs) {
  return objs.find(o => {
    if (!ARROW_SUBTYPES.includes(o.type)) return false;
    const r = resolveArrow(o, objs);
    if (o.shape===1 && r.mx!=null) {
      for(let t=0;t<=1;t+=0.05){ const p=ptOnBez(r.x1,r.y1,r.mx,r.my,r.x2,r.y2,t); if(dist(px,py,p.x,p.y)<8) return true; }
      return false;
    }
    const dx=r.x2-r.x1, dy=r.y2-r.y1, len=Math.hypot(dx,dy);
    if(len===0) return false;
    const t=Math.max(0,Math.min(1,((px-r.x1)*dx+(py-r.y1)*dy)/(len*len)));
    return dist(px,py,r.x1+t*dx,r.y1+t*dy)<8;
  });
}

function hitText(px,py,objs) { return objs.find(o=>o.type==='text'&&px>=o.x-5&&px<=o.x+(o.width||80)+5&&py>=o.y-(o.fontSize||14)-2&&py<=o.y+5); }

// Group players that visually overlap (centers within PLAYER_R) so a stack
// indicator can be shown for each group with more than one member.
function getPlayerStacks(players) {
  const groups = [];
  const seen = new Set();
  for (const p of players) {
    if (seen.has(p.id)) continue;
    const group = [p];
    seen.add(p.id);
    for (const q of players) {
      if (seen.has(q.id)) continue;
      if (dist(p.x, p.y, q.x, q.y) <= PLAYER_R) { group.push(q); seen.add(q.id); }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

function hitControlPt(px,py,objs,selId) {
  const o=objs.find(x=>x.id===selId);
  if(!o||!ARROW_SUBTYPES.includes(o.type)) return null;
  const r=resolveArrow(o,objs);
  const mx = o.shape===1 && o.mx!=null ? o.mx : (r.x1+r.x2)/2;
  const my = o.shape===1 && o.my!=null ? o.my : (r.y1+r.y2)/2;
  if(dist(px,py,mx,my)<8) return { id:o.id };
  return null;
}

// Smart next frame: apply actions from current phase
function generateNextFrame(phase) {
  const objs = JSON.parse(JSON.stringify(phase.objects));
  const arrows = phase.objects.filter(o => ARROW_SUBTYPES.includes(o.type));

  for (const arrow of arrows) {
    const r = resolveArrow(arrow, phase.objects);
    const sp = arrow.startLink ? objs.find(o => o.id === arrow.startLink) : null;
    const ep = arrow.endLink ? objs.find(o => o.id === arrow.endLink) : null;

    switch (arrow.type) {
      case 'cut':
      case 'screen':
        if (sp) { sp.x = r.x2; sp.y = r.y2; }
        break;
      case 'dribble':
        if (sp) { sp.x = r.x2; sp.y = r.y2; }
        break;
      case 'pass':
        if (sp) sp.hasBall = false;
        if (ep) ep.hasBall = true;
        break;
      case 'shot':
        if (sp) sp.hasBall = false;
        break;
      case 'handoff':
        if (sp && ep) {
          const mx = (sp.x + ep.x) / 2, my = (sp.y + ep.y) / 2;
          ep.x = sp.x; ep.y = sp.y;
          sp.x = mx; sp.y = my;
          if (sp.hasBall) { sp.hasBall = false; ep.hasBall = true; }
          else if (ep.hasBall) { ep.hasBall = false; sp.hasBall = true; }
        }
        break;
    }
  }
  const newObjs = objs.filter(o => !ARROW_SUBTYPES.includes(o.type)).map(o => ({ ...o, id: uid() }));
  return { id: uid(), title: '', objects: newObjs };
}

function migrateV1(data) {
  const objects = [];
  const sx = COURT_W/560, sy = COURT_H/440;
  (data.players||[]).forEach((p,i) => {
    objects.push({ id:uid(), type:'player', team:p.type==='offense'?'offense':'defense', number:p.label||'1', x:p.x*sx, y:p.y*sy, color:p.type==='offense'?'#ffffff':'#ef4444', hasBall: i===0 && p.type==='offense' });
  });
  (data.lines||[]).forEach(l => {
    objects.push({ id:uid(), type:l.type||'cut', x1:l.x1*sx, y1:l.y1*sy, x2:l.x2*sx, y2:l.y2*sy, shape:0, color:'#ffffff', strokeType:l.type==='pass'?'dashed':'solid', arrowhead:true, step:l.step||0, startLink:null, endLink:null });
  });
  (data.screens||[]).forEach(s => {
    objects.push({ id:uid(), type:'screen', x1:s.x1*sx, y1:s.y1*sy, x2:s.x2*sx, y2:s.y2*sy, shape:0, color:'#ffffff', startLink:null, endLink:null });
  });
  return { v:2, settings:{ courtType:'NBA', courtColor:COLOR_PRESETS[0] }, phases:[{ id:uid(), title:'', objects }] };
}

// Easing
function easeInOut(t) { return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }

// ============================================================
// COURT SVG
// ============================================================

function HalfCourtLines({ c, cx, h, baseline, mirrored=false }) {
  const dir=mirrored?-1:1;
  const basketY=baseline-dir*(h-c.basketY), backboardY=baseline-dir*(h-c.backboardY), ftY=baseline-dir*c.keyH;
  const cArcD=Math.sqrt(Math.max(0,c.threeR*c.threeR-c.cornerX*c.cornerX)), cornerArcY=basketY-dir*cArcD;
  const s0=mirrored?0:1, s1=mirrored?1:0;
  return (
    <g>
      <rect x={cx-c.keyW/2} y={Math.min(ftY,baseline)} width={c.keyW} height={Math.abs(baseline-ftY)} />
      <path d={`M ${cx-c.ftR} ${ftY} A ${c.ftR} ${c.ftR} 0 0 ${s1} ${cx+c.ftR} ${ftY}`} />
      <path d={`M ${cx-c.ftR} ${ftY} A ${c.ftR} ${c.ftR} 0 0 ${s0} ${cx+c.ftR} ${ftY}`} strokeDasharray="6 5" />
      <line x1={cx-c.backboardHW} y1={backboardY} x2={cx+c.backboardHW} y2={backboardY} strokeWidth={3} />
      <circle cx={cx} cy={basketY} r={9} />
      <line x1={cx} y1={backboardY} x2={cx} y2={basketY+(mirrored?9:-9)} strokeWidth={1} />
      <path d={`M ${cx-c.restrictedR} ${baseline} A ${c.restrictedR} ${c.restrictedR} 0 0 ${s0} ${cx+c.restrictedR} ${baseline}`} />
      <line x1={cx-c.cornerX} y1={baseline} x2={cx-c.cornerX} y2={cornerArcY} />
      <line x1={cx+c.cornerX} y1={baseline} x2={cx+c.cornerX} y2={cornerArcY} />
      <path d={`M ${cx-c.cornerX} ${cornerArcY} A ${c.threeR} ${c.threeR} 0 0 ${s0} ${cx+c.cornerX} ${cornerArcY}`} />
      {[1,2,3,4].map(i=>{const y=ftY+dir*i*(Math.abs(baseline-ftY)/5),kl=cx-c.keyW/2,kr=cx+c.keyW/2;return(<g key={`h${mirrored?'m':''}${i}`}><line x1={kl-6} y1={y} x2={kl} y2={y}/><line x1={kr} y1={y} x2={kr+6} y2={y}/></g>);})}
    </g>
  );
}

function CourtSVG({ courtType='NBA', colors, showGrid, gridSpacing=5, fullCourt=false }) {
  const c=COURT_TYPES[courtType]||COURT_TYPES.NBA, cx=COURT_W/2, totalH=fullCourt?COURT_H_FULL:COURT_H;
  const lc=colors?.lines||'rgba(255,255,255,0.85)', sw=1.5;
  return (
    <g>
      <rect x={0} y={0} width={COURT_W} height={totalH} fill={colors?.bg||'#1a5c2a'} rx={4}/>
      {showGrid&&(<g stroke={lc} strokeWidth={0.3} opacity={0.15}>{Array.from({length:Math.floor(COURT_W/(gridSpacing*10))+1},(_,i)=>(<line key={`gv${i}`} x1={i*gridSpacing*10} y1={0} x2={i*gridSpacing*10} y2={totalH}/>))}{Array.from({length:Math.floor(totalH/(gridSpacing*10))+1},(_,i)=>(<line key={`gh${i}`} x1={0} y1={i*gridSpacing*10} x2={COURT_W} y2={i*gridSpacing*10}/>))}</g>)}
      <g stroke={lc} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x={0} y={0} width={COURT_W} height={totalH} rx={2}/>
        {fullCourt?(<><line x1={0} y1={COURT_H} x2={COURT_W} y2={COURT_H} strokeWidth={sw+0.5}/><circle cx={cx} cy={COURT_H} r={60}/><HalfCourtLines c={c} cx={cx} h={COURT_H} baseline={COURT_H_FULL} mirrored={false}/><HalfCourtLines c={c} cx={cx} h={COURT_H} baseline={0} mirrored={true}/></>):(<><line x1={0} y1={0} x2={COURT_W} y2={0} strokeWidth={sw+0.5}/><path d={`M ${cx-60} 0 A 60 60 0 0 1 ${cx+60} 0`}/><HalfCourtLines c={c} cx={cx} h={COURT_H} baseline={COURT_H} mirrored={false}/></>)}
      </g>
    </g>
  );
}

// ============================================================
// OBJECT RENDERERS
// ============================================================

function renderPlayer(obj, isSelected, onMD, showBall=true) {
  const { id,team,number,x,y,color,hasBall } = obj;
  const sel = isSelected ? '#3b82f6' : 'transparent';

  const ballIndicator = hasBall && showBall ? (
    <g>
      <circle cx={x+PLAYER_R-2} cy={y-PLAYER_R+2} r={6} fill="var(--primary-light)" stroke="#c2410c" strokeWidth={1}/>
      <path d={`M${x+PLAYER_R-5} ${y-PLAYER_R+2} Q${x+PLAYER_R-2} ${y-PLAYER_R-1} ${x+PLAYER_R+1} ${y-PLAYER_R+2}`} stroke="#c2410c" strokeWidth={0.8} fill="none"/>
    </g>
  ) : null;

  if (team==='defense') {
    const s=PLAYER_R-4;
    return (
      <g key={id} onPointerDown={e=>onMD(e,id)} style={{cursor:'pointer'}}>
        {isSelected&&<circle cx={x} cy={y} r={PLAYER_R+4} fill="none" stroke={sel} strokeWidth={3} strokeDasharray="4 2"/>}
        <line x1={x-s} y1={y-s} x2={x+s} y2={y+s} stroke={color||'#ef4444'} strokeWidth={2.5} strokeLinecap="round"/>
        <line x1={x+s} y1={y-s} x2={x-s} y2={y+s} stroke={color||'#ef4444'} strokeWidth={2.5} strokeLinecap="round"/>
        <text x={x} y={y+PLAYER_R+12} textAnchor="middle" fill={color||'#ef4444'} fontSize={11} fontWeight={700} style={{userSelect:'none'}}>{number}</text>
        {ballIndicator}
      </g>
    );
  }

  const isBall = team==='ball';
  return (
    <g key={id} onPointerDown={e=>onMD(e,id)} style={{cursor:'pointer'}}>
      {isSelected&&<circle cx={x} cy={y} r={PLAYER_R+4} fill="none" stroke={sel} strokeWidth={3} strokeDasharray="4 2"/>}
      <circle cx={x} cy={y} r={PLAYER_R} fill={isBall?'#ffffff':'#ffffff'} stroke={isBall?'#374151':'#333'} strokeWidth={isBall?2.5:2}/>
      {isBall&&<circle cx={x+6} cy={y-6} r={3.5} fill="none" stroke="#374151" strokeWidth={1.5}/>}
      <text x={x} y={y+1} textAnchor="middle" dominantBaseline="central" fill="#333" fontSize={isBall?11:12} fontWeight={700} style={{userSelect:'none'}}>{number}</text>
      {ballIndicator}
    </g>
  );
}

function renderArrow(obj, isSelected, onMD, objects, showCP) {
  const r = resolveArrow(obj, objects);
  const { x1,y1,x2,y2,mx,my } = r;
  const { id,type,color='#ffffff',strokeType='solid',arrowhead=true,shape } = obj;
  const col=color, sw=2;
  const dash = strokeType==='dashed'?'8 5':strokeType==='dotted'?'3 3':undefined;

  const snapDots = (
    <g>
      {obj.startLink && <circle cx={x1} cy={y1} r={3} fill="#3b82f6" opacity={0.6}/>}
      {obj.endLink && <circle cx={x2} cy={y2} r={3} fill="#3b82f6" opacity={0.6}/>}
    </g>
  );

  if (type==='screen') {
    const a=Math.atan2(y2-y1,x2-x1), p=a+Math.PI/2, bl=18;
    return (<g key={id} onPointerDown={e=>onMD(e,id)} style={{cursor:'pointer'}}>
      {isSelected&&<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth={6} opacity={0.3} strokeLinecap="round"/>}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={sw} strokeLinecap="round"/>
      <line x1={x2+Math.cos(p)*bl} y1={y2+Math.sin(p)*bl} x2={x2-Math.cos(p)*bl} y2={y2-Math.sin(p)*bl} stroke={col} strokeWidth={3} strokeLinecap="round"/>
      {snapDots}
    </g>);
  }

  if (type==='handoff') {
    const hx=(x1+x2)/2, hy=(y1+y2)/2;
    const a=Math.atan2(y2-y1,x2-x1), p=a+Math.PI/2, bl=12;
    return (<g key={id} onPointerDown={e=>onMD(e,id)} style={{cursor:'pointer'}}>
      {isSelected&&<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth={6} opacity={0.3} strokeLinecap="round"/>}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={sw} strokeLinecap="round"/>
      <line x1={hx+Math.cos(p)*bl} y1={hy+Math.sin(p)*bl} x2={hx-Math.cos(p)*bl} y2={hy-Math.sin(p)*bl} stroke={col} strokeWidth={3} strokeLinecap="round"/>
      <line x1={x1+Math.cos(p)*8} y1={y1+Math.sin(p)*8} x2={x1-Math.cos(p)*8} y2={y1-Math.sin(p)*8} stroke={col} strokeWidth={2} strokeLinecap="round"/>
      <line x1={x2+Math.cos(p)*8} y1={y2+Math.sin(p)*8} x2={x2-Math.cos(p)*8} y2={y2-Math.sin(p)*8} stroke={col} strokeWidth={2} strokeLinecap="round"/>
      {snapDots}
    </g>);
  }

  let pathD, afX, afY;
  const isCurved = shape===1 && mx!=null;

  if (type==='shot') {
    if (isCurved) { pathD=`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`; afX=mx; afY=my; }
    else { const c=midCP(x1,y1,x2,y2,-40); pathD=`M ${x1} ${y1} Q ${c.x} ${c.y} ${x2} ${y2}`; afX=c.x; afY=c.y; }
    return (<g key={id} onPointerDown={e=>onMD(e,id)} style={{cursor:'pointer'}}>
      {isSelected&&<path d={pathD} stroke="#3b82f6" strokeWidth={6} fill="none" opacity={0.3}/>}
      <path d={pathD} stroke={col} strokeWidth={sw} fill="none" strokeDasharray="4 4" strokeLinecap="round"/>
      {snapDots}
    </g>);
  }

  if (type==='dribble') {
    pathD = isCurved ? curvedZigzag(x1,y1,mx,my,x2,y2) : zigzag(x1,y1,x2,y2);
    afX = isCurved ? mx : x1; afY = isCurved ? my : y1;
  } else if (isCurved) {
    pathD=`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`; afX=mx; afY=my;
  } else {
    pathD=`M ${x1} ${y1} L ${x2} ${y2}`; afX=x1; afY=y1;
  }

  const ah = arrowhead!==false ? arrowheadPts(afX,afY,x2,y2,10) : null;

  const handleX = isCurved ? mx : (x1+x2)/2;
  const handleY = isCurved ? my : (y1+y2)/2;

  return (
    <g key={id} onPointerDown={e=>onMD(e,id)} style={{cursor:'pointer'}}>
      {isSelected&&<path d={pathD} stroke="#3b82f6" strokeWidth={6} fill="none" opacity={0.3} strokeLinecap="round"/>}
      <path d={pathD} stroke={col} strokeWidth={sw} fill="none" strokeDasharray={dash} strokeLinecap="round"/>
      {ah&&<polygon points={ah.map(p=>p.join(',')).join(' ')} fill={col}/>}
      {obj.step>0&&(()=>{const bx=isCurved?ptOnBez(x1,y1,mx,my,x2,y2,0.5).x:(x1+x2)/2,by=isCurved?ptOnBez(x1,y1,mx,my,x2,y2,0.5).y:(y1+y2)/2;return(<g><circle cx={bx} cy={by} r={9} fill="#2563eb"/><text x={bx} y={by+1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={10} fontWeight={700}>{obj.step}</text></g>);})()}
      {snapDots}
      {showCP && (
        <circle cx={handleX} cy={handleY} r={5} fill="#2563eb" stroke="white" strokeWidth={1.5} style={{cursor:'move'}} data-control={id}/>
      )}
    </g>
  );
}

function renderTextObj(obj, isSelected, onMD) {
  const {id,x,y,value,fontSize=14,color='#ffffff'}=obj;
  return (<g key={id} onPointerDown={e=>onMD(e,id)} style={{cursor:'pointer'}}>
    {isSelected&&<rect x={x-4} y={y-fontSize-2} width={(obj.width||80)+8} height={fontSize+8} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" rx={3}/>}
    <text x={x} y={y} fill={color} fontSize={fontSize} fontWeight={600} style={{userSelect:'none'}}>{value||'Text'}</text>
  </g>);
}

function renderBallAnim(ballPos) {
  if (!ballPos) return null;
  return (
    <g>
      <circle cx={ballPos.x} cy={ballPos.y} r={7} fill="var(--primary-light)" stroke="#c2410c" strokeWidth={1.5}/>
      <path d={`M${ballPos.x-3} ${ballPos.y} Q${ballPos.x} ${ballPos.y-3} ${ballPos.x+3} ${ballPos.y}`} stroke="#c2410c" strokeWidth={0.8} fill="none"/>
    </g>
  );
}

// ============================================================
// AI MODALS
// ============================================================

function PlayGeneratorModal({ onClose, onApply }) {
  const [history, setHistory] = useState([{ role:'assistant', content:"Hey coach! Tell me about your team \u2014 what positions do you have, who are your strongest players, and what are your main struggles on offense?" }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(null);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [history]);

  async function handleSend(e) {
    e.preventDefault(); if(!input.trim()||loading) return;
    const msg=input.trim(); setInput(''); setLoading(true);
    const nh=[...history,{role:'user',content:msg}]; setHistory(nh);
    try { const res=await apiFetch('/ai/generate-play',{method:'POST',body:JSON.stringify({message:msg,history})}); const d=await res.json(); setHistory([...nh,{role:'assistant',content:d.reply||d.error}]); if(d.play) setPendingPlay(d.play); }
    catch { setHistory([...nh,{role:'assistant',content:'Something went wrong.'}]); }
    setLoading(false);
  }
  function renderText(t){return(t||'').split('\n').map((l,i)=>{if(!l.trim())return null;const ps=l.split(/\*\*(.+?)\*\*/g);const rd=ps.map((p,j)=>j%2===1?<strong key={j} className="font-bold text-white">{p}</strong>:p);if(l.startsWith('- ')||l.startsWith('\u2022 '))return<li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{rd}</li>;return<p key={i} className="text-sm text-gray-300 leading-relaxed">{rd}</p>;});}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]" style={{...glassCardStrong, boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(var(--primary-rgb),0.05)', animation:'fadeSlideIn 0.35s ease forwards'}}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-black text-white">Ask AI For Help</h2>
            <p className="text-xs text-gray-500">Describe your team -- AI will design a custom play</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all text-lg">x</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.1) transparent'}}>{history.map((m,i)=>(<div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>{m.role==='assistant'&&<div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mr-2 mt-0.5 text-xs font-black text-white" style={{background:'linear-gradient(135deg, var(--primary), var(--accent))', boxShadow:'0 2px 8px rgba(var(--primary-rgb),0.3)'}}>AI</div>}<div className="max-w-xs px-4 py-2.5 rounded-2xl text-sm space-y-1" style={m.role==='user'?{background:'linear-gradient(135deg, var(--primary), #c44a1a)',color:'white',borderBottomRightRadius:4,boxShadow:'0 2px 12px rgba(var(--primary-rgb),0.3)'}:{background:'rgba(255,255,255,0.04)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.06)',color:'white',borderBottomLeftRadius:4}}>{m.role==='assistant'?renderText(m.content):m.content}</div></div>))}{loading&&<div className="flex justify-start"><div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mr-2 text-xs font-black text-white" style={{background:'linear-gradient(135deg, var(--primary), var(--accent))'}}>AI</div><div className="px-4 py-2.5 rounded-2xl text-sm text-gray-400" style={{background:'rgba(255,255,255,0.04)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.06)'}}>Designing...</div></div>}<div ref={bottomRef}/></div>
        {pendingPlay&&<div className="mx-4 mb-2 px-4 py-3 rounded-xl flex items-center justify-between gap-3" style={{background:'rgba(74, 222, 128, 0.06)', border:'1px solid rgba(74, 222, 128, 0.15)', backdropFilter:'blur(12px)'}}><div><p className="text-sm font-bold text-green-400">&ldquo;{pendingPlay.name}&rdquo; ready!</p><p className="text-xs text-gray-500">Apply to see the diagram</p></div><button onClick={()=>{onApply(pendingPlay);onClose();}} className="px-4 py-2 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all" style={{background:'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow:'0 4px 12px rgba(22,163,74,0.3)', border:'1px solid rgba(34,197,94,0.3)'}}>Apply</button></div>}
        <form onSubmit={handleSend} className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}><input value={input} onChange={e=>setInput(e.target.value)} disabled={loading} placeholder="Describe your team..." className="flex-1 px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm disabled:opacity-50 transition-all" style={{...glassInput}} autoFocus onFocus={e=>{e.target.style.border='1px solid rgba(var(--primary-rgb),0.4)';e.target.style.boxShadow='0 0 0 3px rgba(var(--primary-rgb),0.08)';}} onBlur={e=>{e.target.style.border='1px solid rgba(255,255,255,0.06)';e.target.style.boxShadow='none';}}/><button type="submit" disabled={loading||!input.trim()} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-30 hover:opacity-90 transition-all hover:scale-[1.02]" style={{...gradientBtn, border:'1px solid rgba(var(--primary-light-rgb),0.3)'}}>Send</button></form>
      </div>
    </div>
  );
}

function AnalysisModal({ canvasPng, playName, onClose }) {
  const [analysis,setAnalysis]=useState('');const [loading,setLoading]=useState(true);const [chatHistory,setChatHistory]=useState([]);const [input,setInput]=useState('');const [chatLoading,setChatLoading]=useState(false);const [shareMsg,setShareMsg]=useState('');const bottomRef=useRef(null);
  useEffect(()=>{analyze();},[]);useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[chatHistory]);
  async function analyze(){setLoading(true);try{const r=await apiFetch('/ai/analyze-play',{method:'POST',body:JSON.stringify({canvas_png:canvasPng,name:playName})});const d=await r.json();if(!r.ok)throw new Error(d.error);setAnalysis(d.analysis);}catch(e){setAnalysis(`Error: ${e.message}`);}setLoading(false);}
  async function handleShare(){setShareMsg('Sharing...');try{const uid=localStorage.getItem('userId');let iu=null;try{iu=await uploadPlayDiagram(canvasPng,uid);}catch{}const r=await apiFetch('/ai/share-to-team',{method:'POST',body:JSON.stringify({content:analysis,title:playName,type:'play',image_url:iu})});const d=await r.json();if(r.ok)setShareMsg(`Shared to ${d.sent} player${d.sent!==1?'s':''}`);else setShareMsg(d.error||`Error ${r.status}`);}catch(e){setShareMsg(e?.message||'Network error');}setTimeout(()=>setShareMsg(''),4000);}
  async function handleChat(e){e.preventDefault();if(!input.trim()||chatLoading)return;const m=input.trim();setInput('');setChatLoading(true);const nh=[...chatHistory,{role:'user',content:m}];setChatHistory(nh);try{const ha=[{role:'assistant',content:analysis},...chatHistory];const r=await apiFetch('/ai/film-chat',{method:'POST',body:JSON.stringify({base64_frame:canvasPng,history:ha,message:m})});const d=await r.json();setChatHistory([...nh,{role:'assistant',content:d.reply||d.error}]);}catch{setChatHistory([...nh,{role:'assistant',content:'Something went wrong.'}]);}setChatLoading(false);}
  function ib(s){const p=s.split(/\*\*(.+?)\*\*/g);if(p.length===1)return s;return p.map((x,j)=>j%2===1?<strong key={j} className="font-bold text-white">{x}</strong>:x);}
  function rt(t){return(t||'').split('\n').map((l,i)=>{if(l.startsWith('**')&&l.endsWith('**')&&l.length>4)return<h3 key={i} className="text-sm font-black text-white uppercase tracking-wide mt-3 mb-1">{l.replace(/\*\*/g,'')}</h3>;if(l.startsWith('- ')||l.startsWith('\u2022 '))return<li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{ib(l.slice(2))}</li>;if(!l.trim())return null;return<p key={i} className="text-sm text-gray-300 leading-relaxed">{ib(l)}</p>;});}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]" style={{...glassCardStrong, boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(var(--primary-rgb),0.05)', animation:'fadeSlideIn 0.35s ease forwards'}}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-black text-white">AI Play Analysis</h2>
            {playName&&<p className="text-xs text-gray-500">{playName}</p>}
          </div>
          <div className="flex items-center gap-3">
            {!loading&&analysis&&<button onClick={handleShare} className="text-xs px-3 py-1.5 rounded-xl font-bold text-white hover:opacity-90 transition-all hover:scale-[1.02]" style={{background:'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow:'0 2px 8px rgba(22,163,74,0.3)', border:'1px solid rgba(34,197,94,0.3)'}}>{shareMsg||'Share to Team'}</button>}
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all text-lg">x</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.1) transparent'}}>{loading?<div className="flex flex-col items-center py-12 gap-3"><div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'var(--primary)', borderTopColor:'transparent'}}/><p className="text-gray-400 text-sm">Analyzing...</p></div>:<><div className="space-y-1">{rt(analysis)}</div>{chatHistory.length>0&&<div className="pt-4 space-y-3" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>{chatHistory.map((m,i)=>(<div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className="max-w-xs px-4 py-2.5 rounded-2xl text-sm" style={m.role==='user'?{background:'linear-gradient(135deg, var(--primary), #c44a1a)',color:'white',borderBottomRightRadius:4,boxShadow:'0 2px 12px rgba(var(--primary-rgb),0.3)'}:{background:'rgba(255,255,255,0.04)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.06)',color:'white',borderBottomLeftRadius:4}}>{m.role==='assistant'?<div className="space-y-1">{rt(m.content)}</div>:m.content}</div></div>))}{chatLoading&&<div className="flex justify-start"><div className="px-4 py-2.5 rounded-2xl text-sm text-gray-400" style={{background:'rgba(255,255,255,0.04)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.06)'}}>Thinking...</div></div>}</div>}<div ref={bottomRef}/></>}</div>
        {!loading&&<form onSubmit={handleChat} className="px-4 py-3 flex gap-2" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}><input value={input} onChange={e=>setInput(e.target.value)} disabled={chatLoading} placeholder="Ask about this play..." className="flex-1 px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm disabled:opacity-50 transition-all" style={glassInput} onFocus={e=>{e.target.style.border='1px solid rgba(var(--primary-rgb),0.4)';e.target.style.boxShadow='0 0 0 3px rgba(var(--primary-rgb),0.08)';}} onBlur={e=>{e.target.style.border='1px solid rgba(255,255,255,0.06)';e.target.style.boxShadow='none';}}/><button type="submit" disabled={chatLoading||!input.trim()} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-30 hover:opacity-90 transition-all hover:scale-[1.02]" style={{...gradientBtn, border:'1px solid rgba(var(--primary-light-rgb),0.3)'}}>Ask</button></form>}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS PANEL
// ============================================================

function SettingsPanel({ settings:s, onChange, onClose }) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-72 overflow-y-auto" style={{...glassCardStrong, borderLeft:'1px solid rgba(255,255,255,0.06)', boxShadow:'-10px 0 50px rgba(0,0,0,0.4)', animation:'fadeSlideIn 0.3s ease forwards', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.1) transparent'}}>
      <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <h3 className="font-black text-white text-sm">Court Settings</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">x</button>
      </div>
      <div className="p-4 space-y-5">
        <div><label className="text-xs text-gray-400 font-semibold mb-2 block">Court Type</label><div className="grid grid-cols-2 gap-2">{Object.entries(COURT_TYPES).map(([k,ct])=>(<button key={k} onClick={()=>onChange({...s,courtType:k})} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]" style={glassToolBtnMuted(s.courtType===k)}>{ct.label}</button>))}</div></div>
        <div><label className="text-xs text-gray-400 font-semibold mb-2 block">Court Size</label><div className="flex gap-2"><button onClick={()=>onChange({...s,fullCourt:false})} className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all" style={glassToolBtnMuted(!s.fullCourt)}>Half Court</button><button onClick={()=>onChange({...s,fullCourt:true})} className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all" style={glassToolBtnMuted(s.fullCourt)}>Full Court</button></div></div>
        <div><label className="text-xs text-gray-400 font-semibold mb-2 block">Court Color</label><div className="flex gap-2 flex-wrap">{COLOR_PRESETS.map(cp=>(<button key={cp.id} onClick={()=>onChange({...s,courtColor:cp})} className="w-9 h-9 rounded-xl transition-all hover:scale-110" style={{backgroundColor:cp.bg,border:s.courtColor?.id===cp.id?'2px solid var(--accent-light)':'2px solid var(--glass-border)',boxShadow:s.courtColor?.id===cp.id?'0 0 10px var(--accent-glow)':'none'}} title={cp.label}/>))}</div></div>
        <div><label className="flex items-center gap-2 text-xs text-gray-400 font-semibold cursor-pointer"><input type="checkbox" checked={s.showGrid||false} onChange={e=>onChange({...s,showGrid:e.target.checked})} className="rounded accent-orange-500"/>Show Grid</label>{s.showGrid&&<div className="mt-2"><label className="text-xs text-gray-500 block mb-1">Spacing: {s.gridSpacing||5}ft</label><input type="range" min={1} max={10} step={1} value={s.gridSpacing||5} onChange={e=>onChange({...s,gridSpacing:Number(e.target.value)})} className="w-full accent-orange-500"/></div>}</div>
      </div>
    </div>
  );
}

// ============================================================
// PROPERTY PANEL
// ============================================================

function PropertyPanel({ obj, onUpdate, onDelete }) {
  if (!obj) return null;
  function u(c) { onUpdate(obj.id, c); }

  if (obj.type==='player') {
    return (<div className="space-y-3">
      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Player</h4>
      <div><label className="text-xs text-gray-500 block mb-1">Type</label><div className="flex gap-1">{[['offense','O'],['defense','X'],['ball','BH']].map(([t,l])=>(<button key={t} onClick={()=>u({team:t,color:t==='defense'?'#ef4444':'#ffffff'})} className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all" style={glassToolBtnMuted(obj.team===t)}>{l}</button>))}</div></div>
      <div><label className="text-xs text-gray-500 block mb-1">Label</label><div className="flex gap-1">{['1','2','3','4','5'].map(n=>(<button key={n} onClick={()=>u({number:n})} className="w-8 h-8 rounded-lg text-xs font-bold transition-all" style={glassToolBtnMuted(obj.number===n)}>{n}</button>))}</div><div className="flex gap-1 mt-1">{['PG','SG','SF','PF','C'].map(n=>(<button key={n} onClick={()=>u({number:n})} className="flex-1 py-1 rounded-lg text-[10px] font-bold transition-all" style={glassToolBtnMuted(obj.number===n)}>{n}</button>))}</div></div>
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer"><input type="checkbox" checked={obj.hasBall||false} onChange={e=>u({hasBall:e.target.checked})} className="rounded accent-orange-500"/>Has Ball</label>
      <div><label className="text-xs text-gray-500 block mb-1">Color</label><input type="color" value={obj.color||'#ffffff'} onChange={e=>u({color:e.target.value})} className="w-8 h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--glass-border)'}}/></div>
      <button onClick={()=>onDelete(obj.id)} className="w-full py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-900/20 transition-all" style={{border:'1px solid rgba(239,68,68,0.3)'}}>Delete</button>
    </div>);
  }

  if (ARROW_SUBTYPES.includes(obj.type)) {
    return (<div className="space-y-3">
      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Action</h4>
      <div><label className="text-xs text-gray-500 block mb-1">Type</label><div className="grid grid-cols-3 gap-1">{[['cut','Cut'],['pass','Pass'],['dribble','Dribble'],['screen','Screen'],['shot','Shot'],['handoff','Handoff']].map(([t,l])=>(<button key={t} onClick={()=>u({type:t,strokeType:t==='pass'?'dashed':t==='shot'?'dotted':'solid'})} className="py-1.5 rounded-lg text-[10px] font-bold transition-all" style={glassToolBtnMuted(obj.type===t)}>{l}</button>))}</div></div>
      <div><label className="text-xs text-gray-500 block mb-1">Shape</label><div className="flex gap-1"><button onClick={()=>u({shape:0})} className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all" style={glassToolBtnMuted((obj.shape||0)===0)}>Straight</button><button onClick={()=>{const r=resolveArrow(obj,[]);const c=midCP(r.x1,r.y1,r.x2,r.y2,30);u({shape:1,mx:c.x,my:c.y});}} className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all" style={glassToolBtnMuted(obj.shape===1)}>Curved</button></div></div>
      {obj.type!=='screen'&&obj.type!=='handoff'&&<div><label className="text-xs text-gray-500 block mb-1">Line Style</label><div className="flex gap-1">{[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']].map(([t,l])=>(<button key={t} onClick={()=>u({strokeType:t})} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={glassToolBtnMuted(obj.strokeType===t)}>{l}</button>))}</div></div>}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer"><input type="checkbox" checked={obj.arrowhead!==false} onChange={e=>u({arrowhead:e.target.checked})} className="rounded accent-orange-500"/>Arrowhead</label>
      <div><label className="text-xs text-gray-500 block mb-1">Step #</label><div className="flex gap-1">{[0,1,2,3,4,5,6].map(n=>(<button key={n} onClick={()=>u({step:n})} className="w-7 h-7 rounded-lg text-[10px] font-bold transition-all" style={glassToolBtnMuted((obj.step||0)===n)}>{n===0?'-':n}</button>))}</div></div>
      <div><label className="text-xs text-gray-500 block mb-1">Color</label><input type="color" value={obj.color||'#ffffff'} onChange={e=>u({color:e.target.value})} className="w-8 h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--glass-border)'}}/></div>
      <button onClick={()=>onDelete(obj.id)} className="w-full py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-900/20 transition-all" style={{border:'1px solid rgba(239,68,68,0.3)'}}>Delete</button>
    </div>);
  }

  if (obj.type==='text') {
    return (<div className="space-y-3">
      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Text</h4>
      <div><label className="text-xs text-gray-500 block mb-1">Content</label><input type="text" value={obj.value||''} onChange={e=>u({value:e.target.value})} className="w-full px-2 py-1.5 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 transition-all" style={glassInput}/></div>
      <div><label className="text-xs text-gray-500 block mb-1">Size</label><div className="flex gap-1 flex-wrap">{[10,12,14,18,24].map(s=>(<button key={s} onClick={()=>u({fontSize:s})} className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all" style={glassToolBtnMuted((obj.fontSize||14)===s)}>{s}</button>))}</div></div>
      <div><label className="text-xs text-gray-500 block mb-1">Color</label><input type="color" value={obj.color||'#ffffff'} onChange={e=>u({color:e.target.value})} className="w-8 h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--glass-border)'}}/></div>
      <button onClick={()=>onDelete(obj.id)} className="w-full py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-900/20 transition-all" style={{border:'1px solid rgba(239,68,68,0.3)'}}>Delete</button>
    </div>);
  }
  return null;
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function PlaybookPage() {
  const svgRef = useRef(null);

  // Phases
  const [phases, setPhases] = useState([{ id: uid(), title: '', objects: [] }]);
  const [activePhaseId, setActivePhaseId] = useState(phases[0].id);

  // Tool
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragCP, setDragCP] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [snapPreview, setSnapPreview] = useState(null);

  // Settings
  const [settings, setSettings] = useState({ courtType:'NBA', courtColor:COLOR_PRESETS[0], fullCourt:false, showGrid:false, gridSpacing:5 });

  // Play management
  const [playName, setPlayName] = useState('Untitled Play');
  const [currentPlayId, setCurrentPlayId] = useState(null);
  const [savedPlays, setSavedPlays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // UI
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayGenerator, setShowPlayGenerator] = useState(false);
  const [analysisModal, setAnalysisModal] = useState(null);
  const [showSaved, setShowSaved] = useState(true);
  const [editingTextId, setEditingTextId] = useState(null);

  // History
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Animation
  const [animPlaying, setAnimPlaying] = useState(false);
  const [animPaused, setAnimPaused] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [animProgress, setAnimProgress] = useState(0);
  const animFrameRef = useRef(null);
  const animStartRef = useRef(null);
  const animPausedProgress = useRef(0);

  // Computed
  const activePhase = useMemo(() => phases.find(p => p.id === activePhaseId), [phases, activePhaseId]);
  const objects = activePhase?.objects || [];
  const selectedObj = useMemo(() => objects.find(o => o.id === selectedId), [objects, selectedId]);
  const courtH = settings.fullCourt ? COURT_H_FULL : COURT_H;

  // ---- History ----
  function pushHist() { setPast(p => [...p, JSON.parse(JSON.stringify(phases))]); setFuture([]); }
  function undo() { if(!past.length) return; setFuture(f=>[JSON.parse(JSON.stringify(phases)),...f]); setPhases(past[past.length-1]); setPast(p=>p.slice(0,-1)); }
  function redo() { if(!future.length) return; setPast(p=>[...p,JSON.parse(JSON.stringify(phases))]); setPhases(future[0]); setFuture(f=>f.slice(1)); }

  // ---- Object ops ----
  function updateObjs(newObjs) { setPhases(p => p.map(ph => ph.id===activePhaseId ? {...ph, objects:newObjs} : ph)); }
  function updateObj(id, ch) { pushHist(); updateObjs(objects.map(o => o.id===id ? {...o,...ch} : o)); }
  function deleteObj(id) { pushHist(); updateObjs(objects.filter(o => o.id!==id)); if(selectedId===id) setSelectedId(null); }
  function addObj(obj) { pushHist(); updateObjs([...objects, obj]); }

  // Rotate z-order of stacked players so the one hidden underneath becomes visible.
  function cyclePlayerStack(stackIds) {
    const idSet = new Set(stackIds);
    const indices = [];
    objects.forEach((o, i) => { if (idSet.has(o.id)) indices.push(i); });
    if (indices.length < 2) return;
    pushHist();
    const topIdx = indices[indices.length - 1];
    const bottomIdx = indices[0];
    const next = objects.slice();
    const [top] = next.splice(topIdx, 1);
    next.splice(bottomIdx, 0, top);
    updateObjs(next);
  }

  // ---- Phase ops ----
  function addPhase() { pushHist(); const p={id:uid(),title:'',objects:[]}; setPhases(ps=>[...ps,p]); setActivePhaseId(p.id); setSelectedId(null); }
  function duplicatePhase() { pushHist(); const src=phases.find(p=>p.id===activePhaseId); if(!src) return; const np={id:uid(),title:src.title?src.title+' (copy)':'',objects:JSON.parse(JSON.stringify(src.objects)).map(o=>({...o,id:uid()}))}; const idx=phases.findIndex(p=>p.id===activePhaseId); setPhases(ps=>[...ps.slice(0,idx+1),np,...ps.slice(idx+1)]); setActivePhaseId(np.id); setSelectedId(null); }
  function genNextFrame() {
    pushHist();
    const src = phases.find(p => p.id === activePhaseId);
    if (!src) return;
    const np = generateNextFrame(src);
    const idx = phases.findIndex(p => p.id === activePhaseId);
    setPhases(ps => [...ps.slice(0, idx + 1), np, ...ps.slice(idx + 1)]);
    setActivePhaseId(np.id);
    setSelectedId(null);
  }
  function deletePhase() { if(phases.length<=1) return; pushHist(); const idx=phases.findIndex(p=>p.id===activePhaseId); const np=phases.filter(p=>p.id!==activePhaseId); setPhases(np); setActivePhaseId(np[Math.min(idx,np.length-1)].id); setSelectedId(null); }
  function renamePhase(id,t) { setPhases(ps=>ps.map(p=>p.id===id?{...p,title:t}:p)); }

  // ---- SVG Handlers ----
  function getPos(e) { return svgRef.current ? getSVGPoint(svgRef.current, e.clientX, e.clientY) : {x:0,y:0}; }

  function handleMouseDown(e) {
    if (animPlaying) return;
    const pos = getPos(e);

    if (tool === 'select') {
      const cp = hitControlPt(pos.x, pos.y, objects, selectedId);
      if (cp) { setDragCP(cp); return; }
      const p = hitPlayer(pos.x, pos.y, objects);
      const a = !p && hitArrow(pos.x, pos.y, objects);
      const t = !p && !a && hitText(pos.x, pos.y, objects);
      if (p) { setSelectedId(p.id); setDragging({id:p.id,ox:pos.x-p.x,oy:pos.y-p.y,type:'player'}); }
      else if (a) { setSelectedId(a.id); const r=resolveArrow(a,objects); setDragging({id:a.id,ox:pos.x,oy:pos.y,sx1:r.x1,sy1:r.y1,sx2:r.x2,sy2:r.y2,smx:a.mx,smy:a.my,type:'arrow'}); }
      else if (t) { setSelectedId(t.id); setDragging({id:t.id,ox:pos.x-t.x,oy:pos.y-t.y,type:'text'}); }
      else setSelectedId(null);
      return;
    }

    if (tool === 'erase') {
      const p=hitPlayer(pos.x,pos.y,objects); if(p){deleteObj(p.id);return;}
      const a=hitArrow(pos.x,pos.y,objects); if(a){deleteObj(a.id);return;}
      const t=hitText(pos.x,pos.y,objects); if(t){deleteObj(t.id);return;}
      return;
    }

    const pt = parsePlayerTool(tool);
    if (pt) {
      addObj({ id:uid(), type:'player', team:pt.team, number:pt.number, x:pos.x, y:pos.y, color:pt.team==='defense'?'#ef4444':'#ffffff', hasBall:false });
      return;
    }

    if (ARROW_SUBTYPES.includes(tool)) {
      const snap = findSnap(pos.x, pos.y, objects);
      const sx = snap ? snap.x : pos.x;
      const sy = snap ? snap.y : pos.y;
      setDrawing({ type:tool, x1:sx, y1:sy, startLink:snap?.id||null });
      return;
    }

    if (tool === 'text') {
      const nid=uid();
      addObj({id:nid,type:'text',x:pos.x,y:pos.y,value:'Text',fontSize:14,color:'#ffffff',width:40});
      setSelectedId(nid); setEditingTextId(nid);
      return;
    }
  }

  function handleObjMD(e, id) {
    e.stopPropagation();
    try { svgRef.current?.setPointerCapture?.(e.pointerId); } catch {}
    if (animPlaying) return;
    const pos = getPos(e);
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    if (tool==='erase') { deleteObj(id); return; }
    if (tool==='select') {
      setSelectedId(id);
      if (obj.type==='player') setDragging({id,ox:pos.x-obj.x,oy:pos.y-obj.y,type:'player'});
      else if (ARROW_SUBTYPES.includes(obj.type)) { const r=resolveArrow(obj,objects); setDragging({id,ox:pos.x,oy:pos.y,sx1:r.x1,sy1:r.y1,sx2:r.x2,sy2:r.y2,smx:obj.mx,smy:obj.my,type:'arrow'}); }
      else if (obj.type==='text') setDragging({id,ox:pos.x-obj.x,oy:pos.y-obj.y,type:'text'});
    }
  }

  function handleMouseMove(e) {
    const pos = getPos(e);
    setMousePos(pos);

    if (drawing) {
      const snap = findSnap(pos.x, pos.y, objects);
      setSnapPreview(snap ? { x:snap.x, y:snap.y } : null);
    }

    if (dragCP) {
      updateObjs(objects.map(o => o.id===dragCP.id ? {...o, shape:1, mx:pos.x, my:pos.y} : o));
      return;
    }

    if (dragging) {
      const d=dragging;
      if (d.type==='player') {
        updateObjs(objects.map(o=>o.id===d.id?{...o,x:pos.x-d.ox,y:pos.y-d.oy}:o));
      } else if (d.type==='arrow') {
        const dx=pos.x-d.ox, dy=pos.y-d.oy;
        updateObjs(objects.map(o=>o.id===d.id?{...o,x1:d.sx1+dx,y1:d.sy1+dy,x2:d.sx2+dx,y2:d.sy2+dy,mx:d.smx!=null?d.smx+dx:undefined,my:d.smy!=null?d.smy+dy:undefined}:o));
      } else if (d.type==='text') {
        updateObjs(objects.map(o=>o.id===d.id?{...o,x:pos.x-d.ox,y:pos.y-d.oy}:o));
      }
    }
  }

  function handleMouseUp(e) {
    const pos = getPos(e);
    setSnapPreview(null);

    if (dragCP) { pushHist(); setDragCP(null); return; }
    if (dragging) { pushHist(); setDragging(null); return; }

    if (drawing) {
      const { x1, y1, type, startLink } = drawing;
      const dx=pos.x-x1, dy=pos.y-y1;
      if (Math.hypot(dx,dy) > 15) {
        const snap = findSnap(pos.x, pos.y, objects);
        const ex = snap ? snap.x : pos.x;
        const ey = snap ? snap.y : pos.y;
        addObj({
          id:uid(), type, x1, y1, x2:ex, y2:ey,
          shape:0, color:'#ffffff',
          strokeType: type==='pass'?'dashed':type==='shot'?'dotted':'solid',
          arrowhead: type!=='screen' && type!=='handoff',
          step: 0,
          startLink: startLink || null,
          endLink: snap?.id || null,
        });
      }
      setDrawing(null);
    }
  }

  function handleMouseLeave() { setMousePos(null); setDrawing(null); setDragging(null); setDragCP(null); setSnapPreview(null); }

  // Pointer events unify mouse + touch + pen. Capture keeps events flowing to
  // the SVG even if the finger drifts outside its bounds mid-drag on iPad.
  function handlePointerDown(e) {
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    handleMouseDown(e);
  }
  function handlePointerUp(e) {
    handleMouseUp(e);
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
  }

  // ---- Keyboard ----
  useEffect(() => {
    function kd(e) {
      if(editingTextId) return;
      if((e.key==='Delete'||e.key==='Backspace')&&selectedId&&!e.target.closest('input,textarea')){e.preventDefault();deleteObj(selectedId);}
      if(e.key==='z'&&(e.metaKey||e.ctrlKey)&&!e.shiftKey){e.preventDefault();undo();}
      if((e.key==='z'&&(e.metaKey||e.ctrlKey)&&e.shiftKey)||(e.key==='y'&&(e.metaKey||e.ctrlKey))){e.preventDefault();redo();}
      if(e.key==='v'&&!e.metaKey&&!e.ctrlKey&&!e.target.closest('input,textarea')) setTool('select');
      if(e.key==='e'&&!e.metaKey&&!e.ctrlKey&&!e.target.closest('input,textarea')) setTool('erase');
      if(e.key==='Escape'){setSelectedId(null);setDrawing(null);setEditingTextId(null);}
    }
    window.addEventListener('keydown',kd); return()=>window.removeEventListener('keydown',kd);
  }, [selectedId, objects, past, future, editingTextId]);

  // ---- Save/Load ----
  useEffect(() => { apiFetch('/plays').then(r=>r.json()).then(d=>setSavedPlays(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  function loadPlay(play) {
    try {
      let d=JSON.parse(play.canvas_json);
      if(!d.v||d.v<2) d=migrateV1(d);
      const lp=d.phases&&d.phases.length>0?d.phases:[{id:uid(),title:'',objects:[]}];
      setPhases(lp); setActivePhaseId(lp[0].id);
      if(d.settings) setSettings(s=>({...s,courtType:d.settings.courtType||s.courtType,courtColor:d.settings.courtColor||s.courtColor,fullCourt:d.settings.fullCourt||false}));
      setCurrentPlayId(play.id); setPlayName(play.name); setSelectedId(null); setPast([]); setFuture([]);
    } catch{}
  }

  async function savePlay() {
    setSaving(true);
    const cj=JSON.stringify({v:2,settings,phases});
    try {
      if(currentPlayId){const r=await apiFetch(`/plays/${currentPlayId}`,{method:'PUT',body:JSON.stringify({name:playName,canvas_json:cj})});const u=await r.json();setSavedPlays(p=>p.map(x=>x.id===currentPlayId?u:x));}
      else{const r=await apiFetch('/plays',{method:'POST',body:JSON.stringify({name:playName,canvas_json:cj})});const c=await r.json();setSavedPlays(p=>[c,...p]);setCurrentPlayId(c.id);}
      setSaveMsg('Saved!');setTimeout(()=>setSaveMsg(''),2000);
    }catch{setSaveMsg('Failed');}
    setSaving(false);
  }

  async function deletePlay(id) { if(!confirm('Delete this play?'))return; await apiFetch(`/plays/${id}`,{method:'DELETE'}); setSavedPlays(p=>p.filter(x=>x.id!==id)); if(currentPlayId===id) clearCanvas(); }

  function clearCanvas() { pushHist(); const nid=uid(); setPhases([{id:nid,title:'',objects:[]}]); setActivePhaseId(nid); setSelectedId(null); setCurrentPlayId(null); setPlayName('Untitled Play'); }

  function applyGenPlay(play) {
    clearCanvas();
    const objs=[];
    (play.players||[]).forEach((p,i)=>{objs.push({id:uid(),type:'player',team:p.type==='offense'?'offense':'defense',number:p.label||'1',x:p.x*(COURT_W/560),y:p.y*(COURT_H/440),color:p.type==='offense'?'#ffffff':'#ef4444',hasBall:i===0&&p.type==='offense'});});
    (play.lines||[]).forEach(l=>{objs.push({id:uid(),type:l.type||'cut',x1:l.x1*(COURT_W/560),y1:l.y1*(COURT_H/440),x2:l.x2*(COURT_W/560),y2:l.y2*(COURT_H/440),shape:0,color:'#ffffff',strokeType:l.type==='pass'?'dashed':'solid',arrowhead:true,step:l.step||0,startLink:null,endLink:null});});
    (play.screens||[]).forEach(s=>{objs.push({id:uid(),type:'screen',x1:s.x1*(COURT_W/560),y1:s.y1*(COURT_H/440),x2:s.x2*(COURT_W/560),y2:s.y2*(COURT_H/440),shape:0,color:'#ffffff',startLink:null,endLink:null});});
    const nid=uid(); setPhases([{id:nid,title:'',objects:objs}]); setActivePhaseId(nid);
    if(play.name) setPlayName(play.name);
  }

  // ---- Export PNG ----
  async function exportPNG() {
    const svg=svgRef.current; if(!svg)return null;
    const d=new XMLSerializer().serializeToString(svg);
    const img=new Image(), canvas=document.createElement('canvas');
    canvas.width=COURT_W*2; canvas.height=courtH*2;
    return new Promise(res=>{img.onload=()=>{canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);res(canvas.toDataURL('image/png').split(',')[1]);};img.onerror=()=>res(null);img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(d)));});
  }
  async function openAnalysis() { const p=await exportPNG(); if(p) setAnalysisModal({png:p,name:playName}); }

  // ============================================================
  // ANIMATION ENGINE
  // ============================================================

  function startAnim() {
    if (phases.length < 2) return;
    setAnimPlaying(true); setAnimPaused(false); setAnimProgress(0);
    animPausedProgress.current = 0; animStartRef.current = null;
  }
  function stopAnim() { setAnimPlaying(false); setAnimPaused(false); setAnimProgress(0); if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }
  function togglePause() {
    if (animPaused) { animStartRef.current = null; animPausedProgress.current = animProgress; }
    else { animPausedProgress.current = animProgress; }
    setAnimPaused(p => !p);
  }

  useEffect(() => {
    if (!animPlaying || animPaused) return;
    const totalPhases = phases.length - 1;
    if (totalPhases <= 0) { stopAnim(); return; }
    const totalDuration = totalPhases * (ANIM_PHASE_MS / animSpeed);

    function tick(ts) {
      if (!animStartRef.current) animStartRef.current = ts - (animPausedProgress.current / totalPhases) * totalDuration;
      const elapsed = ts - animStartRef.current;
      const progress = Math.min((elapsed / totalDuration) * totalPhases, totalPhases);
      setAnimProgress(progress);

      if (progress >= totalPhases) {
        setTimeout(() => stopAnim(), 300);
        return;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [animPlaying, animPaused, animSpeed, phases.length]);

  // Compute animated display objects
  const displayObjects = useMemo(() => {
    if (!animPlaying || phases.length < 2) return objects;

    const phaseIdx = Math.floor(animProgress);
    const t = animProgress - phaseIdx;
    const eased = easeInOut(Math.min(t, 1));

    const fromPhase = phases[Math.min(phaseIdx, phases.length - 1)];
    const toPhase = phases[Math.min(phaseIdx + 1, phases.length - 1)];
    if (!fromPhase || !toPhase || fromPhase.id === toPhase.id) return fromPhase?.objects || [];

    const blended = [];
    for (const toObj of toPhase.objects) {
      if (toObj.type === 'player') {
        const fromObj = fromPhase.objects.find(o => o.type==='player' && o.number===toObj.number && o.team===toObj.team);
        if (fromObj) {
          blended.push({ ...toObj, x: fromObj.x+(toObj.x-fromObj.x)*eased, y: fromObj.y+(toObj.y-fromObj.y)*eased, hasBall: eased < 0.5 ? fromObj.hasBall : toObj.hasBall });
        } else blended.push(toObj);
      }
    }
    const arrowsFrom = fromPhase.objects.filter(o => ARROW_SUBTYPES.includes(o.type));
    const arrowsTo = toPhase.objects.filter(o => ARROW_SUBTYPES.includes(o.type));
    if (eased < 0.5) blended.push(...arrowsFrom);
    else blended.push(...arrowsTo);

    blended.push(...toPhase.objects.filter(o => o.type === 'text'));

    return blended;
  }, [animPlaying, animProgress, phases, objects]);

  // Ball position during pass animation
  const animBallPos = useMemo(() => {
    if (!animPlaying || phases.length < 2) return null;
    const phaseIdx = Math.floor(animProgress);
    const t = easeInOut(Math.min(animProgress - phaseIdx, 1));
    const fromPhase = phases[Math.min(phaseIdx, phases.length - 1)];
    if (!fromPhase) return null;

    const passArrows = fromPhase.objects.filter(o => o.type === 'pass' && o.startLink && o.endLink);
    if (passArrows.length === 0) return null;
    const pa = passArrows[0];
    const r = resolveArrow(pa, fromPhase.objects);
    return { x: r.x1 + (r.x2 - r.x1) * t, y: r.y1 + (r.y2 - r.y1) * t };
  }, [animPlaying, animProgress, phases]);

  // Seek handler
  function handleSeek(e) {
    const val = parseFloat(e.target.value);
    setAnimProgress(val);
    animPausedProgress.current = val;
    animStartRef.current = null;
    if (!animPlaying) {
      setAnimPlaying(true); setAnimPaused(true);
    }
  }

  // ---- Drawing preview ----
  function renderPreview() {
    if (!drawing || !mousePos) return null;
    const { type, x1, y1 } = drawing;
    const x2 = snapPreview?.x || mousePos.x;
    const y2 = snapPreview?.y || mousePos.y;

    if (type==='screen') {
      const a=Math.atan2(y2-y1,x2-x1),p=a+Math.PI/2,bl=18;
      return (<g opacity={0.5}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={2}/><line x1={x2+Math.cos(p)*bl} y1={y2+Math.sin(p)*bl} x2={x2-Math.cos(p)*bl} y2={y2-Math.sin(p)*bl} stroke="white" strokeWidth={3} strokeLinecap="round"/></g>);
    }
    if (type==='handoff') {
      const hx=(x1+x2)/2,hy=(y1+y2)/2,a=Math.atan2(y2-y1,x2-x1),p=a+Math.PI/2;
      return (<g opacity={0.5}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={2}/><line x1={hx+Math.cos(p)*12} y1={hy+Math.sin(p)*12} x2={hx-Math.cos(p)*12} y2={hy-Math.sin(p)*12} stroke="white" strokeWidth={3} strokeLinecap="round"/></g>);
    }
    if (type==='dribble') return <path d={zigzag(x1,y1,x2,y2)} stroke="white" strokeWidth={2} fill="none" opacity={0.5}/>;
    if (type==='shot') { const c=midCP(x1,y1,x2,y2,-40); return <path d={`M ${x1} ${y1} Q ${c.x} ${c.y} ${x2} ${y2}`} stroke="white" strokeWidth={2} fill="none" strokeDasharray="4 4" opacity={0.5}/>; }
    const dash=type==='pass'?'8 5':undefined;
    const ah=arrowheadPts(x1,y1,x2,y2,10);
    return (<g opacity={0.5}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={2} strokeDasharray={dash}/><polygon points={ah.map(p=>p.join(',')).join(' ')} fill="white"/></g>);
  }

  const cursor = tool==='select'?(dragging||dragCP?'grabbing':'default'):'crosshair';

  // ============================================================
  // RENDER
  // ============================================================

  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  return (
    <div style={cssVars}>
      <style dangerouslySetInnerHTML={{ __html: MOUNT_KEYFRAMES }} />
      {showPlayGenerator && <PlayGeneratorModal onClose={()=>setShowPlayGenerator(false)} onApply={applyGenPlay}/>}
      {analysisModal && <AnalysisModal canvasPng={analysisModal.png} playName={analysisModal.name} onClose={()=>setAnalysisModal(null)}/>}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={()=>setShowSettings(false)}/>}

      {/* Header */}
      <div className="mb-6" style={{ animation: mounted ? 'fadeSlideIn 0.5s ease forwards' : 'none', opacity: mounted ? 1 : 0 }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Play Creator</h1>
            <p className="text-gray-500 mt-1 text-sm">Design plays, animate, and get AI analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowPlayGenerator(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all hover:scale-[1.02]" style={{background:'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow:'0 4px 20px rgba(124,58,237,0.3)', border:'1px solid rgba(168,85,247,0.3)'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/></svg>AI Generate
            </button>
            <button onClick={()=>setShowSettings(!showSettings)} className="px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-all hover:scale-[1.02]" style={{...glassCard, boxShadow:'0 2px 10px rgba(0,0,0,0.15)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </button>
          </div>
        </div>
        {/* Animated gradient line */}
        <div style={{ height: 2, borderRadius: 1, background: 'linear-gradient(90deg, var(--primary), var(--accent), var(--primary-light), var(--primary))', backgroundSize: '200% 100%', animation: 'gradientShift 4s ease infinite', opacity: 0.7 }} />
      </div>

      <div className="flex gap-3 items-start" style={{ animation: mounted ? 'fadeSlideIn 0.6s ease 0.1s both' : 'none', opacity: 0 }}>
        {/* ===== LEFT TOOLBAR ===== */}
        <div className="flex-shrink-0 w-[148px] rounded-2xl p-2 space-y-2" style={{...glassCard, borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)'}}>
          {/* General */}
          <div className="flex gap-1">
            {[['select','Select',(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>)],['erase','Erase',(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>)]].map(([id,label,icon])=>(
              <button key={id} onClick={()=>{setTool(id);setDrawing(null);}} className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold transition-all hover:scale-[1.03]" style={glassToolBtn(tool===id)}>{icon}<span>{label}</span></button>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-2" style={{borderTop:'1px solid var(--glass-border)'}}>
            <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Add Actions</div>
            <div className="grid grid-cols-2 gap-1">
              {ACTION_TOOLS.map(at => {
                const active = tool === at.id;
                return (
                  <button key={at.id} onClick={()=>{setTool(at.id);setDrawing(null);}}
                    className="py-2 px-1 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold transition-all hover:scale-[1.03]"
                    style={glassToolBtn(active)}>
                    <svg width="20" height="10" viewBox="0 0 20 10">
                      {at.id==='dribble'&&<><path d="M1 5Q4 1 7 5Q10 9 13 5" stroke="currentColor" strokeWidth="1.5" fill="none"/><polygon points="17,5 13,2.5 13,7.5" fill="currentColor"/></>}
                      {at.id==='pass'&&<><line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/><polygon points="17,5 13,2.5 13,7.5" fill="currentColor"/></>}
                      {at.id==='cut'&&<><line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1.5"/><polygon points="17,5 13,2.5 13,7.5" fill="currentColor"/></>}
                      {at.id==='screen'&&<><line x1="6" y1="9" x2="6" y2="3" stroke="currentColor" strokeWidth="1.5"/><line x1="2" y1="3" x2="10" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></>}
                      {at.id==='shot'&&<path d="M2 8Q10 -2 18 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="2 2"/>}
                      {at.id==='handoff'&&<><line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="1" x2="10" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4" y1="2" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}
                    </svg>
                    {at.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Players */}
          <div className="pt-2" style={{borderTop:'1px solid var(--glass-border)'}}>
            <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Offense</div>
            <div className="grid grid-cols-5 gap-1">
              {['1','2','3','4','5'].map(n=>{const tid=`offense_${n}`,ac=tool===tid;return(
                <button key={tid} onClick={()=>{setTool(tid);setDrawing(null);}} title={`Offense #${n}`} className="h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105" style={{background:ac?'linear-gradient(135deg, var(--accent), var(--accent-light))':'rgba(22,33,62,0.4)',border:ac?'1.5px solid var(--accent-light)':'1px solid var(--glass-border)'}}>
                  <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="white" stroke={ac?'#60a5fa':'#666'} strokeWidth="1.5"/><text x="11" y="12" textAnchor="middle" dominantBaseline="central" fill="#333" fontSize="10" fontWeight="700">{n}</text></svg>
                </button>
              );})}
            </div>
            <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5 mt-2">Defense</div>
            <div className="grid grid-cols-5 gap-1">
              {['1','2','3','4','5'].map(n=>{const tid=`defense_${n}`,ac=tool===tid;return(
                <button key={tid} onClick={()=>{setTool(tid);setDrawing(null);}} title={`Defense #${n}`} className="h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105" style={{background:ac?'linear-gradient(135deg, var(--accent), var(--accent-light))':'rgba(22,33,62,0.4)',border:ac?'1.5px solid var(--accent-light)':'1px solid var(--glass-border)'}}>
                  <svg width="22" height="22" viewBox="0 0 22 22"><line x1="4" y1="4" x2="18" y2="18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/><line x1="18" y1="4" x2="4" y2="18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/><text x="11" y="11" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="8" fontWeight="800">{n}</text></svg>
                </button>
              );})}
            </div>
            <button onClick={()=>{setTool('ball_1');setDrawing(null);}} className="w-full mt-1.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all hover:scale-[1.02]" style={glassToolBtn(tool.startsWith('ball_'))}>
              <svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="white" stroke="#333" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="#333"/></svg>Ball Handler
            </button>
          </div>

          {/* Annotate */}
          <div className="pt-2" style={{borderTop:'1px solid var(--glass-border)'}}>
            <button onClick={()=>{setTool('text');setDrawing(null);}} className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all hover:scale-[1.02]" style={glassToolBtn(tool==='text')}>
              <span className="text-sm font-black">T</span> Text
            </button>
          </div>

          {/* Undo/Redo/Clear */}
          <div className="pt-2 flex gap-1" style={{borderTop:'1px solid var(--glass-border)'}}>
            <button onClick={undo} disabled={!past.length} title="Undo" className="flex-1 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 transition-all" style={{background:'rgba(22,33,62,0.3)', border:'1px solid var(--glass-border)'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></button>
            <button onClick={redo} disabled={!future.length} title="Redo" className="flex-1 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 transition-all" style={{background:'rgba(22,33,62,0.3)', border:'1px solid var(--glass-border)'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></button>
            <button onClick={clearCanvas} title="Clear" className="flex-1 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 transition-all" style={{background:'rgba(22,33,62,0.3)', border:'1px solid var(--glass-border)'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
          </div>
        </div>

        {/* ===== MAIN EDITOR ===== */}
        <div className="flex-1 min-w-0">
          {/* Name + actions */}
          <div className="flex items-center gap-2 mb-2">
            <input value={playName} onChange={e=>setPlayName(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all" style={{...glassInput, boxShadow:'inset 0 1px 0 rgba(255,255,255,0.02)', outline:'none'}} onFocus={e=>{e.target.style.border='1px solid rgba(var(--primary-rgb),0.4)';e.target.style.boxShadow='0 0 0 3px rgba(var(--primary-rgb),0.08), inset 0 1px 0 rgba(255,255,255,0.02)';}} onBlur={e=>{e.target.style.border='1px solid rgba(255,255,255,0.06)';e.target.style.boxShadow='inset 0 1px 0 rgba(255,255,255,0.02)';}} placeholder="Play name..."/>
            <button onClick={savePlay} disabled={saving} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 hover:opacity-90 transition-all hover:scale-[1.02]" style={{...accentBtn, border:'1px solid rgba(59,130,246,0.3)'}}>{saving?'...':saveMsg||'Save'}</button>
            <button onClick={openAnalysis} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all hover:scale-[1.02]" style={{background:'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow:'0 4px 15px rgba(22,163,74,0.3)', border:'1px solid rgba(34,197,94,0.3)'}}>Analyze</button>
          </div>

          {/* SVG Court */}
          <div className="rounded-2xl overflow-hidden" style={{maxWidth:700, overscrollBehavior:'contain', ...glassCard, boxShadow:'0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'}}>
            <svg ref={svgRef} viewBox={`0 0 ${COURT_W} ${courtH}`} className="w-full block" style={{cursor, touchAction:'none'}} onPointerDown={handlePointerDown} onPointerMove={handleMouseMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onMouseLeave={handleMouseLeave}>
              <CourtSVG courtType={settings.courtType} colors={settings.courtColor} showGrid={settings.showGrid} gridSpacing={settings.gridSpacing} fullCourt={settings.fullCourt}/>

              {/* Arrows */}
              {displayObjects.filter(o=>ARROW_SUBTYPES.includes(o.type)).map(o=>renderArrow(o,selectedId===o.id,handleObjMD,displayObjects,selectedId===o.id))}
              {/* Text */}
              {displayObjects.filter(o=>o.type==='text').map(o=>renderTextObj(o,selectedId===o.id,handleObjMD))}
              {/* Players */}
              {displayObjects.filter(o=>o.type==='player').map(o=>renderPlayer(o,selectedId===o.id,handleObjMD,!animPlaying||!animBallPos))}

              {/* Stack indicators: when players overlap, show a tappable badge to cycle z-order */}
              {!animPlaying && getPlayerStacks(displayObjects.filter(o=>o.type==='player')).map((group, gi) => {
                const top = group[group.length - 1];
                const bx = top.x + PLAYER_R + 2;
                const by = top.y - PLAYER_R - 2;
                const ids = group.map(p => p.id);
                return (
                  <g key={`stack-${gi}-${top.id}`} style={{cursor:'pointer'}} onPointerDown={e=>{e.stopPropagation(); cyclePlayerStack(ids);}}>
                    <circle cx={bx} cy={by} r={9} fill="#1e293b" stroke="#ffffff" strokeWidth={1.5}/>
                    <text x={bx} y={by+0.5} textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize={9} fontWeight={800} style={{userSelect:'none', pointerEvents:'none'}}>{group.length}</text>
                    <path d={`M ${bx-4} ${by+3.5} L ${bx} ${by+6} L ${bx+4} ${by+3.5}`} stroke="#ffffff" strokeWidth={1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:'none', opacity:0.75}}/>
                  </g>
                );
              })}

              {/* Animated ball along pass */}
              {renderBallAnim(animBallPos)}

              {/* Snap preview */}
              {snapPreview && <circle cx={snapPreview.x} cy={snapPreview.y} r={SNAP_RADIUS} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5}/>}

              {/* Drawing preview */}
              {renderPreview()}
            </svg>
          </div>

          {/* Phase Bar */}
          <div className="mt-2 rounded-2xl px-3 py-2" style={{...glassCard, boxShadow:'0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)'}}>
            <div className="flex items-center gap-2 overflow-x-auto">
              {phases.map((phase, i) => (
                <div key={phase.id} className="flex-shrink-0">
                  <button onClick={()=>{setActivePhaseId(phase.id);setSelectedId(null);}} className="rounded-xl overflow-hidden transition-all hover:scale-[1.03]" style={{border:phase.id===activePhaseId?'2px solid var(--accent-light)':'2px solid var(--glass-border)',width:80,boxShadow:phase.id===activePhaseId?'0 0 12px var(--accent-glow)':'none'}}>
                    <svg viewBox={`0 0 ${COURT_W} ${courtH}`} width={80} height={settings.fullCourt?75:70} className="block">
                      <rect width={COURT_W} height={courtH} fill={settings.courtColor?.bg||'#1a5c2a'}/>
                      {(phase.objects||[]).map(o=>{
                        if(o.type==='player') return o.team==='defense'?<text key={o.id} x={o.x} y={o.y+4} textAnchor="middle" fill={o.color||'#ef4444'} fontSize={20} fontWeight={900}>x</text>:<circle key={o.id} cx={o.x} cy={o.y} r={10} fill="white" stroke="#333" strokeWidth={2}/>;
                        if(ARROW_SUBTYPES.includes(o.type)) return<line key={o.id} x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke="white" strokeWidth={2} opacity={0.6}/>;
                        return null;
                      })}
                    </svg>
                  </button>
                  <div className="text-[9px] text-gray-500 text-center mt-0.5 truncate w-20">{phase.title || `Phase ${i+1}`}</div>
                </div>
              ))}
              {/* Frame buttons */}
              <div className="flex-shrink-0 flex flex-col gap-1 ml-1">
                <button onClick={addPhase} className="h-7 px-2 rounded-lg text-[9px] text-gray-500 hover:text-white font-semibold transition-all" style={{border:'1px dashed var(--glass-border-hover)'}} title="Add empty frame">+ Empty</button>
                <button onClick={duplicatePhase} className="h-7 px-2 rounded-lg text-[9px] text-gray-500 hover:text-white font-semibold transition-all" style={{border:'1px solid var(--glass-border)'}} title="Duplicate frame">Duplicate</button>
                <button onClick={genNextFrame} className="h-7 px-2 rounded-lg text-[9px] font-bold transition-all hover:opacity-90" style={{background:'rgba(37,99,235,0.1)',border:'1px solid rgba(37,99,235,0.3)',color:'var(--accent-light)'}} title="Generate next frame from actions">Next &rarr;</button>
                {phases.length>1&&<button onClick={deletePhase} className="h-7 px-2 rounded-lg text-[9px] text-red-500/60 hover:text-red-400 font-semibold transition-all" style={{border:'1px solid rgba(239,68,68,0.2)'}}>Delete</button>}
              </div>
            </div>
          </div>

          {/* Animation Controls */}
          <div className="mt-2 rounded-2xl px-4 py-3" style={{...glassCard, boxShadow:'0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)'}}>
            <div className="flex items-center gap-3">
              {/* Play/Pause/Stop */}
              {!animPlaying ? (
                <button onClick={startAnim} disabled={phases.length<2} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-30 hover:opacity-90 transition-all hover:scale-[1.02]" style={accentBtn}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Play
                </button>
              ) : (
                <>
                  <button onClick={togglePause} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all" style={animPaused?accentBtn:{background:'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow:'0 4px 12px rgba(245,158,11,0.3)'}}>
                    {animPaused ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Resume</> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>Pause</>}
                  </button>
                  <button onClick={stopAnim} className="px-3 py-2 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all" style={{background:'linear-gradient(135deg, #ef4444, #f87171)', boxShadow:'0 4px 12px rgba(239,68,68,0.3)'}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                  </button>
                </>
              )}

              {/* Seek Bar */}
              <div className="flex-1 flex items-center gap-2">
                <input type="range" min={0} max={Math.max(phases.length-1,0.01)} step={0.01} value={animProgress} onChange={handleSeek} className="flex-1 accent-orange-500 h-2" disabled={phases.length<2}/>
                <span className="text-[10px] text-gray-500 w-16 text-right">Phase {Math.floor(animProgress)+1}/{phases.length}</span>
              </div>

              {/* Speed */}
              <div className="flex gap-0.5">
                {[0.5,1,1.5,2].map(s=>(
                  <button key={s} onClick={()=>setAnimSpeed(s)} className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all" style={glassToolBtnMuted(animSpeed===s)}>{s}x</button>
                ))}
              </div>
            </div>
          </div>

          {/* Status hint */}
          <div className="mt-1 text-[10px] text-gray-600">
            {animPlaying ? 'Playing animation...' :
             tool==='select' ? 'Click to select \u00b7 Drag to move \u00b7 Drag midpoint handle to curve arrow' :
             isPlayerTool(tool) ? 'Click on court to place player' :
             ARROW_SUBTYPES.includes(tool) ? 'Click near a player to snap \u00b7 Drag to draw' :
             tool==='text' ? 'Click to place text' :
             tool==='erase' ? 'Click to delete' : ''}
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div className="w-48 flex-shrink-0 space-y-3" style={{ animation: mounted ? 'fadeSlideIn 0.6s ease 0.2s both' : 'none', opacity: 0 }}>
          {selectedObj && (
            <div className="rounded-2xl p-3" style={{...glassCard, boxShadow:'0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)', animation:'fadeSlideIn 0.3s ease forwards'}}>
              <PropertyPanel obj={selectedObj} onUpdate={updateObj} onDelete={deleteObj}/>
            </div>
          )}
          {editingTextId && selectedObj?.type==='text' && (
            <div className="rounded-2xl p-3" style={{...glassCard, animation:'fadeSlideIn 0.3s ease forwards'}}>
              <label className="text-xs text-gray-400 font-semibold block mb-1">Edit Text</label>
              <input autoFocus value={selectedObj.value||''} onChange={e=>updateObj(editingTextId,{value:e.target.value})} onBlur={()=>setEditingTextId(null)} onKeyDown={e=>e.key==='Enter'&&setEditingTextId(null)} className="w-full px-2 py-1.5 rounded-lg text-white text-sm focus:outline-none transition-all" style={{...glassInput}}/>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden" style={{...glassCard, boxShadow:'0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)'}}>
            <button onClick={()=>setShowSaved(p=>!p)} className="w-full flex items-center justify-between px-4 py-3 transition-all group" style={{borderBottom:'1px solid rgba(255,255,255,0.06)', background:'transparent'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <h3 className="font-black text-white text-sm">Saved Plays</h3>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{transition:'transform 0.3s ease', transform:showSaved?'rotate(180deg)':'rotate(0deg)'}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showSaved&&<div className="max-h-[300px] overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.1) transparent'}}>
              {loading?<div className="flex items-center justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'var(--primary)', borderTopColor:'transparent'}}/></div>:savedPlays.length===0?<p className="text-gray-600 text-xs text-center py-6 px-3">No plays saved yet.</p>:savedPlays.map(play=>(
                <div key={play.id} className="px-3 py-2.5 transition-all" style={{borderBottom:'1px solid rgba(255,255,255,0.04)', background:currentPlayId===play.id?'rgba(var(--primary-rgb),0.06)':'transparent'}}
                  onMouseEnter={e=>{if(currentPlayId!==play.id)e.currentTarget.style.background='rgba(255,255,255,0.03)';}}
                  onMouseLeave={e=>{if(currentPlayId!==play.id)e.currentTarget.style.background='transparent';}}>
                  <button onClick={()=>loadPlay(play)} className="w-full text-left">
                    <p className="text-xs font-semibold text-white truncate" style={{transition:'color 0.2s ease'}}>{play.name}</p>
                    <p className="text-[10px] text-gray-600">{new Date(play.created_at).toLocaleDateString()}</p>
                  </button>
                  <button onClick={()=>deletePlay(play.id)} className="text-[10px] text-red-500/40 hover:text-red-400 mt-0.5 transition-all hover:translate-x-0.5">Delete</button>
                </div>
              ))}
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
