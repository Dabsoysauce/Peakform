'use client';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { apiFetch } from '../../lib/api';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-md rounded-2xl border border-gray-700 p-6"
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

const METRICS = [
  { value: 'bench_press_max',      label: 'Bench Press Max (lbs)' },
  { value: 'squat_max',            label: 'Squat Max (lbs)' },
  { value: 'deadlift_max',         label: 'Deadlift Max (lbs)' },
  { value: 'total_weekly_sessions', label: 'Weekly Sessions' },
  { value: 'bodyweight',           label: 'Bodyweight (lbs)' },
];

const emptyGoalForm   = { title: '', metric: 'bench_press_max', target_value: '', comparison: 'gte', deadline: '' };
const emptyWorkoutForm = { session_name: '', session_date: new Date().toISOString().slice(0, 10), notes: '', exercises: [] };

export default function TrainerTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', coach_only: false });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Assign modal state
  const [assignTarget, setAssignTarget] = useState(null); // member object
  const [assignTab, setAssignTab] = useState('goal');
  const [goalForm, setGoalForm] = useState(emptyGoalForm);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    loadTeams();

    const token = localStorage.getItem('token');
    socketRef.current = io(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socketRef.current.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadTeams() {
    setLoading(true);
    try {
      const res = await apiFetch('/teams');
      if (res.ok) setTeams(await res.json());
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await apiFetch('/teams', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create team');
        return;
      }
      setTeams((prev) => [{ ...data, member_count: 0 }, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', coach_only: false });
    } catch {
      setCreateError('Network error');
    }
    setCreateLoading(false);
  }

  async function selectTeam(team) {
    setSelectedTeam(team);
    setMessages([]);
    setMembers([]);
    setMsgLoading(true);

    socketRef.current?.emit('join_team', { teamId: team.id });

    const [msgRes, memRes] = await Promise.all([
      apiFetch(`/messages/${team.id}`),
      apiFetch(`/teams/${team.id}/members`),
    ]);
    if (msgRes.ok) setMessages(await msgRes.json());
    if (memRes.ok) setMembers(await memRes.json());
    setMsgLoading(false);
  }

  function openAssign(member) {
    setAssignTarget(member);
    setAssignTab('goal');
    setGoalForm(emptyGoalForm);
    setWorkoutForm({ ...emptyWorkoutForm, session_date: new Date().toISOString().slice(0, 10) });
    setAssignMsg('');
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssignLoading(true);
    setAssignMsg('');
    try {
      let res;
      if (assignTab === 'goal') {
        res = await apiFetch(`/goals/assign/${assignTarget.id}`, {
          method: 'POST',
          body: JSON.stringify(goalForm),
        });
      } else {
        res = await apiFetch(`/workouts/assign/${assignTarget.id}`, {
          method: 'POST',
          body: JSON.stringify(workoutForm),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setAssignMsg(`✓ ${assignTab === 'goal' ? 'Goal' : 'Workout'} assigned to ${assignTarget.first_name || assignTarget.email}!`);
      } else {
        setAssignMsg(data.error || 'Failed to assign');
      }
    } catch {
      setAssignMsg('Network error');
    }
    setAssignLoading(false);
  }

  function addExercise() {
    setWorkoutForm((f) => ({
      ...f,
      exercises: [...f.exercises, { exercise_name: '', sets: '', reps: '', weight_lbs: '' }],
    }));
  }

  function updateExercise(i, field, value) {
    setWorkoutForm((f) => {
      const exercises = [...f.exercises];
      exercises[i] = { ...exercises[i], [field]: value };
      return { ...f, exercises };
    });
  }

  function removeExercise(i) {
    setWorkoutForm((f) => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }));
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !selectedTeam) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    try {
      const res = await apiFetch(`/messages/${selectedTeam.id}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        socketRef.current?.emit('send_message', { teamId: selectedTeam.id, message: msg });
      }
    } catch {}
    setSending(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">My Teams</h1>
          <p className="text-gray-400 mt-1">Create and manage your player groups</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90"
          style={{ backgroundColor: '#2563eb' }}
        >
          + Create Team
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div
          className="rounded-xl p-12 border border-gray-800 text-center"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-white mb-2">No teams yet</h3>
          <p className="text-gray-400 mb-6">Create your first training group to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90"
            style={{ backgroundColor: '#2563eb' }}
          >
            Create First Team
          </button>
        </div>
      ) : (
        <div className="flex gap-6" style={{ height: '640px' }}>
          {/* Teams list */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
            {teams.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border p-5 cursor-pointer transition-all hover:border-blue-600 ${
                  selectedTeam?.id === t.id ? 'border-blue-600' : 'border-gray-800'
                }`}
                style={{
                  backgroundColor: selectedTeam?.id === t.id ? 'rgba(232,93,38,0.1)' : '#1e1e30',
                }}
                onClick={() => selectTeam(t)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm">{t.name}</h3>
                  {t.coach_only && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                    >
                      Broadcast
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  {t.member_count} player{t.member_count !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Join key:</span>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded border tracking-wider"
                    style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: 'rgba(232,93,38,0.1)' }}
                  >
                    {t.join_key}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat + members panel */}
          {!selectedTeam ? (
            <div
              className="flex-1 rounded-xl border border-gray-800 flex items-center justify-center text-gray-500"
              style={{ backgroundColor: '#1e1e30' }}
            >
              Select a team to view chat and members
            </div>
          ) : (
            <div className="flex-1 flex gap-4 min-w-0">
              {/* Chat */}
              <div
                className="flex-1 rounded-xl border border-gray-800 flex flex-col overflow-hidden"
                style={{ backgroundColor: '#1e1e30' }}
              >
                <div className="px-5 py-4 border-b border-gray-800">
                  <h3 className="font-bold text-white">{selectedTeam.name}</h3>
                  <div className="text-xs text-gray-500">
                    {selectedTeam.coach_only ? 'Broadcast mode — only you can post' : 'Two-way chat'}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgLoading ? (
                    <div className="text-gray-500 text-center text-sm">Loading...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-gray-500 text-center text-sm">No messages yet. Kick things off!</div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            {!isOwn && (
                              <span className="text-xs text-gray-500 mb-1 ml-1">{msg.sender_name}</span>
                            )}
                            <div
                              className="px-4 py-2.5 rounded-2xl text-sm break-words"
                              style={isOwn
                                ? { backgroundColor: '#2563eb', color: 'white', borderBottomRightRadius: '4px' }
                                : { backgroundColor: '#16213e', color: '#e5e7eb', borderBottomLeftRadius: '4px' }
                              }
                            >
                              {msg.content}
                            </div>
                            <span className="text-xs text-gray-600 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedTeam.coach_only ? 'Broadcast to your athletes...' : 'Type a message...'}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    style={{ backgroundColor: '#16213e' }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="px-5 py-2.5 rounded-xl font-bold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* Members */}
              <div
                className="w-52 flex-shrink-0 rounded-xl border border-gray-800 overflow-hidden flex flex-col"
                style={{ backgroundColor: '#1e1e30' }}
              >
                <div className="px-4 py-3 border-b border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Members ({members.length})</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {members.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center pt-4">No players yet</div>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 group">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#2563eb' }}
                        >
                          {(m.first_name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-white truncate">
                            {m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : m.email}
                          </div>
                          {m.primary_goal && (
                            <div className="text-xs text-gray-600 truncate">{m.primary_goal}</div>
                          )}
                        </div>
                        <button
                          onClick={() => openAssign(m)}
                          className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded font-semibold transition-all flex-shrink-0"
                          style={{ backgroundColor: 'rgba(37,99,235,0.2)', color: '#60a5fa' }}
                          title="Assign goal or workout"
                        >
                          Assign
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Goal / Workout Modal */}
      {assignTarget && (
        <Modal
          title={`Assign to ${assignTarget.first_name || assignTarget.email}`}
          onClose={() => setAssignTarget(null)}
        >
          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ backgroundColor: '#12122a' }}>
            {['goal', 'workout'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setAssignTab(tab); setAssignMsg(''); }}
                className="flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all"
                style={assignTab === tab
                  ? { backgroundColor: '#2563eb', color: 'white' }
                  : { color: '#6b7280' }}
              >
                {tab === 'goal' ? 'Goal' : 'Workout'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAssign} className="space-y-3">
            {assignTab === 'goal' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Goal Title *</label>
                  <input
                    required
                    type="text"
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    placeholder="e.g. Hit 225 bench press"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    style={{ backgroundColor: '#12122a' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Metric *</label>
                    <select
                      value={goalForm.metric}
                      onChange={(e) => setGoalForm({ ...goalForm, metric: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                      style={{ backgroundColor: '#12122a' }}
                    >
                      {METRICS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Comparison *</label>
                    <select
                      value={goalForm.comparison}
                      onChange={(e) => setGoalForm({ ...goalForm, comparison: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                      style={{ backgroundColor: '#12122a' }}
                    >
                      <option value="gte">≥ At least</option>
                      <option value="lte">≤ At most</option>
                      <option value="eq">= Exactly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Target Value *</label>
                    <input
                      required
                      type="number"
                      value={goalForm.target_value}
                      onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
                      placeholder="225"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      style={{ backgroundColor: '#12122a' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={goalForm.deadline}
                      onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                      style={{ backgroundColor: '#12122a' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Workout Name *</label>
                    <input
                      required
                      type="text"
                      value={workoutForm.session_name}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, session_name: e.target.value })}
                      placeholder="e.g. Upper Body A"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      style={{ backgroundColor: '#12122a' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Date *</label>
                    <input
                      required
                      type="date"
                      value={workoutForm.session_date}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, session_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                      style={{ backgroundColor: '#12122a' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Instructions / Notes</label>
                  <textarea
                    rows={2}
                    value={workoutForm.notes}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                    placeholder="Any coaching notes for this session..."
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                    style={{ backgroundColor: '#12122a' }}
                  />
                </div>

                {/* Exercises */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-400">Exercises</label>
                    <button
                      type="button"
                      onClick={addExercise}
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}
                    >
                      + Add
                    </button>
                  </div>
                  {workoutForm.exercises.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No exercises added — player will fill in their own.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {workoutForm.exercises.map((ex, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={ex.exercise_name}
                            onChange={(e) => updateExercise(i, 'exercise_name', e.target.value)}
                            placeholder="Exercise"
                            className="flex-1 px-2 py-1.5 rounded border border-gray-700 text-white text-xs placeholder-gray-600 focus:outline-none"
                            style={{ backgroundColor: '#12122a' }}
                          />
                          <input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                            placeholder="Sets"
                            className="w-14 px-2 py-1.5 rounded border border-gray-700 text-white text-xs focus:outline-none"
                            style={{ backgroundColor: '#12122a' }}
                          />
                          <input
                            type="number"
                            value={ex.reps}
                            onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                            placeholder="Reps"
                            className="w-14 px-2 py-1.5 rounded border border-gray-700 text-white text-xs focus:outline-none"
                            style={{ backgroundColor: '#12122a' }}
                          />
                          <input
                            type="number"
                            value={ex.weight_lbs}
                            onChange={(e) => updateExercise(i, 'weight_lbs', e.target.value)}
                            placeholder="lbs"
                            className="w-14 px-2 py-1.5 rounded border border-gray-700 text-white text-xs focus:outline-none"
                            style={{ backgroundColor: '#12122a' }}
                          />
                          <button
                            type="button"
                            onClick={() => removeExercise(i)}
                            className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {assignMsg && (
              <div
                className={`px-3 py-2 rounded-lg text-sm ${
                  assignMsg.startsWith('✓')
                    ? 'bg-green-900/20 border border-green-800/50 text-green-400'
                    : 'bg-red-900/20 border border-red-800/50 text-red-400'
                }`}
              >
                {assignMsg}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white text-sm"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={assignLoading}
                className="flex-1 py-2.5 rounded-lg font-bold text-sm text-white disabled:opacity-40"
                style={{ backgroundColor: '#2563eb' }}
              >
                {assignLoading ? 'Assigning...' : `Assign ${assignTab === 'goal' ? 'Goal' : 'Workout'}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <Modal title="Create Team" onClose={() => { setShowCreate(false); setCreateError(''); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{createError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Team Name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Morning Powerlifters"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 cursor-pointer"
              style={{ backgroundColor: '#16213e' }}
              onClick={() => setCreateForm({ ...createForm, coach_only: !createForm.coach_only })}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors`}
                style={{
                  borderColor: createForm.coach_only ? '#2563eb' : '#4b5563',
                  backgroundColor: createForm.coach_only ? '#2563eb' : 'transparent',
                }}
              >
                {createForm.coach_only && <span className="text-white text-xs">✓</span>}
              </div>
              <div>
                <div className="text-sm font-medium text-white">Broadcast Only Mode</div>
                <div className="text-xs text-gray-500">Only you can post messages. Players can read.</div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {createLoading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
