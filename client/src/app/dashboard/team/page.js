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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">My Teams</h1>
        <p className="text-white/40 mt-1">Connect with your trainer and teammates</p>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-12">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div
          className="rounded-xl p-12 border border-white/[0.06] text-center"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-xl font-bold text-white mb-2">No teams yet</h3>
          <p className="text-white/40 mb-2">Join a team from your trainer using the join code on the Overview page.</p>
        </div>
      ) : (
        <div className="flex gap-6 h-[600px]">
          {/* Team list */}
          <div
            className="w-64 flex-shrink-0 rounded-xl border border-white/[0.06] overflow-hidden flex flex-col"
            style={{ backgroundColor: '#1e1e30' }}
          >
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-wide">Teams</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {teams.map((t) => (
                <div key={t.id}>
                  <button
                    onClick={() => selectTeam(t)}
                    className={`w-full text-left px-4 py-4 border-b border-white/[0.04] transition-colors ${
                      selectedTeam?.id === t.id ? '' : 'hover:bg-white/5'
                    }`}
                    style={selectedTeam?.id === t.id ? { backgroundColor: 'rgba(232,93,38,0.15)' } : {}}
                  >
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: selectedTeam?.id === t.id ? '#2563eb' : 'white' }}
                    >
                      {t.name}
                    </div>
                    <div className="text-xs text-white/30 mt-0.5">
                      {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                      {t.trainer_first_name && ` · ${t.trainer_first_name}`}
                    </div>
                  </button>
                  {selectedTeam?.id === t.id && (
                    <div className="px-4 py-2 border-b border-white/[0.06]">
                      <button
                        onClick={() => leaveTeam(t.id)}
                        disabled={leaveLoading === t.id}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
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
          <div
            className="flex-1 rounded-xl border border-white/[0.06] flex flex-col overflow-hidden"
            style={{ backgroundColor: '#1e1e30' }}
          >
            {!selectedTeam ? (
              <div className="flex-1 flex items-center justify-center text-white/30">
                Select a team to view chat
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                  <div>
                    <h3 className="font-bold text-white">{selectedTeam.name}</h3>
                    <div className="text-xs text-white/30">
                      {selectedTeam.member_count} member{selectedTeam.member_count !== 1 ? 's' : ''}
                      {selectedTeam.coach_only && ' · Trainer broadcast only'}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={(e) => { if (e.target === e.currentTarget) setPickerMsg(null); }}>
                  {msgLoading ? (
                    <div className="text-white/30 text-center text-sm">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-white/30 text-center text-sm">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === userId;
                      const reactions = msg.reactions || [];
                      const showDots = hoveredMsg === msg.id || pickerMsg === msg.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                          onMouseEnter={() => setHoveredMsg(msg.id)}
                          onMouseLeave={() => setHoveredMsg(null)}
                        >
                          {/* Dots button — left side for own messages */}
                          {isOwn && (
                            <div className="relative flex-shrink-0 mb-5">
                              <button
                                onClick={() => setPickerMsg(pickerMsg === msg.id ? null : msg.id)}
                                className="text-gray-600 hover:text-white/40 transition-colors text-lg leading-none"
                                style={{ opacity: showDots ? 1 : 0, pointerEvents: showDots ? 'auto' : 'none' }}
                              >
                                ···
                              </button>
                              {pickerMsg === msg.id && (
                                <div
                                  className="absolute bottom-8 right-0 flex gap-1.5 px-3 py-2 rounded-2xl border border-white/[0.08] shadow-xl z-20"
                                  style={{ backgroundColor: '#1a1a2e' }}
                                >
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
                              <span className="text-xs text-white/30 mb-1 ml-1">
                                {msg.sender_name}
                                {msg.sender_role === 'trainer' && (
                                  <span className="ml-1 text-blue-400">(Coach)</span>
                                )}
                              </span>
                            )}
                            {/* Bubble + reactions wrapper */}
                            <div className="relative">
                              <div
                                className="px-4 py-2.5 rounded-2xl text-sm break-words"
                                style={isOwn
                                  ? { backgroundColor: '#2563eb', color: 'white', borderBottomRightRadius: '4px' }
                                  : { backgroundColor: '#16213e', color: '#e5e7eb', borderBottomLeftRadius: '4px' }
                                }
                              >
                                {msg.content}
                              </div>
                              {/* Instagram-style reaction pills */}
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
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border shadow-md transition-colors"
                                        style={reacted
                                          ? { backgroundColor: 'rgba(37,99,235,0.25)', borderColor: '#2563eb', color: 'white' }
                                          : { backgroundColor: '#1a1a2e', borderColor: '#374151', color: '#d1d5db' }
                                        }
                                      >
                                        {r.emoji}{r.count > 1 && <span className="ml-0.5">{r.count}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 mt-4">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Dots button — right side for others' messages */}
                          {!isOwn && (
                            <div className="relative flex-shrink-0 mb-5">
                              <button
                                onClick={() => setPickerMsg(pickerMsg === msg.id ? null : msg.id)}
                                className="text-gray-600 hover:text-white/40 transition-colors text-lg leading-none"
                                style={{ opacity: showDots ? 1 : 0, pointerEvents: showDots ? 'auto' : 'none' }}
                              >
                                ···
                              </button>
                              {pickerMsg === msg.id && (
                                <div
                                  className="absolute bottom-8 left-0 flex gap-1.5 px-3 py-2 rounded-2xl border border-white/[0.08] shadow-xl z-20"
                                  style={{ backgroundColor: '#1a1a2e' }}
                                >
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

                {/* Input */}
                {!selectedTeam.coach_only ? (
                  <form onSubmit={sendMessage} className="p-4 border-t border-white/[0.06] flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                ) : (
                  <div className="p-4 border-t border-white/[0.06] text-center text-sm text-white/30">
                    This is a broadcast-only channel. Only the trainer can post.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
