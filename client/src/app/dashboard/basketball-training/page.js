'use client';
import { useState } from 'react';

// ─── Plan generation logic ────────────────────────────────────────────────────

const POS_NAMES = {
  pg:  'Point Guard',
  sg:  'Shooting Guard',
  sf:  'Small Forward',
  pf:  'Power Forward',
  c:   'Center',
};
const POS_FOCUS = {
  pg:  'Ball Handling, Vision, Leadership',
  sg:  'Shooting, Off-Ball Movement, Athleticism',
  sf:  'Versatility, Scoring, Two-Way Defense',
  pf:  'Post Play, Rebounding, Strength',
  c:   'Rim Protection, Post Scoring, Rebounding',
};

const AREA_LABELS = {
  head: 'Head', neck: 'Neck',
  leftShoulder: 'Left Shoulder', rightShoulder: 'Right Shoulder',
  chest: 'Chest', core: 'Core / Abs', hips: 'Hips',
  leftArm: 'Left Arm', rightArm: 'Right Arm',
  leftThigh: 'Left Thigh', rightThigh: 'Right Thigh',
  leftKnee: 'Left Knee', rightKnee: 'Right Knee',
  leftShin: 'Left Shin/Calf', rightShin: 'Right Shin/Calf',
  leftFoot: 'Left Ankle/Foot', rightFoot: 'Right Ankle/Foot',
};

function buildPlan(age, pos, fitness, soreness, painData) {
  const entries = Object.entries(painData).filter(([, v]) => v > 0);
  const maxSev = entries.length ? Math.max(...entries.map(([, v]) => v)) : 0;
  const primaryArea = entries.length
    ? entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;

  let intensity = 'high';
  if (soreness === 'severe' || maxSev >= 7) intensity = 'recovery';
  else if (soreness === 'moderate' || maxSev >= 4) intensity = 'light';
  else if (soreness === 'mild' || maxSev >= 1) intensity = 'moderate';

  return {
    summary: {
      position: POS_NAMES[pos] || pos,
      intensity,
      focus: POS_FOCUS[pos] || 'All-around skills',
      painAreas: { ...painData },
      primaryArea,
      maxSev,
    },
    training: buildTraining(pos, intensity, fitness, primaryArea, maxSev),
    recovery: buildRecovery(intensity, primaryArea, maxSev, painData),
    positionDrills: buildPositionDrills(pos, intensity),
  };
}

function buildTraining(pos, intensity, fitness, painArea, maxSev) {
  const stdWarm = [
    '5 minutes light jogging & dynamic movement',
    'Dynamic stretching — leg swings, hip circles, shoulder rotations',
    'Ball-handling warm-up — two-ball dribbling, Mikan drill, stationary combos',
  ];
  const stdCool = [
    '5 minutes light jogging & walking',
    'Static stretching — hold each stretch 20–30 seconds',
    'Foam rolling for quads, hamstrings, calves, and hips',
  ];
  const plan = { title: '', description: '', warmup: [], main: [], cooldown: [], duration: '', icon: '🏀' };

  switch (intensity) {
    case 'recovery':
      plan.title = 'Recovery Session'; plan.icon = '🛌';
      plan.description = 'Focus on active recovery and light skill reinforcement to promote healing.';
      plan.warmup = ['5 minutes very light movement — gentle walking', 'Gentle full-body mobility & joint circles'];
      plan.main = [
        '20 minutes of stationary shooting & form work (no cutting or jumping)',
        'Walk-through play review — mental reps, no physical exertion',
        'Non-impact cross-training — swimming or stationary bike (30 min)',
        'Breathing & relaxation exercises',
      ];
      plan.cooldown = ['Extended stretching session (25–30 minutes)', 'Foam rolling — full body, 90 seconds per area'];
      plan.duration = '30–45 minutes (very low intensity)'; break;

    case 'light':
      plan.title = 'Light Training Session'; plan.icon = '🌤';
      plan.description = 'Maintain sharpness while giving your body space to recover.';
      plan.warmup = stdWarm;
      plan.main = [
        'Stationary & slow-speed ball-handling drills at 50–60% effort',
        'Catch-and-shoot repetition — no off-dribble or sprinting',
        'Positional walk-through — half-speed play execution',
        'Form shooting from close range — focus on mechanics over volume',
      ];
      plan.cooldown = stdCool;
      plan.duration = '45–60 minutes (low to moderate intensity)'; break;

    case 'moderate':
      plan.title = 'Moderate Training Session'; plan.icon = '⚡';
      plan.description = 'Balanced session building technical sharpness and court fitness.';
      plan.warmup = stdWarm;
      plan.main = [
        'Ball-handling combos at 70–80% speed',
        'Mid-range & three-point shooting off movement (curls, flares, pull-ups)',
        '3-on-3 half-court competitive sets (15 minutes)',
        'Position-specific drills at moderate game pace',
        'Interval sprints — full court × 6, 1:1 work-to-rest',
      ];
      plan.cooldown = stdCool;
      plan.duration = '60–75 minutes (moderate intensity)'; break;

    case 'high':
      plan.title = 'High Intensity Session'; plan.icon = '🔥';
      plan.description = 'Full-intensity session to sharpen game fitness and decision-making under pressure.';
      plan.warmup = stdWarm;
      plan.main = [
        'Ball-handling & finishing at 90–100% game speed',
        'Competitive 5-on-5 live sets — no stopping on mistakes',
        'Full-court transition offense and defense drills',
        'Sprint & conditioning circuit — 8 × court suicides, 4 × defensive-slide circuits',
        'Late-clock & end-of-game scenario execution at match pace',
      ];
      plan.cooldown = stdCool;
      plan.duration = '75–90 minutes (high intensity)'; break;
  }

  if (painArea && maxSev > 0) modifyForPain(plan, painArea, maxSev);
  return plan;
}

function modifyForPain(plan, area, sev) {
  const mods = [];
  if (['leftThigh', 'rightThigh', 'leftKnee', 'rightKnee', 'leftShin', 'rightShin'].includes(area)) {
    mods.push('Reduce full-court sprinting and cutting volume by 40–50%');
    mods.push('Avoid explosive jumping, dunking, or plyometric drills');
    if (['leftKnee', 'rightKnee'].includes(area)) mods.push('No deep squatting or rapid lateral direction changes');
    if (sev > 5) mods.push('Consider non-weight-bearing conditioning — swimming or stationary bike');
  } else if (['leftFoot', 'rightFoot'].includes(area)) {
    mods.push('Wear high-top footwear with adequate ankle support');
    mods.push('Reduce cutting, planting, and sharp pivoting movements');
    mods.push('Consider kinesiology taping for additional ankle support');
  } else if (area === 'back' || area === 'core') {
    mods.push('Avoid heavy load-bearing or contact drills');
    mods.push('Focus on core bracing with strict neutral spine throughout');
    if (area === 'back') mods.push('Limit rotation-heavy movements and post contact drills');
  } else if (['leftShoulder', 'rightShoulder'].includes(area)) {
    mods.push('Reduce overhead passing and shooting volume as tolerated');
    mods.push('Modify any overhead or push-off contact movements');
  } else if (['leftArm', 'rightArm'].includes(area)) {
    mods.push('Reduce dribbling reps on affected side; emphasize off-hand work');
    mods.push('Avoid contact drills that stress the injured limb');
  } else if (area === 'hips') {
    mods.push('Avoid explosive lateral cuts and hip-hinge power movements');
    mods.push('Add hip flexor & glute activation to the warm-up');
  }
  if (mods.length) {
    plan.main.push('__separator__Pain Management Modifications');
    plan.main = plan.main.concat(mods);
  }
}

function buildRecovery(intensity, primaryArea, maxSev, allPainAreas) {
  const plan = {
    title: 'Recovery Protocol',
    description: 'Optimize recovery to be ready for your next practice or game.',
    immediate: [], sameDay: [], nextDay: [], nutrition: [], icon: '🔄',
  };

  const si = [
    '10–15 minutes of cool-down light jogging & walking',
    'Hydrate immediately — 500–600ml water or electrolyte drink',
    'Light static stretching of all major muscle groups',
  ];
  const sd = [
    'Full meal within 60 minutes — 4:1 carbohydrate-to-protein ratio',
    'Wear compression tights or sleeves if available',
    '20 minutes of foam rolling — quads, hamstrings, calves, glutes, IT band',
  ];
  const nd = [
    '10–15 minutes of mobility flow work',
    'Light muscle activation drills — glutes, core, shoulders',
    'Self-assessment — rate soreness vs. yesterday; adjust intensity accordingly',
  ];
  const nu = [
    'Daily hydration: 2.5–3 litres of water minimum',
    'Protein: 1.6–1.8g per kg of bodyweight per day',
    'Complex carbohydrates at each meal to maintain energy stores',
    'Anti-inflammatory foods: berries, fatty fish, turmeric, leafy greens, walnuts',
  ];

  switch (intensity) {
    case 'recovery':
      plan.immediate = si;
      plan.sameDay = [...sd, 'Extended stretching — 30 minutes, prioritise tight areas', 'Contrast therapy: 2 minutes cold / 1 minute warm, 4 rounds'];
      plan.nextDay = [...nd, 'Continue active recovery — light walk or swim', 'Consider physiotherapy or sports massage'];
      plan.nutrition = [...nu, 'Prioritise anti-inflammatory diet for 48–72 hours']; break;
    case 'light':
      plan.immediate = si; plan.sameDay = sd; plan.nextDay = nd; plan.nutrition = nu; break;
    case 'moderate':
      plan.immediate = si;
      plan.sameDay = [...sd, 'Cold shower or ice pack on heaviest-worked joints (8–12 min)'];
      plan.nextDay = nd; plan.nutrition = nu; break;
    case 'high':
      plan.immediate = si;
      plan.sameDay = [...sd, 'Ice bath — 10–15 minutes at 10–15°C', 'Compression sleeves or boots for 30–45 minutes'];
      plan.nextDay = [...nd, 'Light recovery session — 20–25 minutes easy shooting & movement', 'Sports massage or physio session recommended'];
      plan.nutrition = [...nu, 'Tart cherry juice — 30ml concentrate for muscle recovery', 'High-GI carbohydrates (banana, rice, fruit) immediately post-session']; break;
  }

  const entries = Object.entries(allPainAreas || {}).filter(([, v]) => v > 0);
  if (entries.length) {
    const extra = [];
    entries.forEach(([a, sev]) => {
      const lbl = AREA_LABELS[a] || a;
      if (['leftThigh', 'rightThigh'].includes(a)) extra.push(`Elevate affected leg when resting; ice ${lbl} — 15 min on, 45 min off`);
      if (['leftKnee', 'rightKnee'].includes(a)) { extra.push(`RICE protocol for ${lbl}`); if (sev > 5) extra.push(`Compression sleeve on ${lbl} during activity`); }
      if (['leftShin', 'rightShin'].includes(a)) extra.push(`Ice ${lbl} for 15 minutes after any activity`);
      if (['leftFoot', 'rightFoot'].includes(a)) extra.push(`Ice ankle/foot 10–15 minutes; ankle alphabet & calf stretches`);
      if (['leftShoulder', 'rightShoulder'].includes(a)) extra.push(`Ice ${lbl} — 15 min on / 45 min off; gentle pendulum mobility drills`);
      if (['leftArm', 'rightArm'].includes(a)) extra.push(`Rest ${lbl} from dribbling; ice if swollen; wrist/elbow mobility circles`);
      if (a === 'back') extra.push(`Cat-cow and child's pose stretches; heat pad for muscle relaxation; avoid prolonged sitting`);
      if (a === 'hips') extra.push(`Pigeon pose & hip flexor stretches (90-second holds); heat therapy on hips`);
      if (a === 'core') extra.push(`Gentle diaphragmatic breathing exercises; avoid forced abdominal compression`);
    });
    const unique = [...new Set(extra)];
    if (unique.length) {
      plan.sameDay.push('__separator__Area-Specific Recovery');
      plan.sameDay = plan.sameDay.concat(unique);
    }
  }
  return plan;
}

function buildPositionDrills(pos, intensity) {
  const map = {
    pg: {
      t: ['Two-ball dribbling combos — crossover, between legs, behind back', 'Pick-and-roll reads — attack, pull up, or kick out', 'Floater & pull-up mid-range off live dribble', 'No-look / behind-the-back passing against pressure'],
      p: ['Lateral quickness ladder drills — 4×30s', 'Change-of-direction circuit: 5-10-5 pro agility 4×', 'Full-court endurance: 4×5min at 80% HR', 'Reactive first step: partner-signal burst drills'],
      ta: ['Reading the pick-and-roll defender (hedge vs. drop)', 'Pace control — when to push vs. slow the game down', 'Identifying mismatches and attacking them immediately', 'Pressure defense on ball — forcing baseline or middle'],
    },
    sg: {
      t: ['Catch-and-shoot off screens — curl, flare, and flat', 'Pull-up jumper off 1–2 dribbles from wing & elbow', 'Off-ball movement — V-cuts, backdoor, zipper cuts', 'Finishing through contact at the rim — both sides'],
      p: ['Sprint and decelerate circuits — 6×30m', 'Vertical leap: box jumps & depth jumps 4×10', 'Defensive lateral slides — full court 4×', 'Reaction: partner mirror & closeout drills'],
      ta: ['Reading off-ball screens — when to curl vs. fade', 'Defensive assignment — denying the wing and chasing screens', 'Shot selection — pull up vs. drive vs. kick out', 'Transition offense — fill lanes and spot up on the break'],
    },
    sf: {
      t: ['Mid-range from elbow & wing — off catch and off dribble', 'Drive-and-kick sequences — read the help and make the pass', 'Post-up basics — seal, catch, and simple scoring moves', 'Perimeter closeout & contest defense footwork'],
      p: ['Full-court conditioning — suicide runs 6×', 'Explosive first step: 6×10m from triple-threat stance', 'Strength for contact: resistance band push-pull 3×12', 'Agility: T-drill & L-drill 4× each'],
      ta: ['Help-side defensive positioning — see ball and man', 'Transition offense — reading the defense on the break', 'Attacking closeouts — shot fake, one dribble, finish', 'Switching on screens — body position and communication'],
    },
    pf: {
      t: ['Post moves — drop step, up-and-under, baby hook both hands', 'Face-up mid-range from short corner & elbow', 'Offensive rebounding positioning — seal and tip drills', 'Dump-off & kick-out passes from the post'],
      p: ['Lower body strength: squat & lunge circuit 4×10', 'Box-out battle drills — 1v1 rebounding 5×5', 'Jump training: approach rebound runs & tip-ins 4×8', 'Core stability for post play: plank & anti-rotation holds'],
      ta: ['Positioning in the pick-and-roll — timing the roll vs. pop', 'Defending on the perimeter vs. switching onto guards', 'Offensive rebounding reads — when to crash vs. stay', 'Setting and re-screening: angle, legality, and timing'],
    },
    c: {
      t: ['Drop step & up-and-under in the post', 'Short hook shot — both hands, both blocks', 'Outlet passing after rebound — quick decision, accurate delivery', 'Rim protection — block technique, verticality, and timing'],
      p: ['Lower body power: leg press & hip thrust 4×8', 'Jump & rebound circuit — tip-outs, put-backs 4×10', 'Explosive power: depth jumps 4×6', 'Lateral mobility drills — defensive slides & drop steps'],
      ta: ['Rim protection — reading driver angles & staying vertical', 'Pick-and-roll defense — drop coverage vs. hedge coverage', 'Alley-oop lob timing — footwork and jump point', 'Communicating switches and defensive rotations'],
    },
  };

  const d = map[pos] || map.pg;
  let { t, p, ta } = d;

  if (['recovery', 'light'].includes(intensity)) {
    t  = t.slice(0, 2).map(x => x + ' (low intensity)');
    p  = p.slice(0, 2).map(x => x + ' (reduced volume)');
    ta = ta.slice(0, 2).map(x => x + ' (walk-through / discussion)');
  }

  return {
    title: `${POS_NAMES[pos] || pos} — Position Drills`,
    description: `Key skills and attributes for your position, calibrated to ${intensity} intensity.`,
    technical: t, physical: p, tactical: ta, icon: '🎯',
  };
}

// ─── Severity colour helper ───────────────────────────────────────────────────

function sevColor(s) {
  if (!s) return '#1e1e30';
  const t = s / 10;
  const h = Math.round(50 - t * 50);
  const sa = Math.round(85 + t * 12);
  const l  = Math.round(60 - t * 20);
  return `hsl(${h},${sa}%,${l}%)`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanSection({ heading, items }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2">{heading}</div>
      <ul className="space-y-1">
        {items.map((item, i) =>
          item.startsWith('__separator__') ? (
            <li key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2 pb-1 border-t border-gray-700">
              {item.replace('__separator__', '')}
            </li>
          ) : (
            <li key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              {item}
            </li>
          )
        )}
      </ul>
    </div>
  );
}

function PlanCard({ icon, title, description, sections }) {
  return (
    <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      {sections.map(([heading, items]) => (
        <PlanSection key={heading} heading={heading} items={items} />
      ))}
    </div>
  );
}

const INTENSITY_STYLES = {
  recovery: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  light:    'bg-green-500/15 text-green-300 border border-green-500/30',
  moderate: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  high:     'bg-red-500/15 text-red-300 border border-red-500/30',
};

// ─── Body Map SVG ─────────────────────────────────────────────────────────────

const BODY_AREAS = [
  { id: 'head',          shape: 'path',    d: 'M100,12 C82,12 68,26 68,44 C68,60 78,73 92,78 L92,92 L108,92 L108,78 C122,73 132,60 132,44 C132,26 118,12 100,12 Z' },
  { id: 'neck',          shape: 'rect',    x: 90, y: 92, width: 20, height: 12, rx: 3 },
  { id: 'leftShoulder',  shape: 'path',    d: 'M68,103 C52,103 40,114 36,128 L58,133 L68,113 Z' },
  { id: 'rightShoulder', shape: 'path',    d: 'M132,103 C148,103 160,114 164,128 L142,133 L132,113 Z' },
  { id: 'chest',         shape: 'path',    d: 'M70,103 L130,103 L126,142 L74,142 Z' },
  { id: 'core',          shape: 'path',    d: 'M74,143 L126,143 L122,185 L78,185 Z' },
  { id: 'hips',          shape: 'path',    d: 'M78,186 L122,186 L128,216 L100,230 L72,216 Z' },
  { id: 'leftArm',       shape: 'path',    d: 'M35,130 L56,135 L48,200 L28,194 Z' },
  { id: 'rightArm',      shape: 'path',    d: 'M165,130 L144,135 L152,200 L172,194 Z' },
  { id: 'leftThigh',     shape: 'path',    d: 'M72,220 L98,230 L94,278 L68,278 Z' },
  { id: 'rightThigh',    shape: 'path',    d: 'M128,220 L102,230 L106,278 L132,278 Z' },
  { id: 'leftKnee',      shape: 'ellipse', cx: 81,  cy: 286, rx: 13, ry: 9 },
  { id: 'rightKnee',     shape: 'ellipse', cx: 119, cy: 286, rx: 13, ry: 9 },
  { id: 'leftShin',      shape: 'path',    d: 'M68,297 L94,297 L91,335 L65,335 Z' },
  { id: 'rightShin',     shape: 'path',    d: 'M106,297 L132,297 L135,335 L109,335 Z' },
  { id: 'leftFoot',      shape: 'path',    d: 'M64,338 L90,338 L93,368 L58,368 Z' },
  { id: 'rightFoot',     shape: 'path',    d: 'M110,338 L136,338 L142,368 L107,368 Z' },
];

function BodyMapArea({ area, pain, isSelected, isFocused, onClick }) {
  const sev = pain || 0;
  const fill = sev > 0 ? sevColor(sev) : isSelected ? '#2e3a5c' : '#1e1e30';
  const stroke = isFocused ? 'rgba(255,255,255,0.8)' : isSelected ? 'rgba(255,255,255,0.4)' : sev > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)';
  const strokeWidth = isFocused ? 2.5 : isSelected ? 1.5 : 1;
  const common = {
    fill, stroke, strokeWidth,
    style: { cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' },
    onClick,
  };
  if (area.shape === 'path')    return <path    {...common} d={area.d} />;
  if (area.shape === 'rect')    return <rect    {...common} x={area.x} y={area.y} width={area.width} height={area.height} rx={area.rx} />;
  if (area.shape === 'ellipse') return <ellipse {...common} cx={area.cx} cy={area.cy} rx={area.rx} ry={area.ry} />;
  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BasketballTrainingPage() {
  const [view, setView] = useState('form');
  const [form, setForm] = useState({ age: '', position: '', fitness: '', soreness: '' });
  const [painData, setPainData] = useState({});
  const [selectedAreas, setSelectedAreas] = useState(new Set());
  const [focusedArea, setFocusedArea] = useState(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  function handleAreaClick(areaId) {
    if (selectedAreas.has(areaId)) {
      // Deselect — remove from set and clear its pain
      const next = new Set(selectedAreas);
      next.delete(areaId);
      setSelectedAreas(next);
      setPainData(prev => { const n = { ...prev }; delete n[areaId]; return n; });
      if (focusedArea === areaId) {
        const remaining = [...next];
        const newFocus = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        setFocusedArea(newFocus);
        setSliderVal(newFocus ? (painData[newFocus] || 0) : 0);
      }
    } else {
      // Select — add to set, make it the focused area
      setSelectedAreas(prev => new Set([...prev, areaId]));
      setFocusedArea(areaId);
      setSliderVal(painData[areaId] || 0);
    }
  }

  function handleSlider(val) {
    setSliderVal(val);
    if (!focusedArea) return;
    setPainData(prev => {
      const next = { ...prev };
      if (val === 0) delete next[focusedArea]; else next[focusedArea] = val;
      return next;
    });
  }

  function removeArea(id) {
    setPainData(prev => { const next = { ...prev }; delete next[id]; return next; });
    setSelectedAreas(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (focusedArea === id) { setFocusedArea(null); setSliderVal(0); }
  }

  function generate() {
    setError('');
    const age = parseInt(form.age);
    if (!age || !form.position || !form.fitness || !form.soreness) {
      setError('Please fill in Age, Position, Fitness Level, and Overall Soreness.');
      return;
    }
    const generated = buildPlan(age, form.position, form.fitness, form.soreness, painData);
    setPlan(generated);
    setView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const activePainEntries = Object.entries(painData).filter(([, v]) => v > 0);

  // ── Form view ────────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏀</span>
            <h1 className="text-2xl font-bold text-white">Basketball Training Plan</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Generate a personalized training &amp; recovery plan tailored to your position and physical condition.
          </p>
        </div>

        {/* Player Info */}
        <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-4">Player Info</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Age</label>
              <input
                type="number" min="10" max="50" placeholder="e.g. 17"
                value={form.age}
                onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-gray-600 bg-[#0f0f1a] focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Position</label>
              <select
                value={form.position}
                onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-gray-600 bg-[#0f0f1a] focus:outline-none focus:border-blue-500"
              >
                <option value="">Select…</option>
                {Object.entries(POS_NAMES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fitness Level</label>
              <select
                value={form.fitness}
                onChange={e => setForm(p => ({ ...p, fitness: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-gray-600 bg-[#0f0f1a] focus:outline-none focus:border-blue-500"
              >
                <option value="">Select…</option>
                <option value="beginner">Beginner</option>
                <option value="moderate">Recreational</option>
                <option value="high">High School / AAU</option>
                <option value="elite">College / Elite</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Overall Soreness</label>
              <select
                value={form.soreness}
                onChange={e => setForm(p => ({ ...p, soreness: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-gray-600 bg-[#0f0f1a] focus:outline-none focus:border-blue-500"
              >
                <option value="">Select…</option>
                <option value="none">None</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pain Map */}
        <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-1">Pain &amp; Stress Mapping</h2>
          <p className="text-xs text-gray-500 mb-4">Click body areas to flag pain, then rate severity with the slider.</p>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* SVG */}
            <div className="flex-shrink-0">
              <svg viewBox="0 0 200 380" width="180" height="342" xmlns="http://www.w3.org/2000/svg">
                {BODY_AREAS.map(area => (
                  <BodyMapArea
                    key={area.id}
                    area={area}
                    pain={painData[area.id]}
                    isSelected={selectedAreas.has(area.id)}
                    isFocused={focusedArea === area.id}
                    onClick={() => handleAreaClick(area.id)}
                  />
                ))}
              </svg>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-sm text-gray-300 mb-3 italic">
                  {focusedArea
                    ? `Adjusting: ${AREA_LABELS[focusedArea]}`
                    : 'Select a body area to rate severity'}
                </div>
                {focusedArea && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Severity</span>
                      <span className="text-2xl font-bold" style={{ color: sevColor(sliderVal) || '#6e6e8a' }}>
                        {sliderVal}
                      </span>
                    </div>
                    <input
                      type="range" min="0" max="10" step="1"
                      value={sliderVal}
                      onChange={e => handleSlider(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>0 — None</span><span>10 — Severe</span>
                    </div>
                  </>
                )}
              </div>

              {/* Pain tags */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Flagged Areas</div>
                {activePainEntries.length === 0 ? (
                  <span className="text-xs text-gray-600 italic">No areas selected yet</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activePainEntries.map(([id, sev]) => (
                      <span
                        key={id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border"
                        style={{ borderColor: sevColor(sev), color: sevColor(sev), backgroundColor: `${sevColor(sev)}18` }}
                      >
                        {AREA_LABELS[id]}
                        <strong>{sev}/10</strong>
                        <button onClick={() => removeArea(id)} className="ml-1 opacity-60 hover:opacity-100 text-xs leading-none">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg px-4 py-3 text-sm text-red-300 border border-red-500/30 bg-red-500/10">
            {error}
          </div>
        )}
        <button
          onClick={generate}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#2563eb' }}
        >
          Generate Training Plan
        </button>
      </div>
    );
  }

  // ── Results view ─────────────────────────────────────────────────────────────
  const s = plan.summary;
  const painEntries = Object.entries(s.painAreas).filter(([, v]) => v > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{s.position} Training Plan</h1>
          <p className="text-gray-400 text-sm capitalize">{s.intensity} Intensity · {s.focus}</p>
        </div>
        <button
          onClick={() => setView('form')}
          className="self-start sm:self-auto px-4 py-2 rounded-lg text-sm text-gray-300 border border-gray-600 hover:border-gray-400 transition-colors"
        >
          ← Back to Form
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Position', value: s.position },
          { label: 'Focus', value: s.focus },
          { label: 'Pain Areas', value: painEntries.length
              ? painEntries.map(([a, v]) => `${AREA_LABELS[a]} ${v}/10`).join(', ')
              : 'None reported' },
          { label: 'Intensity', value: (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${INTENSITY_STYLES[s.intensity]}`}>
              {s.intensity}
            </span>
          )},
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-700 p-3" style={{ backgroundColor: '#1e1e30' }}>
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</div>
            <div className="text-sm text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600 italic px-1">
        This plan is for informational purposes only. Always consult a qualified coach or sports medicine professional before training with pain or injury.
      </div>

      <PlanCard
        icon={plan.training.icon}
        title={plan.training.title}
        description={`${plan.training.description} · ${plan.training.duration}`}
        sections={[
          ['Warm-up', plan.training.warmup],
          ['Main Session', plan.training.main],
          ['Cool-down', plan.training.cooldown],
        ]}
      />

      <PlanCard
        icon={plan.recovery.icon}
        title={plan.recovery.title}
        description={plan.recovery.description}
        sections={[
          ['Immediate Post-Session', plan.recovery.immediate],
          ['Same Day', plan.recovery.sameDay],
          ['Next Day', plan.recovery.nextDay],
          ['Nutrition Focus', plan.recovery.nutrition],
        ]}
      />

      <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{plan.positionDrills.icon}</span>
          <h3 className="text-lg font-bold text-white">{plan.positionDrills.title}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">{plan.positionDrills.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            ['Technical Drills', plan.positionDrills.technical],
            ['Physical Focus', plan.positionDrills.physical],
            ['Tactical Awareness', plan.positionDrills.tactical],
          ].map(([heading, items]) => (
            <div key={heading}>
              <div className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2">{heading}</div>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setView('form')}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all border border-gray-600 text-gray-300 hover:border-gray-400"
      >
        ← Generate Another Plan
      </button>
    </div>
  );
}
