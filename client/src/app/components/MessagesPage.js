'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { uploadDMMedia } from '../lib/supabase';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
const EMOJIS = ['❤️', '👍', '😂', '🔥', '😮'];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <span className="text-gray-400">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="text-gray-500 text-sm text-center py-6">Searching...</div>
          ) : results.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-6">
              {query ? 'No results found' : 'Start typing a name...'}
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.user_id}
                onClick={() => onSelect(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-gray-800 last:border-0"
              >
                <div
                  className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: '#2563eb' }}
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
        className="rounded-xl max-w-xs max-h-48 mt-1 object-cover cursor-pointer hover:opacity-90"
      />
    </a>
  );
}

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
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

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
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const res = await apiFetch(`/dm/${partnerId}`);
      if (res.ok) setMessages(await res.json());
    } catch {}
    setLoadingMsgs(false);
    setConversations((prev) =>
      prev.map((c) => c.partner_id === partnerId ? { ...c, unread_count: 0 } : c)
    );
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
    <>
      {showNewMsg && (
        <NewMessageModal
          onClose={() => setShowNewMsg(false)}
          onSelect={handleContactSelect}
        />
      )}

      <div className="flex h-[calc(100vh-120px)] gap-0 rounded-xl overflow-hidden border border-gray-800" style={{ backgroundColor: '#1e1e30' }}>
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h1 className="text-lg font-black text-white">Messages</h1>
            <button
              onClick={() => setShowNewMsg(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity text-lg font-bold"
              style={{ backgroundColor: '#2563eb' }}
              title="New message"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="text-gray-500 text-sm text-center py-8">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8 px-4">
                No conversations yet.<br />
                <button onClick={() => setShowNewMsg(true)} className="mt-2 text-blue-400 hover:underline text-sm">
                  Start one →
                </button>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.partner_id}
                  onClick={() => openConversation(c.partner_id, c.partner_name, c.partner_role)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-800 hover:bg-white/5 transition-colors ${activeId === c.partner_id ? 'bg-white/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: '#2563eb' }}
                    >
                      {c.partner_photo
                        ? <img src={c.partner_photo} alt="" className="w-full h-full object-cover" />
                        : (c.partner_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white truncate">{c.partner_name}</span>
                        {c.unread_count > 0 && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold text-white flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {c.last_content || (c.last_media_url ? '📎 Attachment' : '')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        {activeId ? (
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
              <button
                onClick={() => {
                  const myRole = localStorage.getItem('role');
                  const dest = activeRole === 'trainer' ? `/coach/${activeId}` : `/player/${activeId}`;
                  router.push(dest);
                }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {activeName.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-white hover:underline">{activeName}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loadingMsgs ? (
                <div className="text-gray-500 text-sm text-center py-8">Loading...</div>
              ) : messages.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">No messages yet — say hi!</div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === myUserId;
                  const reactions = m.reactions || [];
                  const showDots = hoveredMsg === m.id || pickerMsg === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                      onMouseEnter={() => setHoveredMsg(m.id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {/* Dots — left of bubble for own messages */}
                      {isMine && (
                        <div className="relative flex-shrink-0 mb-5">
                          <button
                            onClick={() => setPickerMsg(pickerMsg === m.id ? null : m.id)}
                            className="text-gray-600 hover:text-gray-400 transition-colors text-lg leading-none"
                            style={{ opacity: showDots ? 1 : 0, pointerEvents: showDots ? 'auto' : 'none' }}
                          >
                            ···
                          </button>
                          {pickerMsg === m.id && (
                            <div
                              className="absolute bottom-8 right-0 flex gap-1.5 px-3 py-2 rounded-2xl border border-gray-700 shadow-xl z-20"
                              style={{ backgroundColor: '#1a1a2e' }}
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
                        {!isMine && <p className="text-xs text-gray-500 mb-1 ml-1">{m.sender_name}</p>}
                        {m.media_url && <MediaBubble url={m.media_url} media_type={m.media_type} />}
                        <div className="relative">
                          {m.content && (
                            <div
                              className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                              style={{
                                backgroundColor: isMine ? '#2563eb' : '#16213e',
                                color: isMine ? 'white' : '#e5e7eb',
                                borderBottomRightRadius: isMine ? 4 : undefined,
                                borderBottomLeftRadius: !isMine ? 4 : undefined,
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
                        <p className={`text-xs text-gray-600 mt-4 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>

                      {/* Dots — right of bubble for others' messages */}
                      {!isMine && (
                        <div className="relative flex-shrink-0 mb-5">
                          <button
                            onClick={() => setPickerMsg(pickerMsg === m.id ? null : m.id)}
                            className="text-gray-600 hover:text-gray-400 transition-colors text-lg leading-none"
                            style={{ opacity: showDots ? 1 : 0, pointerEvents: showDots ? 'auto' : 'none' }}
                          >
                            ···
                          </button>
                          {pickerMsg === m.id && (
                            <div
                              className="absolute bottom-8 left-0 flex gap-1.5 px-3 py-2 rounded-2xl border border-gray-700 shadow-xl z-20"
                              style={{ backgroundColor: '#1a1a2e' }}
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
                    <img src={attachPreview.src} alt="preview" className="h-20 rounded-xl object-cover" />
                  ) : (
                    <div className="h-20 px-4 rounded-xl flex items-center gap-2 text-sm text-gray-300" style={{ backgroundColor: '#16213e' }}>
                      🎬 {attachPreview.name}
                    </div>
                  )}
                  <button
                    onClick={clearAttachment}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-600 hover:bg-gray-500 text-white text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="px-6 py-4 border-t border-gray-800 flex items-center gap-3">
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
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0 text-xl"
                title="Attach image or video"
              >
                📎
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={uploading ? 'Uploading...' : 'Type a message...'}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
                style={{ backgroundColor: '#16213e' }}
              />
              <button
                type="submit"
                disabled={isBusy || (!input.trim() && !attachedFile)}
                className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity text-sm flex-shrink-0"
                style={{ backgroundColor: '#2563eb' }}
              >
                {uploading ? '...' : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-white mb-2">Your Messages</h3>
              <p className="text-gray-400 text-sm mb-4">Select a conversation or start a new one.</p>
              <button
                onClick={() => setShowNewMsg(true)}
                className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 text-sm"
                style={{ backgroundColor: '#2563eb' }}
              >
                + New Message
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
