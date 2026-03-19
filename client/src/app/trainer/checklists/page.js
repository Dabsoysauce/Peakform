'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function ChecklistsPage() {
  const router = useRouter();
  const [checklists, setChecklists] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', team_id: '', items: [{ text: '' }] });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [cRes, tRes] = await Promise.all([apiFetch('/checklists'), apiFetch('/teams')]);
      if (cRes.ok) setChecklists(await cRes.json());
      if (tRes.ok) setTeams(await tRes.json());
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const items = form.items.filter(i => i.text.trim()).map(i => ({ text: i.text.trim() }));
      const res = await apiFetch('/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: form.title, team_id: form.team_id || undefined, items }),
      });
      if (res.ok) {
        const cl = await res.json();
        setChecklists([{ ...cl, item_count: items.length }, ...checklists]);
        setForm({ title: '', team_id: '', items: [{ text: '' }] });
        setShowCreate(false);
      }
    } catch {}
    setCreating(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this checklist?')) return;
    try {
      const res = await apiFetch(`/checklists/${id}`, { method: 'DELETE' });
      if (res.ok) setChecklists(checklists.filter(c => c.id !== id));
    } catch {}
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { text: '' }] });
  }

  function updateItem(idx, value) {
    const items = [...form.items];
    items[idx] = { text: value };
    setForm({ ...form, items });
  }

  function removeItem(idx) {
    const items = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items: items.length > 0 ? items : [{ text: '' }] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Checklists</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90"
          style={{ backgroundColor: '#2563eb' }}
        >
          + New Checklist
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-gray-700 p-5 mb-6" style={{ backgroundColor: '#1e1e30' }}>
          <h2 className="font-bold text-white mb-4">Create Checklist</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Checklist title *"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={form.team_id}
              onChange={e => setForm({ ...form, team_id: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">No team assigned</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Items</label>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={item.text}
                      onChange={e => updateItem(idx, e.target.value)}
                      placeholder={`Item ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button type="button" onClick={() => removeItem(idx)} className="text-gray-500 hover:text-red-400 text-sm">×</button>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-xs text-blue-400 hover:underline">+ Add item</button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2 rounded-lg font-bold text-gray-400 text-sm hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : checklists.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-12 text-center" style={{ backgroundColor: '#1e1e30' }}>
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-400">No checklists yet. Create one above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {checklists.map(cl => (
            <div key={cl.id} className="rounded-xl border border-gray-800 p-5 hover:border-blue-600 transition-colors" style={{ backgroundColor: '#1e1e30' }}>
              <h3 className="font-black text-white text-lg mb-1 truncate">{cl.title}</h3>
              {cl.team_name && <p className="text-sm text-gray-400 mb-1">👥 {cl.team_name}</p>}
              <p className="text-xs text-gray-500 mb-4">{cl.item_count} item{cl.item_count !== 1 ? 's' : ''}</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => router.push(`/trainer/checklists/${cl.id}`)}
                  className="text-xs px-3 py-1.5 rounded font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  View Progress
                </button>
                <button
                  onClick={() => handleDelete(cl.id)}
                  className="text-xs px-3 py-1.5 rounded font-medium border hover:opacity-80"
                  style={{ borderColor: '#ef4444', color: '#ef4444' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
