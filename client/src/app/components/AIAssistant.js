'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your Athlete Edge assistant. Ask me anything about navigating the app — like \"how do I log a workout?\" or \"where's my film?\"" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.filter((m) => m.role !== 'assistant' || messages.indexOf(m) > 0);
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg, history }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Something went wrong, try again.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I'm unavailable right now." }]);
    }
    setLoading(false);
  }

  // Parse any /route mentions in assistant replies into clickable links
  function renderContent(text) {
    const parts = text.split(/(\/[a-z/[\]]+)/g);
    return parts.map((part, i) => {
      if (part.match(/^\/[a-z/[\]]+/) && !part.includes('[')) {
        return (
          <button
            key={i}
            onClick={() => { router.push(part); setOpen(false); }}
            className="underline font-medium hover:opacity-80"
            style={{ color: '#60a5fa' }}
          >
            {part}
          </button>
        );
      }
      return part;
    });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className="w-80 rounded-2xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#1e1e30', height: 420 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700" style={{ backgroundColor: '#16213e' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: '#2563eb' }}>
                ✦
              </div>
              <span className="text-sm font-bold text-white">Athlete Edge Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="text-sm rounded-2xl px-3 py-2 max-w-[85%] leading-relaxed"
                  style={{
                    backgroundColor: m.role === 'user' ? '#2563eb' : '#0f0f1a',
                    color: m.role === 'user' ? 'white' : '#d1d5db',
                    borderBottomRightRadius: m.role === 'user' ? 4 : undefined,
                    borderBottomLeftRadius: m.role === 'assistant' ? 4 : undefined,
                  }}
                >
                  {m.role === 'assistant' ? renderContent(m.content) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="text-sm rounded-2xl px-3 py-2 text-gray-400" style={{ backgroundColor: '#0f0f1a', borderBottomLeftRadius: 4 }}>
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="px-3 py-3 border-t border-gray-700 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none border border-gray-700 focus:border-blue-500"
              style={{ backgroundColor: '#0f0f1a' }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#2563eb' }}
            >
              ↑
            </button>
          </form>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
        style={{ backgroundColor: '#2563eb' }}
        title="Athlete Edge Assistant"
      >
        {open ? (
          <span className="text-xl">×</span>
        ) : (
          <span className="text-2xl">✦</span>
        )}
      </button>
    </div>
  );
}
