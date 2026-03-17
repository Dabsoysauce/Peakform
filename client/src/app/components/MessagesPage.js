'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null); // partner user_id
  const [activeName, setActiveName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // Socket setup
  useEffect(() => {
    if (!myUserId) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join_dm', { userId: myUserId });

    socket.on('new_dm', (msg) => {
      // If we're in the conversation with this sender, append
      setActiveId((current) => {
        if (current === msg.sender_id) {
          setMessages((prev) => [...prev, msg]);
          // Mark read
          apiFetch(`/dm/${msg.sender_id}`, { method: 'GET' }).catch(() => {});
        }
        return current;
      });
      // Refresh conversation list
      loadConversations();
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

  // Open a conversation from ?with=userId query param
  useEffect(() => {
    const withId = searchParams.get('with');
    const withName = searchParams.get('name');
    if (withId && withId !== activeId) {
      openConversation(withId, withName || withId);
    }
  }, [searchParams]);

  async function openConversation(partnerId, partnerName) {
    setActiveId(partnerId);
    setActiveName(partnerName);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const res = await apiFetch(`/dm/${partnerId}`);
      if (res.ok) setMessages(await res.json());
    } catch {}
    setLoadingMsgs(false);
    // Clear unread in conversation list
    setConversations((prev) =>
      prev.map((c) => c.partner_id === partnerId ? { ...c, unread_count: 0 } : c)
    );
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !activeId) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const res = await apiFetch(`/dm/${activeId}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        socketRef.current?.emit('send_dm', { recipientId: activeId, message: msg });
        loadConversations();
      }
    } catch {}
    setSending(false);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-xl overflow-hidden border border-gray-800" style={{ backgroundColor: '#1e1e30' }}>
      {/* Sidebar — conversation list */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-800">
        <div className="px-5 py-4 border-b border-gray-800">
          <h1 className="text-lg font-black text-white">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="text-gray-500 text-sm text-center py-8">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8 px-4">
              No conversations yet.<br />Message a player from their profile.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.partner_id}
                onClick={() => openConversation(c.partner_id, c.partner_name)}
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
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.last_content}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message thread */}
      {activeId ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: '#2563eb' }}
            >
              {activeName.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-white">{activeName}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {loadingMsgs ? (
              <div className="text-gray-500 text-sm text-center py-8">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                No messages yet — say hi!
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.sender_id === myUserId;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md ${isMine ? 'order-2' : ''}`}>
                      {!isMine && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">{m.sender_name}</p>
                      )}
                      <div
                        className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={{
                          backgroundColor: isMine ? '#2563eb' : '#16213e',
                          color: isMine ? 'white' : '#e5e7eb',
                          borderBottomRightRadius: isMine ? 4 : undefined,
                          borderBottomLeftRadius: !isMine ? 4 : undefined,
                        }}
                      >
                        {m.content}
                      </div>
                      <p className={`text-xs text-gray-600 mt-1 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="px-6 py-4 border-t border-gray-800 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              style={{ backgroundColor: '#16213e' }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity text-sm"
              style={{ backgroundColor: '#2563eb' }}
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-lg font-bold text-white mb-2">Your Messages</h3>
            <p className="text-gray-400 text-sm">Select a conversation or message a player from their profile.</p>
          </div>
        </div>
      )}
    </div>
  );
}
