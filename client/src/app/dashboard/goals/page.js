'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const METRICS = [
  { value: 'bench_press_max', label: 'Bench Press Max (lbs)' },
  { value: 'squat_max', label: 'Squat Max (lbs)' },
  { value: 'deadlift_max', label: 'Deadlift Max (lbs)' },
  { value: 'total_weekly_sessions', label: 'Weekly Sessions (count)' },
  { value: 'bodyweight', label: 'Bodyweight (lbs)' },
  { value: 'mile_time', label: 'Mile Time (minutes)' },
  { value: 'overhead_press_max', label: 'Overhead Press Max (lbs)' },
  { value: 'pull_ups', label: 'Max Pull-ups (count)' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-md rounded-2xl border border-gray-700 p-6"
        style={{ backgroundColor: '#1e1e30' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
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

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const res = await apiFetch('/goals');
      if (res.ok) setGoals(await res.json());
    } catch {}
    setLoading(false);
  }

  function openCreate() {
    setEditGoal(null);
    setForm(defaultForm);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(goal) {
    setEditGoal(goal);
    setForm({
      title: goal.title,
      metric: goal.metric,
      target_value: goal.target_value,
      comparison: goal.comparison,
      deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const body = {
        ...form,
        target_value: parseFloat(form.target_value),
        deadline: form.deadline || null,
      };
      let res;
      if (editGoal) {
        res = await apiFetch(`/goals/${editGoal.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        res = await apiFetch('/goals', { method: 'POST', body: JSON.stringify(body) });
      }
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save goal');
        return;
      }
      setShowModal(false);
      loadGoals();
    } catch {
      setFormError('Network error');
    }
    setFormLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this goal?')) return;
    try {
      await apiFetch(`/goals/${id}`, { method: 'DELETE' });
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch {}
  }

  async function handleCheckGoals() {
    try {
      const res = await apiFetch('/goals/check', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.newly_achieved && data.newly_achieved.length > 0) {
        setAchievedGoals(data.newly_achieved);
        setShowAchieved(true);
        loadGoals();
      } else {
        alert('No new goals achieved yet. Keep pushing!');
      }
    } catch {}
  }

  const activeGoals = goals.filter((g) => !g.achieved);
  const completedGoals = goals.filter((g) => g.achieved);

  const metricLabel = (m) => METRICS.find((x) => x.value === m)?.label || m;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Goals</h1>
          <p className="text-gray-400 mt-1">Set PRs, track milestones, crush your targets</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCheckGoals}
            className="px-4 py-2.5 rounded-lg font-bold text-green-400 border border-green-700 hover:bg-green-900/20 transition-colors"
          >
            Check Progress
          </button>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#e85d26' }}
          >
            + New Goal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div
          className="rounded-xl p-12 border border-gray-800 text-center"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-white mb-2">No goals yet</h3>
          <p className="text-gray-400 mb-6">Set your first fitness goal and start chasing it.</p>
          <button
            onClick={openCreate}
            className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90"
            style={{ backgroundColor: '#e85d26' }}
          >
            Set First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Active Goals ({activeGoals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-xl p-5 border border-gray-800 hover:border-orange-800 transition-colors"
                    style={{ backgroundColor: '#1e1e30' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white">{g.title}</h3>
                        <div className="text-xs text-gray-500 mt-0.5">{metricLabel(g.metric)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(g)}
                          className="text-xs px-2.5 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="text-xs px-2.5 py-1 rounded border border-red-900 text-red-400 hover:bg-red-900/20"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                        style={{ backgroundColor: 'rgba(232,93,38,0.15)', color: '#e85d26' }}
                      >
                        {g.comparison === 'gte' ? '≥' : g.comparison === 'lte' ? '≤' : '='} {g.target_value}
                      </span>
                      {g.deadline && (
                        <span className="text-xs text-gray-500">
                          by {new Date(g.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">
                Achieved 🏆 ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedGoals.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-xl p-5 border border-green-900/30 opacity-75"
                    style={{ backgroundColor: '#1e1e30' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {g.title}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80' }}
                          >
                            Achieved
                          </span>
                        </h3>
                        <div className="text-xs text-gray-500 mt-0.5">{metricLabel(g.metric)}</div>
                      </div>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="text-xs px-2.5 py-1 rounded border border-red-900 text-red-400 hover:bg-red-900/20"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Goal Form Modal */}
      {showModal && (
        <Modal title={editGoal ? 'Edit Goal' : 'New Goal'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Goal Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. 315 lbs Bench Press"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Metric *</label>
              <select
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              >
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Target Value *</label>
                <input
                  type="number"
                  value={form.target_value}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                  placeholder="315"
                  required
                  step="0.01"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  style={{ backgroundColor: '#16213e' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-orange-500"
                  style={{ backgroundColor: '#16213e', colorScheme: 'dark' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Comparison *</label>
              <select
                value={form.comparison}
                onChange={(e) => setForm({ ...form, comparison: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              >
                {COMPARISONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white">
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#e85d26' }}
              >
                {formLoading ? 'Saving...' : editGoal ? 'Update Goal' : 'Set Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Achievement notification */}
      {showAchieved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            className="w-full max-w-sm rounded-2xl border border-green-700 p-8 text-center"
            style={{ backgroundColor: '#1e1e30' }}
          >
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-black text-white mb-2">Goal{achievedGoals.length > 1 ? 's' : ''} Achieved!</h2>
            <div className="space-y-2 mb-6">
              {achievedGoals.map((g) => (
                <div key={g.id} className="text-green-400 font-semibold">{g.title}</div>
              ))}
            </div>
            <button
              onClick={() => setShowAchieved(false)}
              className="w-full py-3 rounded-lg font-bold text-white"
              style={{ backgroundColor: '#4ade80', color: '#0f0f1a' }}
            >
              Keep Pushing!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
