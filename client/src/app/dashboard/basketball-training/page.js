'use client';
import { useState } from 'react';

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

const INJURY_PROTOCOLS = {
  head: {
    immediate: ['Stop all activity immediately', 'Assess for concussion symptoms — dizziness, nausea, blurred vision', 'If symptoms present, seek medical attention immediately', 'Apply cold compress to affected area for 10–15 minutes'],
    first48h: ['Complete rest — no physical activity', 'Monitor symptoms every 2–4 hours', 'Avoid screens and bright lights if headache persists', 'Sleep with head slightly elevated', 'No pain medication without doctor approval (can mask symptoms)'],
    rehab: ['Gradual return-to-play protocol only after cleared by physician', 'Light walking after 24–48h if symptom-free', 'Neck mobility exercises — gentle chin tucks, side bends', 'Balance and proprioception drills when cleared', 'Progressive aerobic activity — stationary bike, light jogging'],
    avoid: ['Contact sports until fully cleared', 'Heavy lifting or straining', 'Activities with fall risk', 'Alcohol and sedatives (mask symptoms)'],
  },
  neck: {
    immediate: ['Stop activity and immobilize neck if severe pain', 'Apply ice for 15–20 minutes', 'Avoid any neck rotation or flexion movements', 'Seek medical evaluation if numbness or tingling in arms'],
    first48h: ['Gentle heat therapy after initial 24h ice', 'Rest in neutral neck position', 'Avoid looking down at phone or laptop for extended periods', 'Sleep with supportive pillow maintaining neutral alignment', 'Gentle chin tucks — 10 reps, 3× daily if pain allows'],
    rehab: ['Isometric neck strengthening — press hand against head in all 4 directions, 5-second holds', 'Scapular retraction exercises — squeeze shoulder blades, 3×15', 'Thoracic spine mobility — foam roller extensions', 'Progressive resistance band neck work', 'Gradual return to sport-specific movements'],
    avoid: ['Contact drills until pain-free through full ROM', 'Overhead pressing movements', 'Wrestling or heading the ball', 'Sudden jerking or whiplash-type movements'],
  },
  leftShoulder: { shoulder: true },
  rightShoulder: { shoulder: true },
  chest: {
    immediate: ['Stop upper body activity immediately', 'Apply ice for 15–20 minutes every 2–3 hours', 'Rest arm in comfortable position — sling if severe', 'Seek medical evaluation if breathing is affected or there is a popping sensation'],
    first48h: ['Continue ice therapy — 15 min on, 45 min off', 'Avoid pushing, pulling, or lifting movements', 'Sleep on unaffected side or back', 'Gentle pendulum swings — let arm hang and make small circles', 'Anti-inflammatory foods: turmeric, ginger, omega-3s'],
    rehab: ['Wall push-ups progressing to incline push-ups when pain-free', 'Resistance band internal/external rotation — 3×15', 'Scapular stabilization — prone Y-T-W raises', 'Doorway pec stretch — 30-second holds, 3×', 'Gradual return to shooting and passing drills'],
    avoid: ['Bench press and heavy pushing until cleared', 'Contact drills and blocking', 'Overhead throwing or shooting at full power', 'Dips and deep stretching of the chest'],
  },
  core: {
    immediate: ['Stop activity and rest in comfortable position', 'Apply ice for 15–20 minutes to affected area', 'Avoid twisting, bending, or lifting movements', 'Seek medical attention if severe pain or inability to stand straight'],
    first48h: ['Gentle walking as tolerated — promotes blood flow', 'Avoid sit-ups, crunches, or any abdominal flexion', 'Sleep on back with knees elevated or on side with pillow between knees', 'Diaphragmatic breathing exercises — 5 minutes, 3× daily', 'Heat therapy after 48h if muscle spasm persists'],
    rehab: ['Dead bug exercise — 3×10 per side', 'Bird dog — 3×10 per side, hold 3 seconds', 'Plank progression: knee plank → full plank, 20–30 seconds', 'Pallof press with resistance band — anti-rotation work', 'Gradual return to sport-specific rotational movements'],
    avoid: ['Heavy compound lifts (squats, deadlifts)', 'Rotational sports movements at full speed', 'Sit-ups and crunches in early rehab', 'Any movement that causes sharp pain'],
  },
  hips: {
    immediate: ['Stop activity and rest the hip', 'Apply ice for 15–20 minutes', 'Avoid weight-bearing if severe pain — use crutches if needed', 'Seek evaluation if unable to bear weight or there is a popping sensation'],
    first48h: ['Relative rest — limit walking to necessary movement only', 'Ice 3–4× daily for 15 minutes', 'Sleep with pillow between knees if side-sleeping', 'Gentle hip flexor stretch — 20-second holds, 3× if pain allows', 'Avoid sitting for prolonged periods'],
    rehab: ['Clamshells — 3×15 per side for glute medius activation', 'Hip bridges — 3×15, progress to single-leg', 'Pigeon pose stretch — 90-second holds per side', 'Lateral band walks — 3×10 each direction', 'Progressive running program: walk → jog → sprint over 2–3 weeks'],
    avoid: ['Deep squatting and lunges in early rehab', 'Cutting and pivoting movements', 'Prolonged sitting with hip flexed past 90°', 'High-impact activities until pain-free'],
  },
  leftArm: { arm: true },
  rightArm: { arm: true },
  leftThigh: { thigh: true },
  rightThigh: { thigh: true },
  leftKnee: { knee: true },
  rightKnee: { knee: true },
  leftShin: { shin: true },
  rightShin: { shin: true },
  leftFoot: { foot: true },
  rightFoot: { foot: true },
};

function getProtocol(area, severity) {
  const base = INJURY_PROTOCOLS[area];
  if (!base) return null;

  if (base.shoulder) return {
    immediate: [`Stop all overhead and pushing movements`, `Apply ice to ${AREA_LABELS[area]} for 15–20 minutes every 2–3 hours`, `Rest arm in comfortable position — avoid reaching overhead`, `Seek medical evaluation if there is numbness, tingling, or inability to lift the arm`],
    first48h: ['Continue ice therapy — 15 min on, 45 min off', 'Gentle pendulum swings — let arm hang and make small circles, 2 minutes', 'Avoid any lifting, pushing, or pulling movements', 'Sleep on unaffected side with pillow supporting the injured arm', 'Anti-inflammatory nutrition: omega-3s, turmeric, berries'],
    rehab: ['Wall slides — 3×10, progress range as tolerated', 'Resistance band external rotation — 3×15 light resistance', 'Scapular retraction — squeeze shoulder blades, 3×15', 'Sleeper stretch — 30-second holds, 3×', 'Progressive throwing/shooting program starting at 50% intensity'],
    avoid: ['Overhead pressing and bench press until pain-free', 'Contact drills and blocking', 'Full-power shooting or throwing', 'Dips and deep shoulder stretching'],
  };

  if (base.arm) return {
    immediate: ['Stop all activity involving the arm', 'Apply ice for 15–20 minutes to the affected area', 'Rest and immobilize — avoid gripping or lifting', 'Seek medical evaluation if there is visible deformity or inability to move the joint'],
    first48h: ['Continue RICE protocol — Rest, Ice, Compression, Elevation', 'Gentle wrist and finger mobility circles if pain allows', 'Avoid any gripping, lifting, or weight-bearing through the arm', 'Sleep with arm elevated on pillows', 'Anti-inflammatory foods and adequate hydration'],
    rehab: ['Wrist curls and extensions with light weight — 3×15', 'Grip strengthening — stress ball squeezes, 3×20', 'Forearm pronation/supination with light dumbbell — 3×10', 'Progressive resistance band work for full arm', 'Gradual return to ball-handling drills starting stationary'],
    avoid: ['Heavy lifting and weight training', 'Contact drills that stress the arm', 'Repetitive motions that caused the injury', 'Push-ups and planks until pain-free'],
  };

  if (base.thigh) return {
    immediate: ['Stop activity immediately — do not try to play through it', 'Apply ice for 15–20 minutes, repeat every 2–3 hours', 'Compress with elastic bandage — snug but not tight', 'Elevate leg above heart level when resting'],
    first48h: ['Continue RICE protocol consistently', 'Avoid stretching the injured muscle — this can worsen tears', 'Use crutches if walking causes a limp', 'Gentle pain-free range of motion only — no forcing', 'Anti-inflammatory diet: lean protein, berries, leafy greens, omega-3s'],
    rehab: ['Gentle static stretching when pain-free — 20-second holds, 3×', 'Progressive strengthening: isometric → concentric → eccentric', 'Stationary bike — light resistance, 10–15 minutes', 'Nordic hamstring curls (progressive) for posterior thigh', 'Gradual return to running: walk → jog → sprint over 10–14 days'],
    avoid: ['Sprinting and explosive movements until cleared', 'Deep stretching of the injured muscle', 'Massage directly on the injury in the first 72 hours', 'Returning to play before achieving full pain-free ROM'],
  };

  if (base.knee) return {
    immediate: ['Stop activity immediately — do not bear weight if unstable', 'Apply ice for 15–20 minutes, elevate above heart', 'Compress with elastic bandage or knee sleeve', 'Seek medical evaluation if knee gives out, locks, or swells rapidly'],
    first48h: ['Strict RICE protocol — Rest, Ice, Compression, Elevation', 'Avoid HARM: Heat, Alcohol, Running, Massage (first 72h)', 'Use crutches if unable to walk without a limp', 'Gentle quad sets — tighten thigh muscle, hold 5 seconds, 10 reps', 'Sleep with knee slightly elevated on pillow'],
    rehab: ['Straight leg raises — 3×15, progress to ankle weight', 'Terminal knee extensions with band — 3×15', 'Mini squats to 45° — 3×10, progress depth as tolerated', 'Single-leg balance — 30 seconds each leg, progress to eyes closed', 'Step-ups — 3×10, start with 4-inch step, progress gradually'],
    avoid: ['Jumping and landing activities until cleared', 'Deep squats and lunges in early rehab', 'Cutting, pivoting, and lateral movements', 'Returning to sport before passing functional tests'],
  };

  if (base.shin) return {
    immediate: ['Stop impact activity immediately', 'Apply ice for 15–20 minutes along the shin', 'Elevate leg when resting', 'Seek medical evaluation if pain is localized to one spot (stress fracture concern)'],
    first48h: ['Switch to non-weight-bearing cardio — swimming, cycling', 'Ice after any activity — 15 minutes minimum', 'Compression sleeve during daily activities', 'Gentle calf stretching — 30-second holds, 3× each leg', 'Foam rolling of calves (not directly on shin bone)'],
    rehab: ['Calf raises — double leg progressing to single leg, 3×15', 'Tibialis anterior raises — lean against wall, lift toes, 3×15', 'Toe walking and heel walking — 30 seconds each, 3×', 'Gradual return to impact: walk → jog → run on soft surface', 'Assess footwear — replace worn shoes, consider orthotics'],
    avoid: ['Running on hard surfaces (concrete) during rehab', 'Increasing training volume by more than 10% per week', 'Playing through shin pain — this worsens the condition', 'Barefoot activity on hard surfaces'],
  };

  if (base.foot) return {
    immediate: ['Stop weight-bearing activity immediately', 'Apply ice for 15–20 minutes, elevate above heart', 'Compress with elastic bandage', 'Seek medical evaluation if unable to bear weight or there is significant swelling'],
    first48h: ['Strict RICE protocol', 'Avoid walking barefoot — wear supportive shoes always', 'Use crutches if unable to walk without significant pain', 'Ankle alphabet — trace A–Z with toes, 2× daily', 'Gentle calf stretching — 30-second holds, 3×'],
    rehab: ['Resistance band ankle work — dorsiflexion, plantarflexion, inversion, eversion — 3×15 each', 'Single-leg balance — 30 seconds, progress to unstable surface', 'Calf raises — double leg → single leg, 3×15', 'Towel curls with toes — strengthens foot intrinsics, 3×10', 'Gradual return to running: walk → jog → sprint over 2–3 weeks'],
    avoid: ['Playing on uneven surfaces until cleared', 'Wearing unsupportive footwear', 'Jumping and landing activities', 'Ignoring persistent pain — foot injuries can become chronic'],
  };

  return null;
}

function buildInjuryPlan(age, soreness, painData) {
  const entries = Object.entries(painData).filter(([, v]) => v > 0);
  const maxSev = entries.length ? Math.max(...entries.map(([, v]) => v)) : 0;
  const primaryArea = entries.length
    ? entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;

  let severity = 'mild';
  if (soreness === 'severe' || maxSev >= 7) severity = 'severe';
  else if (soreness === 'moderate' || maxSev >= 4) severity = 'moderate';
  else if (soreness === 'mild' || maxSev >= 1) severity = 'mild';

  const protocols = [];
  const areaNames = [];
  entries.forEach(([area, sev]) => {
    const proto = getProtocol(area, sev);
    if (proto) {
      protocols.push({ area, severity: sev, ...proto });
      areaNames.push(AREA_LABELS[area]);
    }
  });

  return {
    age,
    severity,
    primaryArea,
    maxSev,
    painAreas: { ...painData },
    areaNames,
    protocols,
  };
}

function sevColor(s) {
  if (!s) return '#1e1e30';
  const t = s / 10;
  const h = Math.round(50 - t * 50);
  const sa = Math.round(85 + t * 12);
  const l = Math.round(60 - t * 20);
  return `hsl(${h},${sa}%,${l}%)`;
}

const SEVERITY_STYLES = {
  mild: 'bg-green-500/15 text-green-300 border border-green-500/30',
  moderate: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  severe: 'bg-red-500/15 text-red-300 border border-red-500/30',
};

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

function ProtocolCard({ protocol }) {
  const areaName = AREA_LABELS[protocol.area];
  return (
    <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🩹</span>
          <h3 className="text-lg font-bold text-white">{areaName}</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ borderColor: sevColor(protocol.severity), color: sevColor(protocol.severity), backgroundColor: `${sevColor(protocol.severity)}18`, borderWidth: 1 }}>
          Severity: {protocol.severity}/10
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-2">Immediate Action</div>
          <ul className="space-y-1">
            {protocol.immediate.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-yellow-400 mb-2">First 48 Hours</div>
          <ul className="space-y-1">
            {protocol.first48h.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-2">Rehabilitation</div>
          <ul className="space-y-1">
            {protocol.rehab.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2">What to Avoid</div>
          <ul className="space-y-1">
            {protocol.avoid.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function InjuryRecoveryPage() {
  const [view, setView] = useState('form');
  const [form, setForm] = useState({ age: '', soreness: '' });
  const [painData, setPainData] = useState({});
  const [selectedAreas, setSelectedAreas] = useState(new Set());
  const [focusedArea, setFocusedArea] = useState(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  function handleAreaClick(areaId) {
    if (selectedAreas.has(areaId)) {
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
    if (!age || !form.soreness) {
      setError('Please fill in Age and Overall Pain Level.');
      return;
    }
    if (Object.keys(painData).length === 0) {
      setError('Please select at least one body area on the pain map.');
      return;
    }
    const generated = buildInjuryPlan(age, form.soreness, painData);
    setPlan(generated);
    setView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const activePainEntries = Object.entries(painData).filter(([, v]) => v > 0);

  if (view === 'form') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🩹</span>
            <h1 className="text-2xl font-bold text-white">Injury Recovery</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Map your injury, rate the severity, and get a personalized recovery protocol.
          </p>
        </div>

        <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-4">Your Info</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
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
              <label className="block text-xs text-gray-400 mb-1">Overall Pain Level</label>
              <select
                value={form.soreness}
                onChange={e => setForm(p => ({ ...p, soreness: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-gray-600 bg-[#0f0f1a] focus:outline-none focus:border-blue-500"
              >
                <option value="">Select…</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-1">Injury Mapping</h2>
          <p className="text-xs text-gray-500 mb-4">Click body areas where you feel pain or injury, then rate severity with the slider.</p>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
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
          Generate Recovery Plan
        </button>
      </div>
    );
  }

  const painEntries = Object.entries(plan.painAreas).filter(([, v]) => v > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Injury Recovery Plan</h1>
          <p className="text-gray-400 text-sm">
            {plan.areaNames.join(', ')} · <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${SEVERITY_STYLES[plan.severity]}`}>{plan.severity}</span>
          </p>
        </div>
        <button
          onClick={() => setView('form')}
          className="self-start sm:self-auto px-4 py-2 rounded-lg text-sm text-gray-300 border border-gray-600 hover:border-gray-400 transition-colors"
        >
          ← Back to Form
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Age', value: plan.age },
          { label: 'Injured Areas', value: painEntries.length
              ? painEntries.map(([a, v]) => `${AREA_LABELS[a]} ${v}/10`).join(', ')
              : 'None reported' },
          { label: 'Severity', value: (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${SEVERITY_STYLES[plan.severity]}`}>
              {plan.severity}
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
        This recovery plan is for informational purposes only. Always consult a qualified sports medicine professional or physician before beginning any rehabilitation program.
      </div>

      {plan.protocols.map((proto, i) => (
        <ProtocolCard key={i} protocol={proto} />
      ))}

      <button
        onClick={() => setView('form')}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all border border-gray-600 text-gray-300 hover:border-gray-400"
      >
        ← Generate Another Plan
      </button>
    </div>
  );
}
