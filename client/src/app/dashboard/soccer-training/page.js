'use client';
import { useState } from 'react';

// ─── Plan generation logic (ported from Playr.AI) ───────────────────────────

const POS_NAMES = {
  goalkeeper: 'Goalkeeper',
  centerback: 'Center Back',
  outsideback: 'Outside Back / Fullback',
  cdm: 'Center Defensive Midfielder',
  cm: 'Central Midfielder',
  cam: 'Central Attacking Midfielder',
  outsideMid: 'Outside Midfielder',
  wing: 'Winger',
  striker: 'Striker / Forward',
};
const POS_FOCUS = {
  goalkeeper: 'Reflexes, Positioning, Distribution',
  centerback: 'Strength, Aerial Ability, Tackling',
  outsideback: 'Speed, Stamina, Crossing',
  cdm: 'Tackling, Positioning, Short Passing',
  cm: 'Endurance, Vision, Passing Range',
  cam: 'Creativity, Technical Skills, Shooting',
  outsideMid: 'Crossing, Stamina, Defensive Awareness',
  wing: 'Speed, Dribbling, Crossing',
  striker: 'Finishing, Movement, Strength',
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
    'Dynamic stretching sequence (leg swings, hip circles, arm rotations)',
    'Ball control warm-up — juggling, rondos, first-touch drills',
  ];
  const stdCool = [
    '5 minutes light jogging & walking',
    'Static stretching — hold each stretch 20–30 seconds',
    'Foam rolling for major muscle groups',
  ];
  const plan = { title: '', description: '', warmup: [], main: [], cooldown: [], duration: '', icon: '⚽' };

  switch (intensity) {
    case 'recovery':
      plan.title = 'Recovery Session'; plan.icon = '🛌';
      plan.description = 'Focus on active recovery and rehabilitation to promote healing.';
      plan.warmup = ['5 minutes very light movement — gentle walking', 'Gentle full-body mobility & joint circles'];
      plan.main = [
        '20 minutes of light technical work at low intensity',
        'Non-impact cross-training — swimming or stationary bike (30 min)',
        'Technique repetition at walking pace — passing, receiving, first touch',
        'Breathing & relaxation exercises',
      ];
      plan.cooldown = ['Extended stretching session (25–30 minutes)', 'Foam rolling — full body, 90 seconds per area'];
      plan.duration = '30–45 minutes (very low intensity)'; break;

    case 'light':
      plan.title = 'Light Training Session'; plan.icon = '🌤';
      plan.description = 'Maintain fitness while giving your body space to recover.';
      plan.warmup = stdWarm;
      plan.main = [
        'Technical drills at 50–60% max effort',
        'Positional work with limited high-intensity movement',
        'Light ball work focusing on technique & decision-making',
        'Short passing sequences — accuracy over speed',
      ];
      plan.cooldown = stdCool;
      plan.duration = '45–60 minutes (low to moderate intensity)'; break;

    case 'moderate':
      plan.title = 'Moderate Training Session'; plan.icon = '⚡';
      plan.description = 'Balanced session building technical sharpness and moderate fitness.';
      plan.warmup = stdWarm;
      plan.main = [
        'Technical drills at 70–80% intensity',
        'Small-sided games — 4v4 or 5v5 (15 minutes)',
        'Position-specific drills at moderate pace',
        'Interval running — 1:1 work-to-rest ratio (6 × 30 seconds)',
      ];
      plan.cooldown = stdCool;
      plan.duration = '60–75 minutes (moderate intensity)'; break;

    case 'high':
      plan.title = 'High Intensity Session'; plan.icon = '🔥';
      plan.description = 'Full-intensity session to sharpen match fitness and decision-making under pressure.';
      plan.warmup = stdWarm;
      plan.main = [
        'Technical drills at 90–100% intensity',
        'High-intensity small-sided games (8v8 or 11v11 segments)',
        'Position-specific drills at full game speed',
        'Sprint & agility circuit — 8 × 20m sprints, 4 × ladder drills',
        'Tactical scenarios at match pace — set pieces, transitions',
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
    mods.push('Reduce running & sprinting volume by 40–50%');
    mods.push('Avoid explosive jumping or plyometric drills');
    if (['leftKnee', 'rightKnee'].includes(area)) mods.push('No deep squatting or rapid lateral cuts');
    if (sev > 5) mods.push('Consider non-weight-bearing cardio — swimming or cycling');
  } else if (['leftFoot', 'rightFoot'].includes(area)) {
    mods.push('Wear footwear with adequate arch support & padding');
    mods.push('Reduce cutting, pivoting and sharp-direction-change movements');
    mods.push('Consider kinesiology taping for additional support');
  } else if (area === 'back' || area === 'core') {
    mods.push('Avoid all heavy load-bearing exercises');
    mods.push('Focus on core bracing with strict neutral spine');
    if (area === 'back') mods.push('Limit rotation-based movements if painful');
  } else if (['leftShoulder', 'rightShoulder'].includes(area)) {
    mods.push('Limit throw-ins and goalkeeper-specific diving drills');
    mods.push('Modify any overhead or push movements as needed');
  } else if (area === 'hips') {
    mods.push('Avoid explosive lateral sprints and hip-hinge power movements');
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
    description: 'Optimize recovery to be ready for your next session or match.',
    immediate: [], sameDay: [], nextDay: [], nutrition: [], icon: '🔄',
  };

  const si = [
    '10–15 minutes of cool-down jogging & walking',
    'Hydrate immediately — 500–600ml water or electrolyte drink',
    'Light static stretching of all major muscle groups',
  ];
  const sd = [
    'Full meal within 60 minutes — 4:1 carbohydrate-to-protein ratio',
    'Wear compression garments if available',
    '20 minutes of foam rolling — quads, hamstrings, calves, glutes, upper back',
  ];
  const nd = [
    '10–15 minutes of mobility flow work',
    'Light muscle activation drills — glutes, core, shoulders',
    'Self-assessment — rate soreness vs. yesterday; adjust intensity accordingly',
  ];
  const nu = [
    'Daily hydration: 2.5–3 litres of water minimum',
    'Protein: 1.6–1.8g per kg of bodyweight per day',
    'Complex carbohydrates at each meal to maintain glycogen stores',
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
      plan.sameDay = [...sd, 'Ice bath or cold shower — 8–12 minutes at 12–15°C'];
      plan.nextDay = nd; plan.nutrition = nu; break;
    case 'high':
      plan.immediate = si;
      plan.sameDay = [...sd, 'Ice bath — 10–15 minutes at 10–15°C', 'Compression boots or garments for 30–45 minutes'];
      plan.nextDay = [...nd, 'Light recovery session — 20–25 minutes easy movement', 'Sports massage or physio session recommended'];
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
      if (['leftFoot', 'rightFoot'].includes(a)) extra.push(`Ice foot bath 10–15 minutes; plantar fascia & arch stretches`);
      if (['leftShoulder', 'rightShoulder'].includes(a)) extra.push(`Ice ${lbl} — 15 min on / 45 min off; gentle pendulum mobility drills`);
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
    goalkeeper: {
      t: ['Handling drills — high catches, low rolls, diving saves', 'Shot-stopping footwork (set position → dive)', 'Distribution — throws, rolls, driven kicks', '1v1 angle-closing situations'],
      p: ['Explosive power: box jumps 4×8', 'Reaction time drills — tennis ball drops', 'Core stability: plank series & rotational work', 'Plyometric series: broad jumps, lateral bounds'],
      ta: ['Positioning for crosses and corners', 'Communication & organisation of backline', 'Starting position based on ball location', 'Distribution decision-making — when to play short vs. long'],
    },
    centerback: {
      t: ['Defensive heading — flick-ons and clearances', 'Tackling technique — standing and sliding', 'Long-range passing — driven and lofted', 'Recovery clearances under pressure'],
      p: ['Upper body strength: push/pull superset 4×10', 'Jump training: heading approach runs 5×5', 'Short burst acceleration over 5–15m', 'Physical duel shielding drill'],
      ta: ['Defensive line management — hold vs. step', 'Reading forward runs and anticipating penetration', 'Cover shadow positioning behind pressing partner', 'Building from the back — third-man combinations'],
    },
    outsideback: {
      t: ['Crossing technique — driven, whipped, cutback', '1v1 defending — contain, jockey, tackle', 'Overlapping run with ball carry & decision', 'Progressive passing out from the back'],
      p: ['Endurance intervals: 4×5min at 80% HR', 'Repeated sprint: 8×30m with 30s recovery', 'Agility: 4×8 cone change-of-direction runs', 'Recovery run technique — backtracking at pace'],
      ta: ['When to overlap vs. hold width', 'Positioning vs. an attacking winger', 'Supporting the press in the final third', 'Defensive shape when the ball is switched'],
    },
    cdm: {
      t: ['Short passing under pressure — triangle drills', 'Receiving with back to goal & turning', 'Screening & interception positioning', 'Tackle and cover shadow exercises'],
      p: ['Endurance base: 20–25 min tempo run', 'Core stability circuit — 3×15 each exercise', 'Strength in duels: resistance band pushing', 'Agility for transitions: mirror drill 4×45s'],
      ta: ['Positioning between defensive and midfield lines', 'Screening key passing lanes from opposition', 'Dropping to support centre-backs in build-up', 'First action after winning the ball — protect or progress'],
    },
    cm: {
      t: ['Passing range — short, medium and long combinations', 'Receiving under pressure & half-turn', 'Turning in tight spaces — Cruyff, inside, outside', 'Long-range shooting — hit 10 shots each side'],
      p: ['Box-to-box endurance: 3×8min reps', 'Repeated sprint ability: 10×20m efforts', 'Balance & coordination: single-leg stability work', 'Midfield duel strength: resistance pressing drills'],
      ta: ['Creating and exploiting space between lines', 'Switching play to find free fullback', 'Supporting both attack and defensive press', 'Tempo control — when to slow down vs. accelerate play'],
    },
    cam: {
      t: ['Creative through-ball passing — curved & disguised', 'Shooting from various angles & distances', 'Dribbling in tight spaces — Rondo 3v1', 'Set-piece delivery — corners, free kicks'],
      p: ['Agility & balance: 4×30s ladder footwork', 'Acceleration: 6×10m explosive starts', 'Core strength: rotational medicine ball work', 'Reaction drills: partner signal sprints'],
      ta: ['Finding and exploiting half-spaces', 'Third-man runs to support the striker', 'Transition moments — immediate pressure on loss', 'Final third decision: dribble, pass or shoot'],
    },
    outsideMid: {
      t: ['Crossing from wide — ground, driven, lofted', 'Cutting inside onto strong foot to shoot', 'Combination play with overlapping fullback', 'Defensive pressing & tracking runs'],
      p: ['Endurance for repeated wide runs: 4×6min', 'Speed over 30–40m: 6 runs with full rest', 'Agility turns at speed: T-drill 4×', 'Recovery capacity: 6×60m at 85% + walk back'],
      ta: ['Maintaining width to stretch the defence', 'When to come inside vs. stay wide', 'Tracking back to help fullback defensively', 'Positioning during opposition transitions'],
    },
    wing: {
      t: ['1v1 dribbling circuits — beat & beat again', 'Crossing from byline and cut-back positions', 'Cutting inside to shoot — both feet', 'Quick combination & give-and-go sequences'],
      p: ['Explosive speed: 6×30m sprint (full rest)', 'Repeated sprint: 10×20m (25s recovery)', 'Agility: L-drill and 5-10-5 shuttle (4×each)', 'Balance under pressure: 1v1 strength shielding'],
      ta: ['Timing the run in behind the fullback', 'Recognising when to isolate vs. combine', 'Defensive press from the front on goal kicks', 'Positioning on set pieces — near post & second ball'],
    },
    striker: {
      t: ['Finishing circuit — volleys, headers, 1v1 vs. GK', 'Heading technique — attacking runs & flick-ons', 'Hold-up play & shielding — back-to-goal', 'One-touch finishing under pressure'],
      p: ['Explosive power: squat jumps 4×8', 'Strength for hold-up: resistance duel training', 'Acceleration: 8×10m from standing start', 'Jumping & heading approach runs: 4×10'],
      ta: ['Runs in behind — curved to stay onside', 'Timing with the passer — shoulder check habit', 'Link-up with midfielders — lay-off & move', 'Pressing from the front — angle and trigger'],
    },
  };

  const d = map[pos] || map.cm;
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
  { id: 'head',          label: 'Head',              shape: 'path',    d: 'M100,12 C82,12 68,26 68,44 C68,60 78,73 92,78 L92,92 L108,92 L108,78 C122,73 132,60 132,44 C132,26 118,12 100,12 Z' },
  { id: 'neck',          label: 'Neck',              shape: 'rect',    x: 90, y: 92, width: 20, height: 12, rx: 3 },
  { id: 'leftShoulder',  label: 'Left Shoulder',     shape: 'path',    d: 'M68,103 C52,103 40,114 36,128 L58,133 L68,113 Z' },
  { id: 'rightShoulder', label: 'Right Shoulder',    shape: 'path',    d: 'M132,103 C148,103 160,114 164,128 L142,133 L132,113 Z' },
  { id: 'chest',         label: 'Chest',             shape: 'path',    d: 'M70,103 L130,103 L126,142 L74,142 Z' },
  { id: 'core',          label: 'Core / Abs',        shape: 'path',    d: 'M74,143 L126,143 L122,185 L78,185 Z' },
  { id: 'hips',          label: 'Hips',              shape: 'path',    d: 'M78,186 L122,186 L128,216 L100,230 L72,216 Z' },
  { id: 'leftArm',       label: 'Left Arm',          shape: 'path',    d: 'M35,130 L56,135 L48,200 L28,194 Z' },
  { id: 'rightArm',      label: 'Right Arm',         shape: 'path',    d: 'M165,130 L144,135 L152,200 L172,194 Z' },
  { id: 'leftThigh',     label: 'Left Thigh',        shape: 'path',    d: 'M72,220 L98,230 L94,278 L68,278 Z' },
  { id: 'rightThigh',    label: 'Right Thigh',       shape: 'path',    d: 'M128,220 L102,230 L106,278 L132,278 Z' },
  { id: 'leftKnee',      label: 'Left Knee',         shape: 'ellipse', cx: 81,  cy: 286, rx: 13, ry: 9 },
  { id: 'rightKnee',     label: 'Right Knee',        shape: 'ellipse', cx: 119, cy: 286, rx: 13, ry: 9 },
  { id: 'leftShin',      label: 'Left Shin/Calf',    shape: 'path',    d: 'M68,297 L94,297 L91,335 L65,335 Z' },
  { id: 'rightShin',     label: 'Right Shin/Calf',   shape: 'path',    d: 'M106,297 L132,297 L135,335 L109,335 Z' },
  { id: 'leftFoot',      label: 'Left Ankle/Foot',   shape: 'path',    d: 'M64,338 L90,338 L93,368 L58,368 Z' },
  { id: 'rightFoot',     label: 'Right Ankle/Foot',  shape: 'path',    d: 'M110,338 L136,338 L142,368 L107,368 Z' },
];

function BodyMapArea({ area, pain, isActive, onClick }) {
  const sev = pain || 0;
  const fill = sev > 0 ? sevColor(sev) : isActive ? '#2e3a5c' : '#1e1e30';
  const stroke = isActive ? 'rgba(255,255,255,0.6)' : sev > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)';
  const strokeWidth = isActive ? 2 : 1;
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

export default function SoccerTrainingPage() {
  const [view, setView] = useState('form'); // 'form' | 'results'
  const [form, setForm] = useState({ age: '', position: '', fitness: '', soreness: '' });
  const [painData, setPainData] = useState({});
  const [activeArea, setActiveArea] = useState(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  function handleAreaClick(areaId) {
    if (activeArea === areaId) {
      setActiveArea(null);
      setSliderVal(0);
    } else {
      setActiveArea(areaId);
      setSliderVal(painData[areaId] || 0);
    }
  }

  function handleSlider(val) {
    setSliderVal(val);
    if (!activeArea) return;
    setPainData(prev => {
      const next = { ...prev };
      if (val === 0) delete next[activeArea];
      else next[activeArea] = val;
      return next;
    });
  }

  function removeArea(id) {
    setPainData(prev => { const next = { ...prev }; delete next[id]; return next; });
    if (activeArea === id) { setActiveArea(null); setSliderVal(0); }
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
            <span className="text-2xl">⚽</span>
            <h1 className="text-2xl font-bold text-white">Soccer Training Plan</h1>
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
                type="number" min="10" max="50" placeholder="e.g. 22"
                value={form.age}
                onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-gray-600 bg-[#0f0f1a] focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="col-span-1 sm:col-span-1">
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
                <option value="high">Club / Semi-Pro</option>
                <option value="elite">Elite / Professional</option>
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
                    isActive={activeArea === area.id}
                    onClick={() => handleAreaClick(area.id)}
                  />
                ))}
              </svg>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-sm text-gray-300 mb-3 italic">
                  {activeArea
                    ? `Adjusting: ${AREA_LABELS[activeArea]}`
                    : 'Select a body area to rate severity'}
                </div>
                {activeArea && (
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
                        <button
                          onClick={() => removeArea(id)}
                          className="ml-1 opacity-60 hover:opacity-100 text-xs leading-none"
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error + Generate */}
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
      {/* Header */}
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

      {/* Disclaimer */}
      <div className="text-xs text-gray-600 italic px-1">
        This plan is for informational purposes only. Always consult a qualified coach or sports medicine professional before training with pain or injury.
      </div>

      {/* Training card */}
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

      {/* Recovery card */}
      <PlanCard
        icon={plan.recovery.icon}
        title={plan.recovery.title}
        description={plan.recovery.description}
        sections={[
          ['Immediate Post-Training', plan.recovery.immediate],
          ['Same Day', plan.recovery.sameDay],
          ['Next Day', plan.recovery.nextDay],
          ['Nutrition Focus', plan.recovery.nutrition],
        ]}
      />

      {/* Position drills */}
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

      {/* Back button */}
      <button
        onClick={() => setView('form')}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all border border-gray-600 text-gray-300 hover:border-gray-400"
      >
        ← Generate Another Plan
      </button>
    </div>
  );
}
