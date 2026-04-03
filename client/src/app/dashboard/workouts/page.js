'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-700 p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#1e1e30' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tooltip({ text, children }) {
  return (
    <div className="relative group inline-flex items-center gap-1">
      {children}
      <span className="text-gray-500 cursor-help text-xs">(?)</span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs text-white bg-gray-900 border border-gray-700 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity whitespace-normal w-56 z-50 shadow-lg">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45" />
      </div>
    </div>
  );
}

const fieldTooltips = {
  sets: 'The number of times you perform a group of consecutive reps. For example, 3 sets of 10 reps means you do 10 reps, rest, and repeat 3 times.',
  reps: 'Repetitions — the number of times you perform an exercise in one set. For example, 10 reps of squats means doing 10 squats before resting.',
  weight: 'The amount of weight (in pounds) used for the exercise. Leave blank for bodyweight exercises.',
  rpe: 'Rate of Perceived Exertion (1-10). Measures how hard the exercise felt. 1 = very easy, 5 = moderate, 7 = challenging, 9 = near max effort, 10 = absolute maximum.',
  duration: 'Total time spent on the workout session in minutes, including rest periods.',
};

const defaultSession = { session_date: '', session_name: '', duration_minutes: '', notes: '' };
const defaultExercise = { exercise_name: '', sets: '', reps: '', weight_lbs: '', rpe: '', notes: '' };

const workoutTemplates = [
  {
    name: 'Push Day',
    duration_minutes: 60,
    notes: 'Chest, shoulders, and triceps focused session',
    exercises: [
      { exercise_name: 'Bench Press', sets: 4, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Overhead Press', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Lateral Raises', sets: 3, reps: 15, weight_lbs: '', rpe: 6, notes: '' },
      { exercise_name: 'Tricep Pushdowns', sets: 3, reps: 12, weight_lbs: '', rpe: 6, notes: '' },
    ],
  },
  {
    name: 'Pull Day',
    duration_minutes: 60,
    notes: 'Back and biceps focused session',
    exercises: [
      { exercise_name: 'Deadlift', sets: 4, reps: 5, weight_lbs: '', rpe: 8, notes: '' },
      { exercise_name: 'Barbell Rows', sets: 4, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Pull-Ups', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: 'Bodyweight or weighted' },
      { exercise_name: 'Face Pulls', sets: 3, reps: 15, weight_lbs: '', rpe: 6, notes: '' },
      { exercise_name: 'Barbell Curls', sets: 3, reps: 12, weight_lbs: '', rpe: 6, notes: '' },
    ],
  },
  {
    name: 'Leg Day',
    duration_minutes: 65,
    notes: 'Quads, hamstrings, and glutes focused session',
    exercises: [
      { exercise_name: 'Barbell Squats', sets: 4, reps: 8, weight_lbs: '', rpe: 8, notes: '' },
      { exercise_name: 'Romanian Deadlifts', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Leg Press', sets: 3, reps: 12, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Walking Lunges', sets: 3, reps: 12, weight_lbs: '', rpe: 7, notes: 'Per leg' },
      { exercise_name: 'Calf Raises', sets: 4, reps: 15, weight_lbs: '', rpe: 6, notes: '' },
    ],
  },
  {
    name: 'Upper Body',
    duration_minutes: 55,
    notes: 'Balanced upper body session targeting chest, back, shoulders, and arms',
    exercises: [
      { exercise_name: 'Bench Press', sets: 4, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Barbell Rows', sets: 4, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Dumbbell Shoulder Press', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Lat Pulldowns', sets: 3, reps: 12, weight_lbs: '', rpe: 6, notes: '' },
      { exercise_name: 'Dumbbell Curls', sets: 3, reps: 12, weight_lbs: '', rpe: 6, notes: '' },
      { exercise_name: 'Tricep Dips', sets: 3, reps: 12, weight_lbs: '', rpe: 6, notes: '' },
    ],
  },
  {
    name: 'Full Body',
    duration_minutes: 70,
    notes: 'Complete full body workout hitting all major muscle groups',
    exercises: [
      { exercise_name: 'Barbell Squats', sets: 3, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Bench Press', sets: 3, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Barbell Rows', sets: 3, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Overhead Press', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Romanian Deadlifts', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Plank', sets: 3, reps: '', weight_lbs: '', rpe: 6, notes: '60 seconds each' },
    ],
  },
  {
    name: 'Basketball Conditioning',
    duration_minutes: 50,
    notes: 'Athletic conditioning focused on basketball performance',
    exercises: [
      { exercise_name: 'Box Jumps', sets: 4, reps: 8, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Lateral Bounds', sets: 3, reps: 10, weight_lbs: '', rpe: 7, notes: 'Per side' },
      { exercise_name: 'Single Leg Squats', sets: 3, reps: 8, weight_lbs: '', rpe: 7, notes: 'Per leg' },
      { exercise_name: 'Medicine Ball Slams', sets: 3, reps: 12, weight_lbs: '', rpe: 7, notes: '' },
      { exercise_name: 'Defensive Slides', sets: 4, reps: '', weight_lbs: '', rpe: 8, notes: '30 seconds each set' },
      { exercise_name: 'Sprint Intervals', sets: 6, reps: '', weight_lbs: '', rpe: 9, notes: '20 sec sprint, 40 sec rest' },
    ],
  },
];

export default function WorkoutsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sessionForm, setSessionForm] = useState(defaultSession);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const [activeSession, setActiveSession] = useState(null);
  const [exerciseForm, setExerciseForm] = useState(defaultExercise);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState('');
  const [templateExercises, setTemplateExercises] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedData, setExpandedData] = useState(null);

  // Edit state
  const [editingSession, setEditingSession] = useState(null);
  const [editSessionForm, setEditSessionForm] = useState(defaultSession);
  const [editSessionLoading, setEditSessionLoading] = useState(false);
  const [editSessionError, setEditSessionError] = useState('');
  const [editingExercise, setEditingExercise] = useState(null);
  const [editExerciseForm, setEditExerciseForm] = useState(defaultExercise);

  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await apiFetch('/workouts');
      if (res.ok) setSessions(await res.json());
    } catch {}
    setLoading(false);
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    setSessionError('');
    setSessionLoading(true);
    try {
      const res = await apiFetch('/workouts', {
        method: 'POST',
        body: JSON.stringify({
          ...sessionForm,
          duration_minutes: sessionForm.duration_minutes ? parseInt(sessionForm.duration_minutes) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSessionError(data.error || 'Failed to create session');
        setSessionLoading(false);
        return;
      }
      // If template exercises are queued, add them all
      if (templateExercises && templateExercises.length > 0) {
        for (const ex of templateExercises) {
          await apiFetch(`/workouts/${data.id}/exercises`, {
            method: 'POST',
            body: JSON.stringify({
              exercise_name: ex.exercise_name,
              sets: ex.sets ? parseInt(ex.sets) : null,
              reps: ex.reps ? parseInt(ex.reps) : null,
              weight_lbs: ex.weight_lbs ? parseFloat(ex.weight_lbs) : null,
              rpe: ex.rpe ? parseFloat(ex.rpe) : null,
              notes: ex.notes || null,
            }),
          });
        }
        setTemplateExercises(null);
        closeModal();
        loadSessions();
      } else {
        setActiveSession({ ...data, exercises: [] });
        setSessionForm(defaultSession);
        loadSessions();
      }
    } catch {
      setSessionError('Network error');
    }
    setSessionLoading(false);
  }

  function handleSelectTemplate(template) {
    setSessionForm({
      session_date: new Date().toISOString().split('T')[0],
      session_name: template.name,
      duration_minutes: String(template.duration_minutes),
      notes: template.notes,
    });
    setTemplateExercises(template.exercises);
    setShowTemplates(false);
  }

  async function handleAddExercise(e) {
    e.preventDefault();
    if (!activeSession) return;
    setExerciseError('');
    setExerciseLoading(true);
    try {
      const res = await apiFetch(`/workouts/${activeSession.id}/exercises`, {
        method: 'POST',
        body: JSON.stringify({
          exercise_name: exerciseForm.exercise_name,
          sets: exerciseForm.sets ? parseInt(exerciseForm.sets) : null,
          reps: exerciseForm.reps ? parseInt(exerciseForm.reps) : null,
          weight_lbs: exerciseForm.weight_lbs ? parseFloat(exerciseForm.weight_lbs) : null,
          rpe: exerciseForm.rpe ? parseFloat(exerciseForm.rpe) : null,
          notes: exerciseForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExerciseError(data.error || 'Failed to add exercise');
        setExerciseLoading(false);
        return;
      }
      setActiveSession((prev) => ({ ...prev, exercises: [...prev.exercises, data] }));
      setExerciseForm(defaultExercise);
    } catch {
      setExerciseError('Network error');
    }
    setExerciseLoading(false);
  }

  async function handleDeleteExercise(sessionId, exerciseId) {
    try {
      await apiFetch(`/workouts/${sessionId}/exercises/${exerciseId}`, { method: 'DELETE' });
      if (activeSession && activeSession.id === sessionId) {
        setActiveSession((prev) => ({
          ...prev,
          exercises: prev.exercises.filter((ex) => ex.id !== exerciseId),
        }));
      }
      if (expandedData && expandedData.id === sessionId) {
        setExpandedData((prev) => ({
          ...prev,
          exercises: prev.exercises.filter((ex) => ex.id !== exerciseId),
        }));
      }
      loadSessions();
    } catch {}
  }

  async function handleDeleteSession(id) {
    if (!confirm('Delete this workout session?')) return;
    setDeleteLoading(id);
    try {
      await apiFetch(`/workouts/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (expandedSession === id) {
        setExpandedSession(null);
        setExpandedData(null);
      }
    } catch {}
    setDeleteLoading(null);
  }

  async function handleExpand(session) {
    if (expandedSession === session.id) {
      setExpandedSession(null);
      setExpandedData(null);
      return;
    }
    setExpandedSession(session.id);
    try {
      const res = await apiFetch(`/workouts/${session.id}`);
      if (res.ok) setExpandedData(await res.json());
    } catch {}
  }

  // Edit session
  function startEditSession(session) {
    setEditingSession(session.id);
    setEditSessionForm({
      session_date: session.session_date ? session.session_date.split('T')[0] : '',
      session_name: session.session_name || '',
      duration_minutes: session.duration_minutes ? String(session.duration_minutes) : '',
      notes: session.notes || '',
    });
    setEditSessionError('');
  }

  async function handleUpdateSession(e) {
    e.preventDefault();
    setEditSessionError('');
    setEditSessionLoading(true);
    try {
      const res = await apiFetch(`/workouts/${editingSession}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editSessionForm,
          duration_minutes: editSessionForm.duration_minutes ? parseInt(editSessionForm.duration_minutes) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditSessionError(data.error || 'Failed to update session');
        setEditSessionLoading(false);
        return;
      }
      setEditingSession(null);
      loadSessions();
      if (expandedData && expandedData.id === data.id) {
        setExpandedData((prev) => ({ ...prev, ...data }));
      }
    } catch {
      setEditSessionError('Network error');
    }
    setEditSessionLoading(false);
  }

  // Edit exercise
  function startEditExercise(ex) {
    setEditingExercise(ex.id);
    setEditExerciseForm({
      exercise_name: ex.exercise_name || '',
      sets: ex.sets != null ? String(ex.sets) : '',
      reps: ex.reps != null ? String(ex.reps) : '',
      weight_lbs: ex.weight_lbs != null ? String(ex.weight_lbs) : '',
      rpe: ex.rpe != null ? String(ex.rpe) : '',
      notes: ex.notes || '',
    });
  }

  async function handleUpdateExercise(sessionId) {
    try {
      const res = await apiFetch(`/workouts/${sessionId}/exercises/${editingExercise}`, {
        method: 'PUT',
        body: JSON.stringify({
          exercise_name: editExerciseForm.exercise_name,
          sets: editExerciseForm.sets ? parseInt(editExerciseForm.sets) : null,
          reps: editExerciseForm.reps ? parseInt(editExerciseForm.reps) : null,
          weight_lbs: editExerciseForm.weight_lbs ? parseFloat(editExerciseForm.weight_lbs) : null,
          rpe: editExerciseForm.rpe ? parseFloat(editExerciseForm.rpe) : null,
          notes: editExerciseForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setEditingExercise(null);
      if (expandedData && expandedData.id === sessionId) {
        setExpandedData((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) => (ex.id === data.id ? data : ex)),
        }));
      }
    } catch {}
  }

  // Add exercise from expanded view
  async function handleAddExerciseToExpanded(e) {
    e.preventDefault();
    if (!expandedData) return;
    setExerciseError('');
    setExerciseLoading(true);
    try {
      const res = await apiFetch(`/workouts/${expandedData.id}/exercises`, {
        method: 'POST',
        body: JSON.stringify({
          exercise_name: exerciseForm.exercise_name,
          sets: exerciseForm.sets ? parseInt(exerciseForm.sets) : null,
          reps: exerciseForm.reps ? parseInt(exerciseForm.reps) : null,
          weight_lbs: exerciseForm.weight_lbs ? parseFloat(exerciseForm.weight_lbs) : null,
          rpe: exerciseForm.rpe ? parseFloat(exerciseForm.rpe) : null,
          notes: exerciseForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExerciseError(data.error || 'Failed to add exercise');
        setExerciseLoading(false);
        return;
      }
      setExpandedData((prev) => ({ ...prev, exercises: [...prev.exercises, data] }));
      setExerciseForm(defaultExercise);
      loadSessions();
    } catch {
      setExerciseError('Network error');
    }
    setExerciseLoading(false);
  }

  function closeModal() {
    setShowModal(false);
    setActiveSession(null);
    setSessionForm(defaultSession);
    setExerciseForm(defaultExercise);
    setSessionError('');
    setExerciseError('');
    setTemplateExercises(null);
    setShowTemplates(false);
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500";
  const inputStyle = { backgroundColor: '#16213e' };

  function ExerciseFormFields({ form, setForm, compact }) {
    return (
      <>
        <input
          type="text"
          value={form.exercise_name}
          onChange={(e) => setForm({ ...form, exercise_name: e.target.value })}
          placeholder="Exercise name *"
          required
          className={inputClass}
          style={inputStyle}
        />
        <div className={`grid ${compact ? 'grid-cols-4' : 'grid-cols-2'} gap-3`}>
          <div>
            <Tooltip text={fieldTooltips.sets}>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sets</label>
            </Tooltip>
            <input
              type="number"
              value={form.sets}
              onChange={(e) => setForm({ ...form, sets: e.target.value })}
              placeholder="Sets"
              min="1"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <Tooltip text={fieldTooltips.reps}>
              <label className="block text-xs font-medium text-gray-400 mb-1">Reps</label>
            </Tooltip>
            <input
              type="number"
              value={form.reps}
              onChange={(e) => setForm({ ...form, reps: e.target.value })}
              placeholder="Reps"
              min="1"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <Tooltip text={fieldTooltips.weight}>
              <label className="block text-xs font-medium text-gray-400 mb-1">Weight (lbs)</label>
            </Tooltip>
            <input
              type="number"
              value={form.weight_lbs}
              onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })}
              placeholder="Weight"
              step="0.5"
              min="0"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <Tooltip text={fieldTooltips.rpe}>
              <label className="block text-xs font-medium text-gray-400 mb-1">RPE (1-10)</label>
            </Tooltip>
            <input
              type="number"
              value={form.rpe}
              onChange={(e) => setForm({ ...form, rpe: e.target.value })}
              placeholder="RPE"
              step="0.5"
              min="1"
              max="10"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes (optional)"
          className={inputClass}
          style={inputStyle}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Workouts</h1>
          <p className="text-gray-400 mt-1">Log and track your training sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowModal(true); setShowTemplates(true); }}
            className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity border border-blue-500"
            style={{ backgroundColor: 'transparent', color: '#60a5fa' }}
          >
            Templates
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#2563eb' }}
          >
            + Log Workout
          </button>
        </div>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div
          className="rounded-xl p-12 border border-gray-800 text-center"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="text-xl font-bold text-white mb-2">No sessions yet</h3>
          <p className="text-gray-400 mb-6">Start tracking your workouts to see them here.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setShowModal(true); setShowTemplates(true); }}
              className="px-6 py-3 rounded-lg font-bold text-blue-400 border border-blue-500 hover:bg-blue-900/20"
            >
              Use a Template
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90"
              style={{ backgroundColor: '#2563eb' }}
            >
              Log First Workout
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-gray-800 overflow-hidden"
              style={{ backgroundColor: '#1e1e30' }}
            >
              {/* Session header - either editing or viewing */}
              {editingSession === s.id ? (
                <form onSubmit={handleUpdateSession} className="px-5 py-4 space-y-3">
                  {editSessionError && (
                    <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{editSessionError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editSessionForm.session_name}
                      onChange={(e) => setEditSessionForm({ ...editSessionForm, session_name: e.target.value })}
                      placeholder="Session Name"
                      className={inputClass}
                      style={inputStyle}
                    />
                    <input
                      type="date"
                      value={editSessionForm.session_date}
                      onChange={(e) => setEditSessionForm({ ...editSessionForm, session_date: e.target.value })}
                      required
                      className={inputClass}
                      style={{ ...inputStyle, colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Tooltip text={fieldTooltips.duration}>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Duration (min)</label>
                      </Tooltip>
                      <input
                        type="number"
                        value={editSessionForm.duration_minutes}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, duration_minutes: e.target.value })}
                        placeholder="60"
                        min="1"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <input
                      type="text"
                      value={editSessionForm.notes}
                      onChange={(e) => setEditSessionForm({ ...editSessionForm, notes: e.target.value })}
                      placeholder="Notes"
                      className={`${inputClass} mt-5`}
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={editSessionLoading} className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50" style={{ backgroundColor: '#2563eb' }}>
                      {editSessionLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditingSession(null)} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm hover:text-white">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleExpand(s)} className="text-left">
                      <div className="text-sm font-bold text-white hover:text-blue-400 transition-colors">
                        {s.session_name || 'Unnamed Session'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(s.session_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        {s.duration_minutes && ` · ${s.duration_minutes} min`}
                        {` · ${s.exercise_count} exercise${s.exercise_count !== 1 ? 's' : ''}`}
                      </div>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExpand(s)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                    >
                      {expandedSession === s.id ? 'Collapse' : 'View'}
                    </button>
                    <button
                      onClick={() => { handleExpand(s); startEditSession(s); }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-blue-800 text-blue-400 hover:bg-blue-900/20 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      disabled={deleteLoading === s.id}
                      className="px-3 py-1.5 text-xs rounded-lg border border-red-900 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded exercises */}
              {expandedSession === s.id && expandedData && (
                <div className="border-t border-gray-800 px-5 py-4">
                  {expandedData.notes && (
                    <p className="text-sm text-gray-400 mb-3 italic">{expandedData.notes}</p>
                  )}
                  {expandedData.exercises.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-4">No exercises logged for this session.</p>
                  ) : (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                            <th className="text-left py-2 pr-4">Exercise</th>
                            <th className="text-center py-2 px-3">Sets</th>
                            <th className="text-center py-2 px-3">Reps</th>
                            <th className="text-center py-2 px-3">Weight</th>
                            <th className="text-center py-2 px-3">RPE</th>
                            <th className="text-center py-2 px-3">Notes</th>
                            <th className="text-center py-2 px-1 w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expandedData.exercises.map((ex) => (
                            editingExercise === ex.id ? (
                              <tr key={ex.id} className="border-b border-gray-800/50">
                                <td className="py-2 pr-2">
                                  <input type="text" value={editExerciseForm.exercise_name} onChange={(e) => setEditExerciseForm({ ...editExerciseForm, exercise_name: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-700 text-white text-sm" style={inputStyle} />
                                </td>
                                <td className="py-2 px-1">
                                  <input type="number" value={editExerciseForm.sets} onChange={(e) => setEditExerciseForm({ ...editExerciseForm, sets: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-700 text-white text-sm text-center" style={inputStyle} min="1" />
                                </td>
                                <td className="py-2 px-1">
                                  <input type="number" value={editExerciseForm.reps} onChange={(e) => setEditExerciseForm({ ...editExerciseForm, reps: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-700 text-white text-sm text-center" style={inputStyle} min="1" />
                                </td>
                                <td className="py-2 px-1">
                                  <input type="number" value={editExerciseForm.weight_lbs} onChange={(e) => setEditExerciseForm({ ...editExerciseForm, weight_lbs: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-700 text-white text-sm text-center" style={inputStyle} step="0.5" min="0" />
                                </td>
                                <td className="py-2 px-1">
                                  <input type="number" value={editExerciseForm.rpe} onChange={(e) => setEditExerciseForm({ ...editExerciseForm, rpe: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-700 text-white text-sm text-center" style={inputStyle} step="0.5" min="1" max="10" />
                                </td>
                                <td className="py-2 px-1">
                                  <input type="text" value={editExerciseForm.notes} onChange={(e) => setEditExerciseForm({ ...editExerciseForm, notes: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-700 text-white text-sm" style={inputStyle} />
                                </td>
                                <td className="py-2 px-1 text-center">
                                  <div className="flex items-center gap-1 justify-center">
                                    <button onClick={() => handleUpdateExercise(expandedData.id)} className="text-green-400 hover:text-green-300 text-xs font-bold">Save</button>
                                    <button onClick={() => setEditingExercise(null)} className="text-gray-400 hover:text-white text-xs">Cancel</button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr key={ex.id} className="border-b border-gray-800/50 group">
                                <td className="py-2 pr-4 text-white font-medium">{ex.exercise_name}</td>
                                <td className="py-2 px-3 text-center text-gray-300">{ex.sets ?? '–'}</td>
                                <td className="py-2 px-3 text-center text-gray-300">{ex.reps ?? '–'}</td>
                                <td className="py-2 px-3 text-center text-gray-300">{ex.weight_lbs ? `${ex.weight_lbs} lbs` : '–'}</td>
                                <td className="py-2 px-3 text-center text-gray-300">{ex.rpe ?? '–'}</td>
                                <td className="py-2 px-3 text-center text-gray-400 text-xs">{ex.notes || '–'}</td>
                                <td className="py-2 px-1 text-center">
                                  <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditExercise(ex)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                                    <button onClick={() => handleDeleteExercise(expandedData.id, ex.id)} className="text-red-400 hover:text-red-300 text-xs">Del</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add exercise inline */}
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <form onSubmit={handleAddExerciseToExpanded} className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase">Add Exercise</h4>
                      {exerciseError && (
                        <div className="px-3 py-1.5 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-xs">{exerciseError}</div>
                      )}
                      <ExerciseFormFields form={exerciseForm} setForm={setExerciseForm} compact />
                      <button
                        type="submit"
                        disabled={exerciseLoading}
                        className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50 hover:opacity-90"
                        style={{ backgroundColor: '#2563eb' }}
                      >
                        {exerciseLoading ? 'Adding...' : '+ Add Exercise'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Log Workout Modal */}
      {showModal && (
        <Modal
          title={showTemplates ? 'Workout Templates' : activeSession ? `Add Exercises — ${activeSession.session_name || 'Session'}` : templateExercises ? `Create from Template — ${sessionForm.session_name}` : 'Log New Workout'}
          onClose={closeModal}
        >
          {showTemplates ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">Choose a template to quickly start a workout with pre-filled exercises.</p>
              {workoutTemplates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectTemplate(t)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors"
                  style={{ backgroundColor: '#16213e' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-sm">{t.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{t.exercises.length} exercises · {t.duration_minutes} min</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  <div className="text-gray-400 text-xs mt-1">{t.notes}</div>
                </button>
              ))}
              <div className="pt-2 border-t border-gray-800">
                <button
                  onClick={() => setShowTemplates(false)}
                  className="w-full py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white text-sm"
                >
                  Create Custom Workout Instead
                </button>
              </div>
            </div>
          ) : !activeSession ? (
            <form onSubmit={handleCreateSession} className="space-y-4">
              {sessionError && (
                <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{sessionError}</div>
              )}
              {templateExercises && (
                <div className="px-4 py-3 rounded-lg border border-blue-800 bg-blue-900/20">
                  <div className="text-blue-400 text-sm font-semibold mb-1">Template: {sessionForm.session_name}</div>
                  <div className="text-blue-300 text-xs">{templateExercises.length} exercises will be added automatically. You can edit the details below before creating.</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Session Name</label>
                <input
                  type="text"
                  value={sessionForm.session_name}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
                  placeholder="e.g. Push Day, Leg Day"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  value={sessionForm.session_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                  required
                  className={inputClass}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>
              <div>
                <Tooltip text={fieldTooltips.duration}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
                </Tooltip>
                <input
                  type="number"
                  value={sessionForm.duration_minutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: e.target.value })}
                  placeholder="60"
                  min="1"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  placeholder="How did the session go?"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                />
              </div>
              {templateExercises && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Exercises to Add</h3>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {templateExercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#16213e' }}>
                        <span className="text-white font-medium">{ex.exercise_name}</span>
                        <span className="text-gray-500">
                          {[ex.sets && `${ex.sets}×`, ex.reps, ex.weight_lbs && `${ex.weight_lbs} lbs`, ex.rpe && `RPE ${ex.rpe}`].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white">Cancel</button>
                <button
                  type="submit"
                  disabled={sessionLoading}
                  className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {sessionLoading ? 'Creating...' : templateExercises ? 'Create from Template' : 'Create Session'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {activeSession.exercises.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Exercises Added</h3>
                  <div className="space-y-2">
                    {activeSession.exercises.map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between px-4 py-2 rounded-lg" style={{ backgroundColor: '#16213e' }}>
                        <div>
                          <span className="text-white font-medium text-sm">{ex.exercise_name}</span>
                          <span className="text-gray-500 text-xs ml-2">
                            {[
                              ex.sets && `${ex.sets}×`,
                              ex.reps && `${ex.reps}`,
                              ex.weight_lbs && `@ ${ex.weight_lbs} lbs`,
                              ex.rpe && `RPE ${ex.rpe}`,
                            ].filter(Boolean).join(' ')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteExercise(activeSession.id, ex.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleAddExercise} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase">Add Exercise</h3>
                {exerciseError && (
                  <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{exerciseError}</div>
                )}
                <ExerciseFormFields form={exerciseForm} setForm={setExerciseForm} />
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={exerciseLoading}
                    className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50 hover:opacity-90"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    {exerciseLoading ? 'Adding...' : '+ Add Exercise'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-lg border border-green-700 text-green-400 hover:bg-green-900/20 font-semibold"
                  >
                    Done
                  </button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
