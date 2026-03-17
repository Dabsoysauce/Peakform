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

const defaultSession = { session_date: '', session_name: '', duration_minutes: '', notes: '' };
const defaultExercise = { exercise_name: '', sets: '', reps: '', weight_lbs: '', rpe: '', notes: '' };

export default function WorkoutsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sessionForm, setSessionForm] = useState(defaultSession);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // After creating session, allow adding exercises
  const [activeSession, setActiveSession] = useState(null); // session with exercises
  const [exerciseForm, setExerciseForm] = useState(defaultExercise);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState('');

  const [deleteLoading, setDeleteLoading] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedData, setExpandedData] = useState(null);

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
        return;
      }
      setActiveSession({ ...data, exercises: [] });
      setSessionForm(defaultSession);
      loadSessions();
    } catch {
      setSessionError('Network error');
    }
    setSessionLoading(false);
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
      setActiveSession((prev) => ({
        ...prev,
        exercises: prev.exercises.filter((ex) => ex.id !== exerciseId),
      }));
    } catch {}
  }

  async function handleDeleteSession(id) {
    if (!confirm('Delete this workout session?')) return;
    setDeleteLoading(id);
    try {
      await apiFetch(`/workouts/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
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

  function closeModal() {
    setShowModal(false);
    setActiveSession(null);
    setSessionForm(defaultSession);
    setExerciseForm(defaultExercise);
    setSessionError('');
    setExerciseError('');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Workouts</h1>
          <p className="text-gray-400 mt-1">Log and track your training sessions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#e85d26' }}
        >
          + Log Workout
        </button>
      </div>

      {/* Sessions table */}
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
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90"
            style={{ backgroundColor: '#e85d26' }}
          >
            Log First Workout
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-gray-800 overflow-hidden"
              style={{ backgroundColor: '#1e1e30' }}
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleExpand(s)}
                    className="text-left"
                  >
                    <div className="text-sm font-bold text-white hover:text-orange-400 transition-colors">
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
                    onClick={() => handleDeleteSession(s.id)}
                    disabled={deleteLoading === s.id}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-900 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Expanded exercises */}
              {expandedSession === s.id && expandedData && (
                <div className="border-t border-gray-800 px-5 py-4">
                  {expandedData.notes && (
                    <p className="text-sm text-gray-400 mb-3 italic">{expandedData.notes}</p>
                  )}
                  {expandedData.exercises.length === 0 ? (
                    <p className="text-sm text-gray-500">No exercises logged for this session.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                            <th className="text-left py-2 pr-4">Exercise</th>
                            <th className="text-center py-2 px-3">Sets</th>
                            <th className="text-center py-2 px-3">Reps</th>
                            <th className="text-center py-2 px-3">Weight</th>
                            <th className="text-center py-2 px-3">RPE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expandedData.exercises.map((ex) => (
                            <tr key={ex.id} className="border-b border-gray-800/50">
                              <td className="py-2 pr-4 text-white font-medium">{ex.exercise_name}</td>
                              <td className="py-2 px-3 text-center text-gray-300">{ex.sets ?? '–'}</td>
                              <td className="py-2 px-3 text-center text-gray-300">{ex.reps ?? '–'}</td>
                              <td className="py-2 px-3 text-center text-gray-300">{ex.weight_lbs ? `${ex.weight_lbs} lbs` : '–'}</td>
                              <td className="py-2 px-3 text-center text-gray-300">{ex.rpe ?? '–'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Log Workout Modal */}
      {showModal && (
        <Modal title={activeSession ? `Add Exercises — ${activeSession.session_name || 'Session'}` : 'Log New Workout'} onClose={closeModal}>
          {!activeSession ? (
            <form onSubmit={handleCreateSession} className="space-y-4">
              {sessionError && (
                <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{sessionError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Session Name</label>
                <input
                  type="text"
                  value={sessionForm.session_name}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
                  placeholder="e.g. Push Day, Leg Day"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  style={{ backgroundColor: '#16213e' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  value={sessionForm.session_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-orange-500"
                  style={{ backgroundColor: '#16213e', colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={sessionForm.duration_minutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: e.target.value })}
                  placeholder="60"
                  min="1"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  style={{ backgroundColor: '#16213e' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  placeholder="How did the session go?"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                  style={{ backgroundColor: '#16213e' }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white">Cancel</button>
                <button
                  type="submit"
                  disabled={sessionLoading}
                  className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#e85d26' }}
                >
                  {sessionLoading ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {/* Exercises added so far */}
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

              {/* Add exercise form */}
              <form onSubmit={handleAddExercise} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase">Add Exercise</h3>
                {exerciseError && (
                  <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{exerciseError}</div>
                )}
                <input
                  type="text"
                  value={exerciseForm.exercise_name}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, exercise_name: e.target.value })}
                  placeholder="Exercise name *"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  style={{ backgroundColor: '#16213e' }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={exerciseForm.sets}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })}
                    placeholder="Sets"
                    min="1"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    style={{ backgroundColor: '#16213e' }}
                  />
                  <input
                    type="number"
                    value={exerciseForm.reps}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })}
                    placeholder="Reps"
                    min="1"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    style={{ backgroundColor: '#16213e' }}
                  />
                  <input
                    type="number"
                    value={exerciseForm.weight_lbs}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, weight_lbs: e.target.value })}
                    placeholder="Weight (lbs)"
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    style={{ backgroundColor: '#16213e' }}
                  />
                  <input
                    type="number"
                    value={exerciseForm.rpe}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, rpe: e.target.value })}
                    placeholder="RPE (1–10)"
                    step="0.5"
                    min="1"
                    max="10"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    style={{ backgroundColor: '#16213e' }}
                  />
                </div>
                <input
                  type="text"
                  value={exerciseForm.notes}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  style={{ backgroundColor: '#16213e' }}
                />
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={exerciseLoading}
                    className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50 hover:opacity-90"
                    style={{ backgroundColor: '#e85d26' }}
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
