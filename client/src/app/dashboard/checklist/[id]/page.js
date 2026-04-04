'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

export default function PlayerChecklistPage() {
  const { id } = useParams();
  const router = useRouter();
  const [checklist, setChecklist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => { loadChecklist(); }, [id]);

  async function loadChecklist() {
    try {
      const res = await apiFetch(`/checklists/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChecklist(data);
        setItems(data.items || []);
      }
    } catch {}
    setLoading(false);
  }

  async function toggleItem(item) {
    if (toggling) return;
    setToggling(item.id);
    const newCompleted = !item.completed;
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: newCompleted } : i));
    try {
      const res = await apiFetch(`/checklists/${id}/items/${item.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (!res.ok) {
        // Revert on failure
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: item.completed } : i));
      }
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: item.completed } : i));
    }
    setToggling(null);
  }

  const completedCount = items.filter(i => i.completed).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="text-gray-400">Loading...</div>
    </div>
  );

  if (!checklist) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-400">Checklist not found or access denied.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Back</button>
        </div>

        <div className="rounded-xl border border-gray-800 p-6 mb-4" style={{ backgroundColor: '#1e1e30' }}>
          <h1 className="text-2xl font-black text-white mb-1">{checklist.title}</h1>
          {checklist.team_name && <p className="text-sm text-gray-400 mb-3">👥 {checklist.team_name}</p>}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ backgroundColor: '#4ade80', width: items.length > 0 ? `${(completedCount / items.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-gray-400">{completedCount}/{items.length}</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No items in this checklist.</div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item)}
                disabled={toggling === item.id}
                className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:border-green-600 disabled:opacity-70"
                style={{
                  backgroundColor: '#1e1e30',
                  borderColor: item.completed ? '#4ade80' : '#374151',
                }}
              >
                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: item.completed ? '#4ade80' : '#6b7280',
                    backgroundColor: item.completed ? '#4ade80' : 'transparent',
                  }}
                >
                  {item.completed && <span className="text-black text-xs font-black">✓</span>}
                </div>
                <span
                  className="text-sm font-medium flex-1"
                  style={{ color: item.completed ? '#9ca3af' : 'white', textDecoration: item.completed ? 'line-through' : 'none' }}
                >
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
