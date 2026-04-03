'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const METRICS = [
  { value: 'vertical_jump', label: 'Vertical Jump (inches)' },
  { value: 'sprint_40', label: '40-Yard Dash (seconds)' },
  { value: 'bench_press_max', label: 'Bench Press Max (lbs)' },
  { value: 'squat_max', label: 'Squat Max (lbs)' },
  { value: 'total_weekly_sessions', label: 'Weekly Sessions (count)' },
  { value: 'bodyweight', label: 'Bodyweight (lbs)' },
  { value: 'mile_time', label: 'Mile Time (minutes)' },
  { value: 'pull_ups', label: 'Max Pull-ups (count)' },
  { value: 'free_throws', label: 'Free Throw % (percent)' },
];

const COMPARISONS = [
  { value: 'gte', label: '≥ At least (e.g. hit this weight or more)' },
  { value: 'lte', label: '≤ At most (e.g. bodyweight goal, faster time)' },
  { value: 'eq', label: '= Exactly this value' },
];

const defaultForm = {
  title: '', metric: 'bench_press_max', target_value: '', comparison: 'gte', deadline: '',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" style={{ backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'rgba(15,15,35,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [achievedGoals, setAchievedGoals] = useState([]);
  const [showAchieved, setShowAchieved] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const res = await apiFetch('/goals');
      if (res.ok) setGoals(await res.json());
    } catch {}
    setLoading(false);
  }

  function openCreate() { setEditGoal(null); setForm(defaultForm); setFormError(''); setShowModal(true); }

  function openEdit(goal) {
    setEditGoal(goal);
    setForm({ title: goal.title, metric: goal.metric, target_value: goal.target_value, comparison: goal.comparison, deadline: goal.deadline ? goal.deadline.split('T')[0] : '' });
    setFormError(''); setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setFormError(''); setFormLoading(true);
    try {
      const body = { ...form, target_value: parseFloat(form.target_value), deadline: form.deadline || null };
      let res;
      if (editGoal) { res = await apiFetch(`/goals/${editGoal.id}`, { method: 'PUT', body: JSON.stringify(body) }); }
      else { res = await apiFetch('/goals', { method: 'POST', body: JSON.stringify(body) }); }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to save goal'); return; }
      setShowModal(false); loadGoals();
    } catch { setFormError('Network error'); }
    setFormLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this goal?')) return;
    try { await apiFetch(`/goals/${id}`, { method: 'DELETE' }); setGoals((prev) => prev.filter((g) => g.id !== id)); } catch {}
  }

  async function handleCheckGoals() {
    try {
      const res = await apiFetch('/goals/check', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.newly_achieved && data.newly_achieved.length > 0) {
        setAchievedGoals(data.newly_achieved); setShowAchieved(true); loadGoals();
      } else { alert('No new goals achieved yet. Keep pushing!'); }
    } catch {}
  }

  const activeGoals = goals.filter((g) => !g.achieved);
  const completedGoals = goals.filter((g) => g.achieved);
  const metricLabel = (m) => METRICS.find((x) => x.value === m)?.label || m;
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Goals</h1>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Set PRs, track milestones, crush your targets</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCheckGoals}
            className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.12)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.06)'}
          >
            Check Progress
          </button>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,93,4,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            + New Goal
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)' }} className="text-center py-12">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }}>
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">No goals yet</h3>
          <p className="mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>Set your first basketball goal and start chasing it.</p>
          <button onClick={openCreate} className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}>
            Set First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Active Goals ({activeGoals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map((g) => (
                  <div key={g.id} className="rounded-2xl p-5 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(232,93,4,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {g.title}
                          {g.assigned_by && (
                            <span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>Coach</span>
                          )}
                        </h3>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{metricLabel(g.metric)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(g)} className="text-xs px-2.5 py-1 rounded-lg transition-all" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>Edit</button>
                        <button onClick={() => handleDelete(g.id)} className="text-xs px-2.5 py-1 rounded-lg transition-all" style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>Del</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold" style={{ background: 'rgba(232,93,4,0.1)', border: '1px solid rgba(232,93,4,0.2)', color: '#f97316' }}>
                        {g.comparison === 'gte' ? '≥' : g.comparison === 'lte' ? '≤' : '='} {g.target_value}
                      </span>
                      {g.deadline && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>by {new Date(g.deadline).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                Achieved
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>({completedGoals.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedGoals.map((g) => (
                  <div key={g.id} className="rounded-2xl p-5 opacity-70" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {g.title}
                          <span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>Achieved</span>
                        </h3>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{metricLabel(g.metric)}</div>
                      </div>
                      <button onClick={() => handleDelete(g.id)} className="text-xs px-2.5 py-1 rounded-lg" style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal title={editGoal ? 'Edit Goal' : 'New Goal'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Goal Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 315 lbs Bench Press" required
                className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all" style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Metric *</label>
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} required
                className="w-full px-4 py-2.5 rounded-xl text-white focus:outline-none" style={inputStyle}>
                {METRICS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Target Value *</label>
                <input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} placeholder="315" required step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Deadline</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-white focus:outline-none" style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Comparison *</label>
              <select value={form.comparison} onChange={(e) => setForm({ ...form, comparison: e.target.value })} required
                className="w-full px-4 py-2.5 rounded-xl text-white focus:outline-none" style={inputStyle}>
                {COMPARISONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm transition-all" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
              <button type="submit" disabled={formLoading} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #e85d04, #f97316)' }}>
                {formLoading ? 'Saving...' : editGoal ? 'Update Goal' : 'Set Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showAchieved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: 'rgba(15,15,35,0.95)', border: '1px solid rgba(34,197,94,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
            </svg>
            <h2 className="text-2xl font-black text-white mb-2">Goal{achievedGoals.length > 1 ? 's' : ''} Achieved!</h2>
            <div className="space-y-2 mb-6">
              {achievedGoals.map((g) => (<div key={g.id} className="font-semibold" style={{ color: '#4ade80' }}>{g.title}</div>))}
            </div>
            <button onClick={() => setShowAchieved(false)} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: 'linear-gradient(135deg, #22c55e, #4ade80)', color: '#08081a' }}>
              Keep Pushing!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
