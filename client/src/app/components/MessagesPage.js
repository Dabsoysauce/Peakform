'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { uploadDMMedia } from '../lib/supabase';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
const EMOJIS = ['❤️', '👍', '😂', '🔥', '😮'];

const METRICS = [
  { value: 'bench_press_max',       label: 'Bench Press Max (lbs)' },
  { value: 'squat_max',             label: 'Squat Max (lbs)' },
  { value: 'deadlift_max',          label: 'Deadlift Max (lbs)' },
  { value: 'total_weekly_sessions', label: 'Weekly Sessions' },
  { value: 'bodyweight',            label: 'Bodyweight (lbs)' },
];
const emptyGoalForm    = { title: '', metric: 'bench_press_max', target_value: '', comparison: 'gte', deadline: '' };
const emptyWorkoutForm = { session_name: '', session_date: new Date().toISOString().slice(0, 10), notes: '', exercises: [] };

/* ============================================================
   GLOBAL STYLES (injected once)
   ============================================================ */
const GLOBAL_STYLE_ID = 'messages-page-glass-styles';

function injectGlobalStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GLOBAL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GLOBAL_STYLE_ID;
  style.textContent = `
    @keyframes msgFadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes msgSlideIn {
      from { opacity: 0; transform: translateX(-16px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes msgSlideInRight {
      from { opacity: 0; transform: translateX(16px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes glassShimmer {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.3); }
      50%      { box-shadow: 0 0 12px 4px rgba(var(--primary-rgb), 0.15); }
    }
    .msg-scrollbar::-webkit-scrollbar { width: 5px; }
    .msg-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .msg-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.08);
      border-radius: 10px;
    }
    .msg-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.14);
    }
    .sidebar-scrollbar::-webkit-scrollbar { width: 4px; }
    .sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .sidebar-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.06);
      border-radius: 10px;
    }
    .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.12);
    }
    .msg-glass-input:focus {
      border-color: rgba(var(--primary-rgb), 0.4) !important;
      box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.08), 0 0 20px rgba(var(--primary-rgb), 0.06) !important;
    }
    .msg-convo-item:hover .msg-convo-avatar {
      box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.3);
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   CSS VARIABLES & GLASS STYLES
   ============================================================ */
const cssVars = {
  '--primary': '#e85d26',
  '--primary-rgb': '232, 93, 38',
  '--primary-light': '#ff7a45',
  '--primary-light-rgb': '255, 122, 69',
  '--accent': '#2563eb',
  '--accent-light': '#3b82f6',
  '--surface': '#16213e',
  '--bg-dark': '#0f0f1a',
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
  background: 'rgba(30, 30, 48, 0.85)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const glassInput = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.06)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const gradientBtn = {
  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
  boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)',
};

const accentBtn = {
  background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.25)',
};

/* ============================================================
   NewMessageModal
   ============================================================ */
function NewMessageModal({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/dm/contacts?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch {}
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          ...glassCardStrong,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(var(--primary-rgb), 0.04)',
          animation: 'glassShimmer 0.25s ease-out',
        }}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-lg leading-none">x</button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto sidebar-scrollbar">
          {loading ? (
            <div className="text-gray-500 text-sm text-center py-6">
              <div className="w-5 h-5 mx-auto mb-2 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-6">
              {query ? 'No results found' : 'Start typing a name...'}
            </div>
          ) : (
            results.map((r, idx) => (
              <button
                key={r.user_id}
                onClick={() => onSelect(r)}
                className="w-full flex items-center gap-3 px-5 py-3.5 transition-all text-left group"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  animation: `msgFadeIn 0.2s ease-out ${idx * 0.04}s both`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white flex-shrink-0 transition-shadow"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', boxShadow: '0 2px 8px rgba(var(--primary-rgb), 0.2)' }}
                >
                  {r.photo_url
                    ? <img src={r.photo_url} alt="" className="w-full h-full object-cover" />
                    : (r.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{r.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{r.role === 'trainer' ? 'Coach' : 'Player'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MediaBubble
   ============================================================ */
function MediaBubble({ url, media_type }) {
  if (media_type === 'video') {
    return (
      <video
        src={url}
        controls
        className="rounded-xl max-w-xs max-h-48 mt-1"
        style={{ display: 'block' }}
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt="attachment"
        className="rounded-xl max-w-xs max-h-48 mt-1 object-cover cursor-pointer hover:opacity-90 transition-opacity"
      />
    </a>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */
function SectionHeader({ children }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] px-5 py-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
      {children}
    </h3>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeName, setActiveName] = useState('');
  const [activeRole, setActiveRole] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [pickerMsg, setPickerMsg] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachPreview, setAttachPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isMyPlayer, setIsMyPlayer] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTab, setAssignTab] = useState('goal');
  const [goalForm, setGoalForm] = useState(emptyGoalForm);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const myRole   = typeof window !== 'undefined' ? localStorage.getItem('role')   : null;

  useEffect(() => {
    injectGlobalStyles();
    // trigger mount animation
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!myUserId) return;
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], auth: { token } });
    socketRef.current = socket;
    socket.emit('join_dm', { userId: myUserId });

    socket.on('new_dm', (msg) => {
      setActiveId((current) => {
        if (current === msg.sender_id) {
          setMessages((prev) => [...prev, { ...msg, reactions: msg.reactions || [] }]);
          apiFetch(`/dm/${msg.sender_id}`).catch(() => {});
        }
        return current;
      });
      loadConversations();
    });

    socket.on('dm_reaction_updated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, reactions } : m)
      );
    });

    return () => socket.disconnect();
  }, [myUserId]);

  async function loadConversations() {
    try {
      const res = await apiFetch('/dm');
      if (res.ok) setConversations(await res.json());
    } catch {}
    setLoadingConvos(false);
  }

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    const withId = searchParams.get('with');
    const withName = searchParams.get('name');
    const withRole = searchParams.get('role');
    if (withId && withId !== activeId) {
      openConversation(withId, withName || withId, withRole);
    }
  }, [searchParams]);

  async function openConversation(partnerId, partnerName, partnerRole) {
    setActiveId(partnerId);
    setActiveName(partnerName);
    setActiveRole(partnerRole || null);
    setIsMyPlayer(false);
    setShowAssign(false);
    setAssignMsg('');
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const [msgRes, playerRes] = await Promise.all([
        apiFetch(`/dm/${partnerId}`),
        myRole === 'trainer' ? apiFetch(`/teams/is-my-player/${partnerId}`) : Promise.resolve(null),
      ]);
      if (msgRes.ok) setMessages(await msgRes.json());
      if (playerRes?.ok) {
        const data = await playerRes.json();
        setIsMyPlayer(data.isPlayer);
      }
    } catch {}
    setLoadingMsgs(false);
    setConversations((prev) =>
      prev.map((c) => c.partner_id === partnerId ? { ...c, unread_count: 0 } : c)
    );
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssignLoading(true);
    setAssignMsg('');
    try {
      let res;
      if (assignTab === 'goal') {
        res = await apiFetch(`/goals/assign/${activeId}`, { method: 'POST', body: JSON.stringify(goalForm) });
      } else {
        res = await apiFetch(`/workouts/assign/${activeId}`, { method: 'POST', body: JSON.stringify(workoutForm) });
      }
      const data = await res.json();
      setAssignMsg(res.ok
        ? `Goal assigned to ${activeName}!`
        : (data.error || 'Failed to assign'));
    } catch {
      setAssignMsg('Network error');
    }
    setAssignLoading(false);
  }

  function addExercise() {
    setWorkoutForm((f) => ({ ...f, exercises: [...f.exercises, { exercise_name: '', sets: '', reps: '', weight_lbs: '' }] }));
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
  function openAssignModal() {
    setGoalForm(emptyGoalForm);
    setWorkoutForm({ ...emptyWorkoutForm, session_date: new Date().toISOString().slice(0, 10) });
    setAssignTab('goal');
    setAssignMsg('');
    setShowAssign(true);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleFileSelect(file) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('File must be under 50MB'); return; }
    setAttachedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setAttachPreview({ type: 'image', src: e.target.result });
      reader.readAsDataURL(file);
    } else {
      setAttachPreview({ type: 'video', name: file.name });
    }
  }

  function clearAttachment() {
    setAttachedFile(null);
    setAttachPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend(e) {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || !activeId) return;
    setSending(true);

    try {
      let media_url = null;
      let media_type = null;

      if (attachedFile) {
        setUploading(true);
        const result = await uploadDMMedia(attachedFile, myUserId);
        media_url = result.url;
        media_type = result.media_type;
        setUploading(false);
        clearAttachment();
      }

      const content = input.trim();
      setInput('');

      const res = await apiFetch(`/dm/${activeId}`, {
        method: 'POST',
        body: JSON.stringify({ content, media_url, media_type }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        socketRef.current?.emit('send_dm', { recipientId: activeId, message: msg });
        loadConversations();
      }
    } catch {
      setUploading(false);
    }
    setSending(false);
  }

  async function reactToMessage(messageId, emoji) {
    if (!activeId) return;
    try {
      const res = await apiFetch(`/dm/${activeId}/react/${messageId}`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, reactions: data.reactions } : m)
        );
        socketRef.current?.emit('dm_reaction_updated', {
          recipientId: activeId,
          messageId,
          reactions: data.reactions,
        });
      }
    } catch {}
    setPickerMsg(null);
  }

  function handleContactSelect(contact) {
    setShowNewMsg(false);
    openConversation(contact.user_id, contact.name, contact.role);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  const isBusy = sending || uploading;

  return (
    <div
      style={{
        ...cssVars,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
      }}
    >
      {/* New Message Modal */}
      {showNewMsg && (
        <NewMessageModal
          onClose={() => setShowNewMsg(false)}
          onSelect={handleContactSelect}
        />
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ ...glassCardStrong, boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(var(--primary-rgb), 0.04)', animation: 'glassShimmer 0.25s ease-out' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Assign to {activeName}</h2>
              <button onClick={() => setShowAssign(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xl leading-none">x</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {['goal', 'workout'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setAssignTab(tab); setAssignMsg(''); }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
                  style={assignTab === tab
                    ? { ...gradientBtn, color: 'white' }
                    : { color: 'var(--text-muted)', background: 'transparent' }
                  }
                >
                  {tab === 'goal' ? 'Goal' : 'Workout'}
                </button>
              ))}
            </div>

            <form onSubmit={handleAssign} className="space-y-3">
              {assignTab === 'goal' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Goal Title *</label>
                    <input required type="text" value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                      placeholder="e.g. Hit 225 bench press"
                      className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none transition-all"
                      style={glassInput}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Metric *</label>
                      <select value={goalForm.metric} onChange={(e) => setGoalForm({ ...goalForm, metric: e.target.value })}
                        className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all"
                        style={glassInput}
                      >
                        {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Comparison *</label>
                      <select value={goalForm.comparison} onChange={(e) => setGoalForm({ ...goalForm, comparison: e.target.value })}
                        className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all"
                        style={glassInput}
                      >
                        <option value="gte">At least</option>
                        <option value="lte">At most</option>
                        <option value="eq">Exactly</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Target Value *</label>
                      <input required type="number" value={goalForm.target_value}
                        onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
                        placeholder="225"
                        className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none transition-all"
                        style={glassInput}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Deadline</label>
                      <input type="date" value={goalForm.deadline}
                        onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                        className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all"
                        style={glassInput}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Workout Name *</label>
                      <input required type="text" value={workoutForm.session_name}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, session_name: e.target.value })}
                        placeholder="e.g. Upper Body A"
                        className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none transition-all"
                        style={glassInput}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Date *</label>
                      <input required type="date" value={workoutForm.session_date}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, session_date: e.target.value })}
                        className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all"
                        style={glassInput}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Instructions / Notes</label>
                    <textarea rows={2} value={workoutForm.notes}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                      placeholder="Any coaching notes..."
                      className="msg-glass-input w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none resize-none transition-all"
                      style={glassInput}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Exercises</label>
                      <button type="button" onClick={addExercise}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-90"
                        style={{ background: 'rgba(var(--primary-rgb), 0.12)', color: 'var(--primary-light)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}
                      >+ Add</button>
                    </div>
                    {workoutForm.exercises.length === 0 ? (
                      <p className="text-xs text-gray-600 italic">No exercises -- player fills in their own.</p>
                    ) : (
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1 sidebar-scrollbar">
                        {workoutForm.exercises.map((ex, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input type="text" value={ex.exercise_name}
                              onChange={(e) => updateExercise(i, 'exercise_name', e.target.value)}
                              placeholder="Exercise" className="msg-glass-input flex-1 px-2 py-1.5 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none transition-all" style={glassInput} />
                            <input type="number" value={ex.sets} onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                              placeholder="Sets" className="msg-glass-input w-14 px-2 py-1.5 rounded-lg text-white text-xs focus:outline-none transition-all" style={glassInput} />
                            <input type="number" value={ex.reps} onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                              placeholder="Reps" className="msg-glass-input w-14 px-2 py-1.5 rounded-lg text-white text-xs focus:outline-none transition-all" style={glassInput} />
                            <input type="number" value={ex.weight_lbs} onChange={(e) => updateExercise(i, 'weight_lbs', e.target.value)}
                              placeholder="lbs" className="msg-glass-input w-14 px-2 py-1.5 rounded-lg text-white text-xs focus:outline-none transition-all" style={glassInput} />
                            <button type="button" onClick={() => removeExercise(i)} className="text-gray-600 hover:text-red-400 transition-colors">x</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {assignMsg && (
                <div className={`px-3 py-2 rounded-xl text-sm ${assignMsg.startsWith('Goal assigned') || assignMsg.startsWith('Workout assigned')
                  ? 'text-green-400' : 'text-red-400'}`}
                  style={{ background: assignMsg.startsWith('Goal assigned') || assignMsg.startsWith('Workout assigned') ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: '1px solid ' + (assignMsg.startsWith('Goal assigned') || assignMsg.startsWith('Workout assigned') ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)') }}
                >
                  {assignMsg}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAssign(false)}
                  className="flex-1 py-2.5 rounded-xl text-gray-300 hover:text-white text-sm transition-all"
                  style={{ ...glassInput }}>
                  Close
                </button>
                <button type="submit" disabled={assignLoading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 hover:opacity-90 transition-all"
                  style={gradientBtn}>
                  {assignLoading ? 'Assigning...' : `Assign ${assignTab === 'goal' ? 'Goal' : 'Workout'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MAIN LAYOUT ========== */}
      <div
        className="flex h-[calc(100vh-120px)] gap-0 rounded-2xl overflow-hidden"
        style={{
          ...glassCard,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 80px rgba(var(--primary-rgb), 0.02)',
        }}
      >
        {/* ======== SIDEBAR ======== */}
        <div
          className="w-72 flex-shrink-0 flex flex-col"
          style={{
            borderRight: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {/* Sidebar header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h1 className="text-lg font-black text-white tracking-tight">Messages</h1>
            <button
              onClick={() => setShowNewMsg(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-all text-lg font-bold hover:scale-105"
              style={gradientBtn}
              title="New message"
            >
              +
            </button>
          </div>

          {/* Conversations header */}
          <SectionHeader>Conversations</SectionHeader>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto sidebar-scrollbar">
            {loadingConvos ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8 px-4">
                No conversations yet.
                <br />
                <button onClick={() => setShowNewMsg(true)} className="mt-2 text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--primary-light)' }}>
                  Start one
                </button>
              </div>
            ) : (
              conversations.map((c, idx) => {
                const isActive = activeId === c.partner_id;
                return (
                  <button
                    key={c.partner_id}
                    onClick={() => openConversation(c.partner_id, c.partner_name, c.partner_role)}
                    className="msg-convo-item w-full text-left px-4 py-3.5 transition-all group"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isActive
                        ? 'rgba(var(--primary-rgb), 0.08)'
                        : 'transparent',
                      borderLeft: isActive
                        ? '3px solid var(--primary)'
                        : '3px solid transparent',
                      animation: `msgSlideIn 0.3s ease-out ${idx * 0.04}s both`,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent'; }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="msg-convo-avatar w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white flex-shrink-0 transition-shadow"
                        style={{
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          boxShadow: isActive ? '0 0 0 2px rgba(var(--primary-rgb), 0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                      >
                        {c.partner_photo
                          ? <img src={c.partner_photo} alt="" className="w-full h-full object-cover" />
                          : (c.partner_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white truncate">{c.partner_name}</span>
                          {c.unread_count > 0 && (
                            <span
                              className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold text-white flex-shrink-0"
                              style={{ ...gradientBtn, animation: 'pulseGlow 2s ease-in-out infinite' }}
                            >
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {c.last_content || (c.last_media_url ? 'Attachment' : '')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ======== CHAT PANEL ======== */}
        {activeId ? (
          <div className="flex-1 flex flex-col" style={{ background: 'rgba(15, 15, 26, 0.3)' }}>
            {/* Chat header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <button
                onClick={() => {
                  const dest = activeRole === 'trainer' ? `/coach/${activeId}` : `/player/${activeId}`;
                  router.push(dest);
                }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-shadow"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    boxShadow: '0 2px 10px rgba(var(--primary-rgb), 0.25)',
                  }}
                >
                  {activeName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-white hover:underline block">{activeName}</span>
                  <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Direct Message</span>
                </div>
              </button>
              {myRole === 'trainer' && isMyPlayer && (
                <button
                  onClick={openAssignModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: 'rgba(var(--primary-rgb), 0.1)',
                    color: 'var(--primary-light)',
                    border: '1px solid rgba(var(--primary-rgb), 0.2)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                  Assign
                </button>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 msg-scrollbar">
              {loadingMsgs ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                  <span className="text-gray-500 text-sm">Loading...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8" style={{ animation: 'msgFadeIn 0.4s ease-out' }}>
                  <div
                    className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'rgba(var(--primary-rgb), 0.08)',
                      border: '1px solid rgba(var(--primary-rgb), 0.15)',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  </div>
                  <p className="text-gray-500 text-sm">No messages yet -- say hi!</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMine = m.sender_id === myUserId;
                  const reactions = m.reactions || [];
                  const showDots = hoveredMsg === m.id || pickerMsg === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                      style={{
                        animation: `${isMine ? 'msgSlideInRight' : 'msgSlideIn'} 0.25s ease-out ${Math.min(idx * 0.03, 0.3)}s both`,
                      }}
                      onMouseEnter={() => setHoveredMsg(m.id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {/* Dots -- left of bubble for own messages */}
                      {isMine && (
                        <div className="relative flex-shrink-0 mb-5">
                          <button
                            onClick={() => setPickerMsg(pickerMsg === m.id ? null : m.id)}
                            className="text-gray-600 hover:text-gray-400 transition-all text-lg leading-none"
                            style={{ opacity: showDots ? 1 : 0, pointerEvents: showDots ? 'auto' : 'none', transform: showDots ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.15s ease-out' }}
                          >
                            ...
                          </button>
                          {pickerMsg === m.id && (
                            <div
                              className="absolute bottom-8 right-0 flex gap-1.5 px-3 py-2 rounded-2xl z-20"
                              style={{
                                background: 'rgba(30, 30, 48, 0.9)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4), 0 0 20px rgba(var(--primary-rgb), 0.05)',
                                animation: 'glassShimmer 0.15s ease-out',
                              }}
                            >
                              {EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => reactToMessage(m.id, emoji)}
                                  className="text-lg hover:scale-125 transition-transform leading-none"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="max-w-xs lg:max-w-md">
                        {!isMine && <p className="text-xs mb-1 ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.sender_name}</p>}
                        {m.media_url && <MediaBubble url={m.media_url} media_type={m.media_type} />}
                        <div className="relative">
                          {m.content && (
                            <div
                              className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all"
                              style={isMine ? {
                                background: 'linear-gradient(135deg, var(--primary), rgba(var(--primary-light-rgb), 0.9))',
                                color: 'white',
                                borderBottomRightRadius: 4,
                                marginTop: m.media_url ? 4 : 0,
                                boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.25)',
                              } : {
                                background: 'rgba(255,255,255,0.04)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                color: '#e5e7eb',
                                borderBottomLeftRadius: 4,
                                marginTop: m.media_url ? 4 : 0,
                              }}
                            >
                              {m.content}
                            </div>
                          )}
                          {reactions.length > 0 && (
                            <div className={`absolute -bottom-3 ${isMine ? 'right-2' : 'left-2'} flex gap-1`}>
                              {reactions.map((r) => {
                                const reacted = r.user_ids?.includes(myUserId);
                                return (
                                  <button
                                    key={r.emoji}
                                    onClick={() => reactToMessage(m.id, r.emoji)}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs shadow-md transition-all hover:scale-110"
                                    style={reacted
                                      ? {
                                          background: 'rgba(var(--primary-rgb), 0.2)',
                                          border: '1px solid var(--primary)',
                                          color: 'white',
                                          backdropFilter: 'blur(8px)',
                                        }
                                      : {
                                          background: 'rgba(30, 30, 48, 0.85)',
                                          backdropFilter: 'blur(16px)',
                                          WebkitBackdropFilter: 'blur(16px)',
                                          border: '1px solid rgba(255,255,255,0.08)',
                                          color: '#d1d5db',
                                        }
                                    }
                                  >
                                    {r.emoji}{r.count > 1 && <span className="ml-0.5">{r.count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <p className={`text-xs mt-4 ${isMine ? 'text-right mr-1' : 'ml-1'}`} style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>

                      {/* Dots -- right of bubble for others' messages */}
                      {!isMine && (
                        <div className="relative flex-shrink-0 mb-5">
                          <button
                            onClick={() => setPickerMsg(pickerMsg === m.id ? null : m.id)}
                            className="text-gray-600 hover:text-gray-400 transition-all text-lg leading-none"
                            style={{ opacity: showDots ? 1 : 0, pointerEvents: showDots ? 'auto' : 'none', transform: showDots ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.15s ease-out' }}
                          >
                            ...
                          </button>
                          {pickerMsg === m.id && (
                            <div
                              className="absolute bottom-8 left-0 flex gap-1.5 px-3 py-2 rounded-2xl z-20"
                              style={{
                                background: 'rgba(30, 30, 48, 0.9)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4), 0 0 20px rgba(var(--primary-rgb), 0.05)',
                                animation: 'glassShimmer 0.15s ease-out',
                              }}
                            >
                              {EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => reactToMessage(m.id, emoji)}
                                  className="text-lg hover:scale-125 transition-transform leading-none"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Attachment preview */}
            {attachPreview && (
              <div className="px-6 pt-3 flex items-center gap-3">
                <div className="relative inline-block">
                  {attachPreview.type === 'image' ? (
                    <img src={attachPreview.src} alt="preview" className="h-20 rounded-xl object-cover" style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
                  ) : (
                    <div className="h-20 px-4 rounded-xl flex items-center gap-2 text-sm text-gray-300" style={glassInput}>
                      {attachPreview.name}
                    </div>
                  )}
                  <button
                    onClick={clearAttachment}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center hover:opacity-80 transition-opacity"
                    style={{ background: 'rgba(239, 68, 68, 0.8)' }}
                  >
                    x
                  </button>
                </div>
              </div>
            )}

            {/* Input bar */}
            <form
              onSubmit={handleSend}
              className="px-6 py-4 flex items-center gap-3"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                title="Attach image or video"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={uploading ? 'Uploading...' : 'Type a message...'}
                disabled={uploading}
                className="msg-glass-input flex-1 px-4 py-2.5 rounded-xl text-white placeholder-gray-500 focus:outline-none text-sm disabled:opacity-50 transition-all"
                style={glassInput}
              />
              <button
                type="submit"
                disabled={isBusy || (!input.trim() && !attachedFile)}
                className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-30 hover:opacity-90 transition-all text-sm flex-shrink-0 hover:scale-[1.02]"
                style={gradientBtn}
              >
                {uploading ? '...' : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          /* ======== EMPTY STATE ======== */
          <div className="flex-1 flex items-center justify-center" style={{ background: 'rgba(15, 15, 26, 0.3)' }}>
            <div className="text-center" style={{ animation: 'msgFadeIn 0.5s ease-out' }}>
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(var(--primary-rgb), 0.08)',
                  border: '1px solid rgba(var(--primary-rgb), 0.15)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Your Messages</h3>
              <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>Select a conversation or start a new one.</p>
              <button
                onClick={() => setShowNewMsg(true)}
                className="px-6 py-2.5 rounded-xl font-bold text-white hover:opacity-90 text-sm transition-all hover:scale-[1.02]"
                style={gradientBtn}
              >
                + New Message
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
