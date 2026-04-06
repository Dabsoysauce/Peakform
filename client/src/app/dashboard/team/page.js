'use client';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { apiFetch } from '../../lib/api';

const EMOJIS = ['❤️', '👍', '😂', '🔥', '😮'];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function TeamPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [pickerMsg, setPickerMsg] = useState(null);
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
      setMessages((prev) => [...prev, { ...msg, reactions: msg.reactions || [] }]);
    });

    socketRef.current.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, reactions } : m)
      );
    });

    return () => {
      socketRef.current?.disconnect();
    };
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

  async function selectTeam(team) {
    setSelectedTeam(team);
    setMessages([]);
    setMsgLoading(true);

    // Join socket room
    socketRef.current?.emit('join_team', { teamId: team.id });

    // Load message history
    try {
      const res = await apiFetch(`/messages/${team.id}`);
      if (res.ok) setMessages(await res.json());
    } catch {}
    setMsgLoading(false);
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
        // Socket will broadcast; but also add locally in case socket lags
        socketRef.current?.emit('send_message', { teamId: selectedTeam.id, message: msg });
      }
    } catch {}
    setSending(false);
  }

  async function reactToMessage(messageId, emoji) {
    if (!selectedTeam) return;
    try {
      const res = await apiFetch(`/messages/${selectedTeam.id}/react/${messageId}`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, reactions: data.reactions } : m)
        );
        socketRef.current?.emit('reaction_updated', {
          teamId: selectedTeam.id,
          messageId,
          reactions: data.reactions,
        });
      }
    } catch {}
    setPickerMsg(null);
  }

  async function leaveTeam(teamId) {
    if (!confirm('Leave this team?')) return;
    setLeaveLoading(teamId);
    try {
      const res = await apiFetch(`/teams/${teamId}/leave`, { method: 'DELETE' });
      if (res.ok) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        if (selectedTeam?.id === teamId) setSelectedTeam(null);
      }
    } catch {}
    setLeaveLoading(null);
  }

  return (
    <>
      <style jsx>{`
        :root {
          --glass-bg: rgba(30, 30, 48, 0.6);
          --glass-bg-hover: rgba(30, 30, 48, 0.8);
          --glass-border: rgba(255, 255, 255, 0.06);
          --glass-border-hover: rgba(255, 255, 255, 0.12);
          --primary: #e85d26;
          --primary-glow: rgba(232, 93, 38, 0.15);
          --accent: #2563eb;
          --accent-glow: rgba(37, 99, 235, 0.25);
          --surface: rgba(22, 33, 62, 0.7);
          --surface-solid: #16213e;
          --card-bg: rgba(30, 30, 48, 0.5);
          --text-primary: #ffffff;
          --text-secondary: rgba(255, 255, 255, 0.5);
          --text-muted: rgba(255, 255, 255, 0.3);
          --backdrop-blur: blur(20px);
          --backdrop-blur-heavy: blur(40px);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out both;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out both;
        }

        .animate-slide-left {
          animation: slideInLeft 0.3s ease-out both;
        }

        .animate-slide-right {
          animation: slideInRight 0.3s ease-out both;
        }

        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: var(--backdrop-blur);
          -webkit-backdrop-filter: var(--backdrop-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
        }

        .glass-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card-hover:hover {
          background: var(--glass-bg-hover);
          border-color: var(--glass-border-hover);
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .glass-input {
          background: var(--surface);
          backdrop-filter: var(--backdrop-blur);
          -webkit-backdrop-filter: var(--backdrop-blur);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          transition: all 0.3s ease;
        }

        .glass-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
          outline: none;
        }

        .glass-input::placeholder {
          color: var(--text-muted);
        }

        .gradient-btn {
          background: linear-gradient(135deg, var(--primary), #c44b1c);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          letter-spacing: 0.025em;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .gradient-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .gradient-btn:hover::before {
          opacity: 1;
        }

        .gradient-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(232, 93, 38, 0.3);
        }

        .gradient-btn:disabled {
          opacity: 0.5;
          transform: none;
          box-shadow: none;
        }

        .section-header {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-secondary);
        }

        .team-item {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border-left: 3px solid transparent;
        }

        .team-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-left-color: rgba(232, 93, 38, 0.3);
        }

        .team-item-active {
          background: var(--primary-glow) !important;
          border-left-color: var(--primary) !important;
        }

        .msg-bubble-own {
          background: linear-gradient(135deg, var(--accent), #1d4ed8);
          color: white;
          border-bottom-right-radius: 6px;
        }

        .msg-bubble-other {
          background: var(--surface);
          backdrop-filter: var(--backdrop-blur);
          -webkit-backdrop-filter: var(--backdrop-blur);
          border: 1px solid var(--glass-border);
          color: #e5e7eb;
          border-bottom-left-radius: 6px;
        }

        .emoji-picker-glass {
          background: rgba(26, 26, 46, 0.9);
          backdrop-filter: var(--backdrop-blur-heavy);
          -webkit-backdrop-filter: var(--backdrop-blur-heavy);
          border: 1px solid var(--glass-border-hover);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
        }

        .reaction-pill {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.2s ease;
        }

        .reaction-pill:hover {
          transform: scale(1.1);
        }

        .chat-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }

        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .stagger-1 { animation-delay: 0.05s; }
        .stagger-2 { animation-delay: 0.1s; }
        .stagger-3 { animation-delay: 0.15s; }
        .stagger-4 { animation-delay: 0.2s; }
        .stagger-5 { animation-delay: 0.25s; }
      `}</style>

      <div className="animate-fade-in-up">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">My Teams</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Connect with your trainer and teammates
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>Loading teams...</span>
            </div>
          </div>
        ) : teams.length === 0 ? (
          <div className="glass-card animate-fade-in-up p-12 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-2">No teams yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Join a team from your trainer using the join code on the Overview page.
            </p>
          </div>
        ) : (
          <div className="flex gap-6 h-[600px] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Team list sidebar */}
            <div className="glass-card w-64 flex-shrink-0 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                <span className="section-header">Teams</span>
              </div>
              <div className="flex-1 overflow-y-auto chat-scroll">
                {teams.map((t, idx) => (
                  <div key={t.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <button
                      onClick={() => selectTeam(t)}
                      className={`team-item w-full text-left px-5 py-4 border-b ${
                        selectedTeam?.id === t.id ? 'team-item-active' : ''
                      }`}
                      style={{ borderBottomColor: 'var(--glass-border)' }}
                    >
                      <div
                        className="text-sm font-semibold truncate"
                        style={{ color: selectedTeam?.id === t.id ? 'var(--primary)' : 'var(--text-primary)' }}
                      >
                        {t.name}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                        {t.trainer_first_name && ` · ${t.trainer_first_name}`}
                      </div>
                    </button>
                    {selectedTeam?.id === t.id && (
                      <div
                        className="px-5 py-2 border-b animate-fade-in"
                        style={{ borderBottomColor: 'var(--glass-border)' }}
                      >
                        <button
                          onClick={() => leaveTeam(t.id)}
                          disabled={leaveLoading === t.id}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                        >
                          Leave team
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            <div className="glass-card flex-1 flex flex-col overflow-hidden">
              {!selectedTeam ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center animate-fade-in">
                    <div className="text-4xl mb-3 opacity-40">💬</div>
                    <span style={{ color: 'var(--text-muted)' }}>Select a team to view chat</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div
                    className="px-6 py-4 border-b flex items-center gap-3"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'rgba(30, 30, 48, 0.8)',
                      backdropFilter: 'var(--backdrop-blur)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--primary), #c44b1c)' }}
                    >
                      {selectedTeam.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{selectedTeam.name}</h3>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {selectedTeam.member_count} member{selectedTeam.member_count !== 1 ? 's' : ''}
                        {selectedTeam.coach_only && ' · Trainer broadcast only'}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    className="flex-1 overflow-y-auto p-5 space-y-3 chat-scroll"
                    onClick={(e) => { if (e.target === e.currentTarget) setPickerMsg(null); }}
                  >
                    {msgLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3 animate-fade-in">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
                          />
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Loading messages...
                          </span>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full animate-fade-in">
                        <div className="text-center">
                          <div className="text-3xl mb-2 opacity-30">✉️</div>
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            No messages yet. Start the conversation!
                          </span>
                        </div>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.sender_id === userId;
                        const reactions = msg.reactions || [];
                        const showDots = hoveredMsg === msg.id || pickerMsg === msg.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${
                              isOwn ? 'animate-slide-right' : 'animate-slide-left'
                            }`}
                            onMouseEnter={() => setHoveredMsg(msg.id)}
                            onMouseLeave={() => setHoveredMsg(null)}
                          >
                            {/* Dots button - left side for own messages */}
                            {isOwn && (
                              <div className="relative flex-shrink-0 mb-5">
                                <button
                                  onClick={() => setPickerMsg(pickerMsg === msg.id ? null : msg.id)}
                                  className="transition-all text-lg leading-none"
                                  style={{
                                    opacity: showDots ? 1 : 0,
                                    pointerEvents: showDots ? 'auto' : 'none',
                                    color: 'var(--text-muted)',
                                    transform: showDots ? 'scale(1)' : 'scale(0.8)',
                                  }}
                                >
                                  ···
                                </button>
                                {pickerMsg === msg.id && (
                                  <div className="emoji-picker-glass absolute bottom-8 right-0 flex gap-1.5 px-3 py-2 rounded-2xl z-20 animate-fade-in">
                                    {EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => reactToMessage(msg.id, emoji)}
                                        className="text-lg hover:scale-125 transition-transform leading-none"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              {!isOwn && (
                                <span className="text-xs mb-1 ml-1" style={{ color: 'var(--text-muted)' }}>
                                  {msg.sender_name}
                                  {msg.sender_role === 'trainer' && (
                                    <span className="ml-1" style={{ color: 'var(--primary)' }}>(Coach)</span>
                                  )}
                                </span>
                              )}
                              {/* Bubble + reactions wrapper */}
                              <div className="relative">
                                <div
                                  className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
                                    isOwn ? 'msg-bubble-own' : 'msg-bubble-other'
                                  }`}
                                >
                                  {msg.content}
                                </div>
                                {/* Reaction pills */}
                                {reactions.length > 0 && (
                                  <div
                                    className={`absolute -bottom-3 ${isOwn ? 'right-2' : 'left-2'} flex gap-1`}
                                  >
                                    {reactions.map((r) => {
                                      const reacted = r.user_ids?.includes(userId);
                                      return (
                                        <button
                                          key={r.emoji}
                                          onClick={() => reactToMessage(msg.id, r.emoji)}
                                          className="reaction-pill flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border shadow-md"
                                          style={reacted
                                            ? {
                                                backgroundColor: 'var(--accent-glow)',
                                                borderColor: 'var(--accent)',
                                                color: 'white',
                                              }
                                            : {
                                                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                                                borderColor: 'var(--glass-border-hover)',
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
                              <span className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Dots button - right side for others' messages */}
                            {!isOwn && (
                              <div className="relative flex-shrink-0 mb-5">
                                <button
                                  onClick={() => setPickerMsg(pickerMsg === msg.id ? null : msg.id)}
                                  className="transition-all text-lg leading-none"
                                  style={{
                                    opacity: showDots ? 1 : 0,
                                    pointerEvents: showDots ? 'auto' : 'none',
                                    color: 'var(--text-muted)',
                                    transform: showDots ? 'scale(1)' : 'scale(0.8)',
                                  }}
                                >
                                  ···
                                </button>
                                {pickerMsg === msg.id && (
                                  <div className="emoji-picker-glass absolute bottom-8 left-0 flex gap-1.5 px-3 py-2 rounded-2xl z-20 animate-fade-in">
                                    {EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => reactToMessage(msg.id, emoji)}
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
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat input */}
                  {!selectedTeam.coach_only ? (
                    <form
                      onSubmit={sendMessage}
                      className="p-4 border-t flex gap-3"
                      style={{
                        borderColor: 'var(--glass-border)',
                        background: 'rgba(30, 30, 48, 0.8)',
                        backdropFilter: 'var(--backdrop-blur)',
                      }}
                    >
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="glass-input flex-1 px-4 py-2.5"
                      />
                      <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        className="gradient-btn px-6 py-2.5"
                      >
                        Send
                      </button>
                    </form>
                  ) : (
                    <div
                      className="p-4 border-t text-center text-sm"
                      style={{
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-muted)',
                        background: 'rgba(30, 30, 48, 0.8)',
                      }}
                    >
                      This is a broadcast-only channel. Only the trainer can post.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
