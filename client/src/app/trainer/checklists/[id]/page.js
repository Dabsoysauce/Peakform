'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

export default function ChecklistProgressPage() {
  const { id } = useParams();
  const router = useRouter();
  const [checklist, setChecklist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProgress(); }, [id]);

  async function loadProgress() {
    try {
      const res = await apiFetch(`/checklists/${id}/progress`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
      // Also load checklist info
      const cRes = await apiFetch(`/checklists/${id}`);
      if (cRes.ok) setChecklist(await cRes.json());
    } catch {}
    setLoading(false);
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  if (!checklist) return <div className="text-gray-400 py-12 text-center">Checklist not found.</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/trainer/checklists')} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <div>
          <h1 className="text-2xl font-black text-white">{checklist.title}</h1>
          {checklist.team_name && <p className="text-sm text-gray-400">👥 {checklist.team_name}</p>}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-12 text-center" style={{ backgroundColor: '#1e1e30' }}>
          <p className="text-gray-400">No items in this checklist.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="rounded-xl border border-gray-800 p-4" style={{ backgroundColor: '#1e1e30' }}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-white">{item.text}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full ml-3 flex-shrink-0" style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}>
                  {item.completions.length} done
                </span>
              </div>
              {item.completions.length === 0 ? (
                <p className="text-xs text-gray-500">No completions yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {item.completions.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">
                        {c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : 'Unknown Player'}
                      </span>
                      <span className="text-gray-500">
                        {c.completed_at ? new Date(c.completed_at).toLocaleString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
