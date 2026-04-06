'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { apiFetch } from '../../lib/api';

/* ── Glass Modal ──────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl leading-none transition-colors"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Styles (injected once) ───────────────────────────────────── */
function InjectStyles() {
  return (
    <style jsx global>{`
      :root {
        --primary: #e85d26;
        --primary-rgb: 232, 93, 38;
        --bg: #0f0f1a;
        --card: #1e1e30;
        --surface: #16213e;
        --success: #4ade80;
        --success-rgb: 74, 222, 128;
        --glass-bg: rgba(255,255,255,0.03);
        --glass-border: rgba(255,255,255,0.06);
        --glass-border-hover: rgba(255,255,255,0.12);
      }
      @keyframes modalIn {
        from { opacity: 0; transform: scale(0.95) translateY(12px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb),0.15); }
        50% { box-shadow: 0 0 16px 2px rgba(var(--primary-rgb),0.10); }
      }
      .glass-input {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        color: white;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .glass-input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(var(--primary-rgb),0.15);
      }
      .glass-input::placeholder { color: rgba(255,255,255,0.25); }
      .glass-input-sm {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        color: white;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .glass-input-sm:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(var(--primary-rgb),0.12);
      }
      .glass-input-sm::placeholder { color: rgba(255,255,255,0.2); }
      .gradient-btn {
        background: linear-gradient(135deg, var(--primary), #d14b1a);
        color: white;
        border: none;
        font-weight: 700;
        transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        box-shadow: 0 4px 16px rgba(var(--primary-rgb),0.25);
      }
      .gradient-btn:hover:not(:disabled) {
        opacity: 0.92;
        transform: translateY(-1px);
        box-shadow: 0 6px 24px rgba(var(--primary-rgb),0.35);
      }
      .gradient-btn:active:not(:disabled) { transform: translateY(0); }
      .gradient-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .ghost-btn {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.6);
        font-weight: 500;
        transition: background 0.2s, color 0.2s, border-color 0.2s;
      }
      .ghost-btn:hover {
        background: rgba(255,255,255,0.08);
        color: white;
        border-color: rgba(255,255,255,0.15);
      }
      .section-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255,255,255,0.35);
      }
      .glass-panel {
        background: var(--glass-bg);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--glass-border);
        border-radius: 16px;
      }
      .team-card-active {
        border-color: rgba(var(--primary-rgb),0.5) !important;
        background: rgba(var(--primary-rgb),0.06) !important;
        box-shadow: 0 0 24px rgba(var(--primary-rgb),0.08);
      }
      .msg-own {
        background: linear-gradient(135deg, rgba(var(--primary-rgb),0.85), rgba(var(--primary-rgb),0.65));
        border-bottom-right-radius: 6px;
      }
      .msg-other {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.06);
        border-bottom-left-radius: 6px;
      }
      /* custom scrollbar */
      .teams-scroll::-webkit-scrollbar { width: 4px; }
      .teams-scroll::-webkit-scrollbar-track { background: transparent; }
      .teams-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
      .teams-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
    `}</style>
  );
}

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

  const [assignTarget, setAssignTarget] = useState(null);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  const [mounted, setMounted] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    loadTeams();
    setTimeout(() => setMounted(true), 50);

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
    setWorkoutForm({ ...emptyWorkoutForm, session_date: new Date().toISOString().slice(0, 10) });
    setAssignMsg('');
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssignLoading(true);
    setAssignMsg('');
    try {
      const res = await apiFetch(`/workouts/assign/${assignTarget.id}`, {
        method: 'POST',
        body: JSON.stringify(workoutForm),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignMsg(`Workout assigned to ${assignTarget.first_name || assignTarget.email}!`);
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
      <InjectStyles />

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between mb-8"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div>
          <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>My Teams</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 4, fontSize: 14 }}>Create and manage your player groups</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="gradient-btn px-5 py-2.5 rounded-xl text-sm"
        >
          + Create Team
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '48px 0' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid rgba(var(--primary-rgb),0.2)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Loading teams...
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : teams.length === 0 ? (
        <div
          className="glass-panel text-center"
          style={{
            padding: '60px 24px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, filter: 'grayscale(0.3)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No teams yet</h3>
          <p style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 24, fontSize: 14 }}>Create your first training group to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="gradient-btn px-6 py-3 rounded-xl text-sm"
          >
            Create First Team
          </button>
        </div>
      ) : (
        <div
          className="flex gap-5"
          style={{
            height: '660px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}
        >
          {/* ── Teams List Panel ─────────────────────────────── */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1 teams-scroll">
            <div className="section-label px-1 mb-1">Your Teams</div>
            {teams.map((t, idx) => (
              <div
                key={t.id}
                className={`glass-panel cursor-pointer transition-all ${
                  selectedTeam?.id === t.id ? 'team-card-active' : ''
                }`}
                style={{
                  padding: '16px 18px',
                  borderColor: selectedTeam?.id === t.id ? undefined : 'var(--glass-border)',
                  transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 0.05}s both`,
                }}
                onMouseEnter={(e) => {
                  if (selectedTeam?.id !== t.id) e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
                }}
                onMouseLeave={(e) => {
                  if (selectedTeam?.id !== t.id) e.currentTarget.style.borderColor = 'var(--glass-border)';
                }}
                onClick={() => selectTeam(t)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm" style={{ letterSpacing: '-0.01em' }}>{t.name}</h3>
                  {t.coach_only && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: 'rgba(251,191,36,0.1)',
                        color: '#fbbf24',
                        border: '1px solid rgba(251,191,36,0.15)',
                      }}
                    >
                      Broadcast
                    </span>
                  )}
                </div>
                <div className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t.member_count} player{t.member_count !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Join key:</span>
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg tracking-widest"
                    style={{
                      background: 'rgba(var(--primary-rgb),0.08)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(var(--primary-rgb),0.2)',
                      letterSpacing: '0.12em',
                    }}
                  >
                    {t.join_key}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Chat + Members ───────────────────────────────── */}
          {!selectedTeam ? (
            <div
              className="flex-1 glass-panel flex items-center justify-center"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <div className="text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <div style={{ fontSize: 14 }}>Select a team to view chat and members</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 min-w-0">
              {/* ── Chat Panel ────────────────────────────────── */}
              <div className="flex-1 glass-panel flex flex-col overflow-hidden">
                {/* Chat header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.2), rgba(var(--primary-rgb),0.05))',
                        border: '1px solid rgba(var(--primary-rgb),0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)', fontWeight: 800, fontSize: 14,
                      }}
                    >
                      {selectedTeam.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{selectedTeam.name}</h3>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {selectedTeam.coach_only ? 'Broadcast mode — only you can post' : 'Two-way chat'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 teams-scroll">
                  {msgLoading ? (
                    <div style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontSize: 13, paddingTop: 40 }}>
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontSize: 13, paddingTop: 40 }}>
                      No messages yet. Kick things off!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            {!isOwn && (
                              <span className="text-xs mb-1 ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{msg.sender_name}</span>
                            )}
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm break-words ${isOwn ? 'msg-own' : 'msg-other'}`}
                              style={{ color: isOwn ? 'white' : 'rgba(255,255,255,0.8)' }}
                            >
                              {msg.content}
                            </div>
                            <span className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <form
                  onSubmit={sendMessage}
                  className="flex gap-3"
                  style={{ padding: '14px 16px', borderTop: '1px solid var(--glass-border)' }}
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedTeam.coach_only ? 'Broadcast to your athletes...' : 'Type a message...'}
                    className="glass-input flex-1 px-4 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="gradient-btn px-5 py-2.5 rounded-xl text-sm"
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* ── Members Panel ─────────────────────────────── */}
              <div
                className="w-56 flex-shrink-0 glass-panel overflow-hidden flex flex-col"
              >
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--glass-border)' }}>
                  <h4 className="section-label">Members ({members.length})</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 teams-scroll">
                  {members.length === 0 ? (
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', paddingTop: 24 }}>
                      No players yet
                    </div>
                  ) : (
                    members.map((m, idx) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 group"
                        style={{ animation: `fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) ${idx * 0.04}s both` }}
                      >
                        <Link
                          href={`/trainer/athletes/${m.user_id || m.id}`}
                          className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg px-2 py-1.5 -mx-1 transition-all"
                          style={{ transition: 'background 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.25), rgba(var(--primary-rgb),0.1))',
                              color: 'var(--primary)',
                              border: '1px solid rgba(var(--primary-rgb),0.15)',
                            }}
                          >
                            {(m.first_name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-white truncate">
                              {m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : m.email}
                            </div>
                            {m.primary_goal && (
                              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>{m.primary_goal}</div>
                            )}
                          </div>
                        </Link>
                        <button
                          onClick={() => openAssign(m)}
                          className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-md font-semibold transition-all flex-shrink-0"
                          style={{
                            background: 'rgba(var(--primary-rgb),0.12)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(var(--primary-rgb),0.15)',
                          }}
                          title="Assign workout"
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

      {/* ── Assign Workout Modal ────────────────────────────── */}
      {assignTarget && (
        <Modal
          title={`Assign Workout to ${assignTarget.first_name || assignTarget.email}`}
          onClose={() => setAssignTarget(null)}
        >
          <form onSubmit={handleAssign} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 section-label" style={{ fontSize: 11 }}>Workout Name *</label>
                <input
                  required
                  type="text"
                  value={workoutForm.session_name}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, session_name: e.target.value })}
                  placeholder="e.g. Upper Body A"
                  className="glass-input w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 section-label" style={{ fontSize: 11 }}>Date *</label>
                <input
                  required
                  type="date"
                  value={workoutForm.session_date}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, session_date: e.target.value })}
                  className="glass-input w-full px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 section-label" style={{ fontSize: 11 }}>Instructions / Notes</label>
              <textarea
                rows={2}
                value={workoutForm.notes}
                onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                placeholder="Any coaching notes for this session..."
                className="glass-input w-full px-3 py-2.5 text-sm resize-none"
              />
            </div>

            {/* Exercises */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="section-label" style={{ fontSize: 11 }}>Exercises</label>
                <button
                  type="button"
                  onClick={addExercise}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
                  style={{
                    background: 'rgba(var(--primary-rgb),0.1)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(var(--primary-rgb),0.15)',
                  }}
                >
                  + Add
                </button>
              </div>
              {workoutForm.exercises.length === 0 ? (
                <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)' }}>No exercises added — player will fill in their own.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 teams-scroll">
                  {workoutForm.exercises.map((ex, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={ex.exercise_name}
                        onChange={(e) => updateExercise(i, 'exercise_name', e.target.value)}
                        placeholder="Exercise"
                        className="glass-input-sm flex-1 px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        value={ex.sets}
                        onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                        placeholder="Sets"
                        className="glass-input-sm w-14 px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        value={ex.reps}
                        onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                        placeholder="Reps"
                        className="glass-input-sm w-14 px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        value={ex.weight_lbs}
                        onChange={(e) => updateExercise(i, 'weight_lbs', e.target.value)}
                        placeholder="lbs"
                        className="glass-input-sm w-14 px-2 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(i)}
                        className="flex-shrink-0 transition-colors"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {assignMsg && (
              <div
                className="px-3 py-2 rounded-lg text-sm"
                style={
                  assignMsg.startsWith('Workout assigned')
                    ? { background: 'rgba(var(--success-rgb),0.08)', border: '1px solid rgba(var(--success-rgb),0.15)', color: 'var(--success)' }
                    : { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }
                }
              >
                {assignMsg}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="ghost-btn flex-1 py-2.5 rounded-xl text-sm"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={assignLoading}
                className="gradient-btn flex-1 py-2.5 rounded-xl text-sm"
              >
                {assignLoading ? 'Assigning...' : 'Assign Workout'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Create Team Modal ───────────────────────────────── */}
      {showCreate && (
        <Modal title="Create Team" onClose={() => { setShowCreate(false); setCreateError(''); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}
              >
                {createError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Team Name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Morning Powerlifters"
                required
                className="glass-input w-full px-4 py-2.5 text-sm"
              />
            </div>
            <div
              className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onClick={() => setCreateForm({ ...createForm, coach_only: !createForm.coach_only })}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center transition-all"
                style={{
                  border: `2px solid ${createForm.coach_only ? 'var(--primary)' : 'rgba(255,255,255,0.15)'}`,
                  background: createForm.coach_only ? 'var(--primary)' : 'transparent',
                  boxShadow: createForm.coach_only ? '0 0 12px rgba(var(--primary-rgb),0.3)' : 'none',
                }}
              >
                {createForm.coach_only && <span className="text-white text-xs font-bold">&#10003;</span>}
              </div>
              <div>
                <div className="text-sm font-medium text-white">Broadcast Only Mode</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Only you can post messages. Players can read.</div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="ghost-btn flex-1 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="gradient-btn flex-1 py-2.5 rounded-xl text-sm"
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
