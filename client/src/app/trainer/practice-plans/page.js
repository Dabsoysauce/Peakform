'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function PracticePlansPage() {
  const router = useRouter();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', plan_date: '', notes: '' });
  const [creating, setCreating] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [shareTeamId, setShareTeamId] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const [sharing, setSharing] = useState(false);

  const [showTplCreate, setShowTplCreate] = useState(false);
  const [tplForm, setTplForm] = useState({ title: '', template_type: 'block', focus_area: '', notes: '' });
  const [tplCreating, setTplCreating] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [pRes, tRes, tplRes] = await Promise.all([
        apiFetch('/practice-plans'),
        apiFetch('/teams'),
        apiFetch('/practice-plan-templates'),
      ]);
      if (pRes.ok) setPlans(await pRes.json());
      if (tRes.ok) setTeams(await tRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch('/practice-plans', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const plan = await res.json();
        setPlans([plan, ...plans]);
        setForm({ title: '', plan_date: '', notes: '' });
        setShowCreate(false);
      }
    } catch {}
    setCreating(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this practice plan?')) return;
    try {
      const res = await apiFetch(`/practice-plans/${id}`, { method: 'DELETE' });
      if (res.ok) setPlans(plans.filter(p => p.id !== id));
    } catch {}
  }

  async function handleShare(e) {
    e.preventDefault();
    setSharing(true);
    setShareMsg('');
    try {
      const res = await apiFetch(`/practice-plans/${shareModal.planId}/share`, {
        method: 'POST',
        body: JSON.stringify({ team_id: shareTeamId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareMsg(`Sent to ${data.sent} player${data.sent !== 1 ? 's' : ''}!`);
      } else {
        setShareMsg(data.error || 'Failed to share');
      }
    } catch { setShareMsg('Network error'); }
    setSharing(false);
  }

  async function handleTplCreate(e) {
    e.preventDefault();
    if (!tplForm.title.trim()) return;
    setTplCreating(true);
    try {
      const res = await apiFetch('/practice-plan-templates', {
        method: 'POST',
        body: JSON.stringify(tplForm),
      });
      if (res.ok) {
        const tpl = await res.json();
        setTemplates([tpl, ...templates]);
        setTplForm({ title: '', template_type: 'block', focus_area: '', notes: '' });
        setShowTplCreate(false);
      }
    } catch {}
    setTplCreating(false);
  }

  async function handleTplDelete(id) {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await apiFetch(`/practice-plan-templates/${id}`, { method: 'DELETE' });
      if (res.ok) setTemplates(templates.filter(t => t.id !== id));
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Practice Plans</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: '#1e1e30' }}>
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'plans' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          style={tab === 'plans' ? { backgroundColor: '#2563eb' } : {}}
        >
          Plans
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'templates' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          style={tab === 'templates' ? { backgroundColor: '#2563eb' } : {}}
        >
          Templates
        </button>
      </div>

      {tab === 'plans' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90"
              style={{ backgroundColor: '#2563eb' }}
            >
              + New Plan
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} className="rounded-xl border border-gray-700 p-5 mb-6" style={{ backgroundColor: '#1e1e30' }}>
              <h2 className="font-bold text-white mb-4">Create Practice Plan</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Plan title *"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="date"
                  value={form.plan_date}
                  onChange={e => setForm({ ...form, plan_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white focus:outline-none focus:border-blue-500"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    {creating ? 'Creating...' : 'Create Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-5 py-2 rounded-lg font-bold text-gray-400 text-sm hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-gray-400 text-center py-12">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="rounded-xl border border-gray-800 p-12 text-center" style={{ backgroundColor: '#1e1e30' }}>
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-400">No practice plans yet. Create one above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="rounded-xl border border-gray-800 p-5 hover:border-blue-600 transition-colors" style={{ backgroundColor: '#1e1e30' }}>
                  <h3 className="font-black text-white text-lg mb-1 truncate">{plan.title}</h3>
                  {plan.plan_date && (
                    <p className="text-sm text-gray-400 mb-1">
                      📆 {new Date(plan.plan_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-4">{plan.block_count} block{plan.block_count !== 1 ? 's' : ''}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => router.push(`/trainer/practice-plans/${plan.id}`)}
                      className="text-xs px-3 py-1.5 rounded font-medium text-white hover:opacity-90"
                      style={{ backgroundColor: '#2563eb' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setShareModal({ planId: plan.id }); setShareMsg(''); setShareTeamId(''); }}
                      className="text-xs px-3 py-1.5 rounded font-medium border hover:opacity-80"
                      style={{ borderColor: '#4ade80', color: '#4ade80' }}
                    >
                      Share
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
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
        </>
      )}

      {tab === 'templates' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowTplCreate(!showTplCreate)}
              className="px-4 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90"
              style={{ backgroundColor: '#2563eb' }}
            >
              + New Template
            </button>
          </div>

          {showTplCreate && (
            <form onSubmit={handleTplCreate} className="rounded-xl border border-gray-700 p-5 mb-6" style={{ backgroundColor: '#1e1e30' }}>
              <h2 className="font-bold text-white mb-4">Create Template</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Template name *"
                  value={tplForm.title}
                  onChange={e => setTplForm({ ...tplForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Type</label>
                    <select
                      value={tplForm.template_type}
                      onChange={e => setTplForm({ ...tplForm, template_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-transparent text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="block">Block (single drill)</option>
                      <option value="practice">Full Practice</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Focus area</label>
                    <input
                      type="text"
                      placeholder="e.g. Warm-up, Defense"
                      value={tplForm.focus_area}
                      onChange={e => setTplForm({ ...tplForm, focus_area: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Notes (optional)"
                  value={tplForm.notes}
                  onChange={e => setTplForm({ ...tplForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={tplCreating}
                    className="px-5 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    {tplCreating ? 'Creating...' : 'Create Template'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTplCreate(false)}
                    className="px-5 py-2 rounded-lg font-bold text-gray-400 text-sm hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-gray-400 text-center py-12">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-gray-800 p-12 text-center" style={{ backgroundColor: '#1e1e30' }}>
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-400 mb-1">No templates yet.</p>
              <p className="text-xs text-gray-500">Create block or full-practice templates to reuse in your plans.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(tpl => (
                <div key={tpl.id} className="rounded-xl border border-gray-800 p-5 hover:border-purple-600 transition-colors" style={{ backgroundColor: '#1e1e30' }}>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-black text-white text-lg truncate flex-1">{tpl.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ml-2 flex-shrink-0 ${
                      tpl.template_type === 'practice'
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                    }`}>
                      {tpl.template_type === 'practice' ? 'Full Practice' : 'Block'}
                    </span>
                  </div>
                  {tpl.focus_area && (
                    <p className="text-sm text-gray-400 mb-1">{tpl.focus_area}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-4">{tpl.block_count} block{tpl.block_count !== 1 ? 's' : ''}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => router.push(`/trainer/practice-plans/templates/${tpl.id}`)}
                      className="text-xs px-3 py-1.5 rounded font-medium text-white hover:opacity-90"
                      style={{ backgroundColor: '#2563eb' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleTplDelete(tpl.id)}
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
        </>
      )}

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 p-6" style={{ backgroundColor: '#1e1e30' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white">Share Practice Plan</h2>
              <button onClick={() => setShareModal(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleShare} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Send to team (or all teams)</label>
                <select
                  value={shareTeamId}
                  onChange={e => setShareTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-transparent text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">All my players</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={sharing}
                className="w-full py-2 rounded-lg font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {sharing ? 'Sending...' : 'Send as DM'}
              </button>
              {shareMsg && (
                <div className={`text-sm px-3 py-2 rounded ${shareMsg.includes('Sent') ? 'text-green-400' : 'text-red-400'}`}>
                  {shareMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
