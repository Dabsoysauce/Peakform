'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

export default function PracticePlanEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({ title: '', duration_minutes: '', focus_area: '', notes: '' });
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editBlockData, setEditBlockData] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => { loadPlan(); }, [id]);

  async function loadPlan() {
    try {
      const res = await apiFetch(`/practice-plans/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
        setBlocks(data.blocks || []);
      }
    } catch {}
    setLoading(false);
  }

  async function saveHeader(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await apiFetch(`/practice-plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: plan.title, plan_date: plan.plan_date, notes: plan.notes }),
      });
      if (res.ok) setMsg('Saved!');
    } catch {}
    setSaving(false);
    setTimeout(() => setMsg(''), 2000);
  }

  async function addBlock(e) {
    e.preventDefault();
    if (!newBlock.title.trim()) return;
    try {
      const res = await apiFetch(`/practice-plans/${id}/blocks`, {
        method: 'POST',
        body: JSON.stringify({ ...newBlock, sort_order: blocks.length }),
      });
      if (res.ok) {
        const block = await res.json();
        setBlocks([...blocks, block]);
        setNewBlock({ title: '', duration_minutes: '', focus_area: '', notes: '' });
        setAddingBlock(false);
      }
    } catch {}
  }

  async function saveBlock(blockId) {
    try {
      const res = await apiFetch(`/practice-plans/${id}/blocks/${blockId}`, {
        method: 'PUT',
        body: JSON.stringify(editBlockData),
      });
      if (res.ok) {
        const updated = await res.json();
        setBlocks(blocks.map(b => b.id === blockId ? updated : b));
        setEditingBlockId(null);
      }
    } catch {}
  }

  async function deleteBlock(blockId) {
    try {
      const res = await apiFetch(`/practice-plans/${id}/blocks/${blockId}`, { method: 'DELETE' });
      if (res.ok) setBlocks(blocks.filter(b => b.id !== blockId));
    } catch {}
  }

  async function moveBlock(index, direction) {
    const newBlocks = [...blocks];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    const reordered = newBlocks.map((b, i) => ({ ...b, sort_order: i }));
    setBlocks(reordered);
    try {
      await apiFetch(`/practice-plans/${id}/reorder`, {
        method: 'PUT',
        body: JSON.stringify(reordered.map(b => ({ id: b.id, sort_order: b.sort_order }))),
      });
    } catch {}
  }

  if (loading) {
    return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  }

  if (!plan) {
    return <div className="text-gray-400 py-12 text-center">Plan not found.</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/trainer/practice-plans')} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <h1 className="text-2xl font-black text-white">Edit Plan</h1>
      </div>

      {/* Header fields */}
      <form onSubmit={saveHeader} className="rounded-xl border border-gray-800 p-5 mb-6" style={{ backgroundColor: '#1e1e30' }}>
        <div className="space-y-3">
          <input
            type="text"
            value={plan.title || ''}
            onChange={e => setPlan({ ...plan, title: e.target.value })}
            placeholder="Plan title"
            className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-bold text-lg"
          />
          <input
            type="date"
            value={plan.plan_date ? plan.plan_date.split('T')[0] : ''}
            onChange={e => setPlan({ ...plan, plan_date: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white focus:outline-none focus:border-blue-500"
          />
          <textarea
            value={plan.notes || ''}
            onChange={e => setPlan({ ...plan, notes: e.target.value })}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#2563eb' }}
          >
            {saving ? 'Saving...' : 'Save Header'}
          </button>
          {msg && <span className="text-green-400 text-sm">{msg}</span>}
        </div>
      </form>

      {/* Blocks */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-white">Blocks</h2>
          <button
            onClick={() => setAddingBlock(!addingBlock)}
            className="text-xs px-3 py-1.5 rounded font-bold text-white hover:opacity-90"
            style={{ backgroundColor: '#2563eb' }}
          >
            + Add Block
          </button>
        </div>

        {blocks.length === 0 && !addingBlock && (
          <div className="text-gray-500 text-sm py-4 text-center">No blocks yet. Add one above!</div>
        )}

        <div className="space-y-3">
          {blocks.map((block, idx) => (
            <div key={block.id} className="rounded-xl border border-gray-800 p-4" style={{ backgroundColor: '#1e1e30' }}>
              {editingBlockId === block.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editBlockData.title || ''}
                    onChange={e => setEditBlockData({ ...editBlockData, title: e.target.value })}
                    placeholder="Block title"
                    className="w-full px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editBlockData.duration_minutes || ''}
                      onChange={e => setEditBlockData({ ...editBlockData, duration_minutes: e.target.value })}
                      placeholder="Minutes"
                      className="w-24 px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={editBlockData.focus_area || ''}
                      onChange={e => setEditBlockData({ ...editBlockData, focus_area: e.target.value })}
                      placeholder="Focus area"
                      className="flex-1 px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <textarea
                    value={editBlockData.notes || ''}
                    onChange={e => setEditBlockData({ ...editBlockData, notes: e.target.value })}
                    placeholder="Notes"
                    rows={2}
                    className="w-full px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveBlock(block.id)} className="text-xs px-3 py-1 rounded font-bold text-white" style={{ backgroundColor: '#2563eb' }}>Save</button>
                    <button onClick={() => setEditingBlockId(null)} className="text-xs px-3 py-1 rounded font-bold text-gray-400 hover:text-white">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs leading-none">↑</button>
                    <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs leading-none">↓</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{block.title}</span>
                      {block.duration_minutes && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-gray-300" style={{ backgroundColor: 'rgba(37,99,235,0.2)' }}>{block.duration_minutes} min</span>
                      )}
                      {block.focus_area && (
                        <span className="text-xs text-gray-400">{block.focus_area}</span>
                      )}
                    </div>
                    {block.notes && <p className="text-xs text-gray-500 mt-1">{block.notes}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditingBlockId(block.id); setEditBlockData({ ...block }); }}
                      className="text-xs text-blue-400 hover:underline"
                    >Edit</button>
                    <button onClick={() => deleteBlock(block.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {addingBlock && (
          <form onSubmit={addBlock} className="rounded-xl border border-dashed border-gray-600 p-4 mt-3 space-y-2">
            <input
              type="text"
              value={newBlock.title}
              onChange={e => setNewBlock({ ...newBlock, title: e.target.value })}
              placeholder="Block title *"
              required
              className="w-full px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newBlock.duration_minutes}
                onChange={e => setNewBlock({ ...newBlock, duration_minutes: e.target.value })}
                placeholder="Minutes"
                className="w-24 px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={newBlock.focus_area}
                onChange={e => setNewBlock({ ...newBlock, focus_area: e.target.value })}
                placeholder="Focus area"
                className="flex-1 px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <textarea
              value={newBlock.notes}
              onChange={e => setNewBlock({ ...newBlock, notes: e.target.value })}
              placeholder="Notes"
              rows={2}
              className="w-full px-3 py-1.5 rounded border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="text-xs px-3 py-1 rounded font-bold text-white" style={{ backgroundColor: '#2563eb' }}>Add Block</button>
              <button type="button" onClick={() => setAddingBlock(false)} className="text-xs px-3 py-1 rounded font-bold text-gray-400 hover:text-white">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
