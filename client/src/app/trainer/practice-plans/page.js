'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const glassCard = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '20px',
};

const inputBase = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
};

const sectionHeader = {
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.35)',
  fontWeight: 600,
};

const gradientBtn = {
  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
  border: 'none',
  borderRadius: '12px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '10px 20px',
  fontSize: '14px',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

function SkeletonGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ ...glassCard, padding: '20px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '20px', width: '70%', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', marginBottom: '12px' }} />
          <div style={{ height: '14px', width: '50%', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px' }} />
          <div style={{ height: '14px', width: '30%', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ height: '30px', width: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ height: '30px', width: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }} />
          </div>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
            animation: 'shimmer 1.8s ease-in-out infinite',
          }} />
        </div>
      ))}
    </div>
  );
}

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); loadData(); }, []);

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

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  const handleInputFocus = (e) => {
    e.target.style.borderColor = 'rgba(var(--primary-rgb), 0.4)';
    e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb), 0.1)';
  };
  const handleInputBlur = (e) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .glass-input:focus {
          border-color: rgba(var(--primary-rgb), 0.4) !important;
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1) !important;
        }
        .gradient-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(var(--primary-rgb), 0.3);
        }
        .plan-card {
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .plan-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
          border-color: rgba(var(--primary-rgb), 0.2) !important;
        }
        .tpl-card {
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .tpl-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
          border-color: rgba(168,85,247,0.25) !important;
        }
        .action-btn {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }
        .action-btn:hover {
          transform: translateY(-1px);
        }
        .tab-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cancel-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
          cursor: pointer;
          padding: 10px 20px;
          font-size: 14px;
          transition: color 0.15s;
        }
        .cancel-btn:hover {
          color: rgba(255,255,255,0.7);
        }
        .modal-backdrop {
          animation: fadeInBackdrop 0.2s ease;
        }
        .modal-content {
          animation: slideUp 0.3s ease;
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{ ...fadeIn(0), marginBottom: '24px' }}>
        <p style={sectionHeader}>Planning</p>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '4px 0 0' }}>Practice Plans</h1>
      </div>

      {/* Tabs */}
      <div style={{
        ...fadeIn(0.05),
        display: 'inline-flex',
        gap: '4px',
        padding: '4px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '24px',
      }}>
        <button
          onClick={() => setTab('plans')}
          className="tab-btn"
          style={{
            background: tab === 'plans' ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'transparent',
            color: tab === 'plans' ? '#fff' : 'rgba(255,255,255,0.4)',
          }}
        >
          Plans
        </button>
        <button
          onClick={() => setTab('templates')}
          className="tab-btn"
          style={{
            background: tab === 'templates' ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'transparent',
            color: tab === 'templates' ? '#fff' : 'rgba(255,255,255,0.4)',
          }}
        >
          Templates
        </button>
      </div>

      {/* Plans Tab */}
      {tab === 'plans' && (
        <>
          <div style={{ ...fadeIn(0.1), display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="gradient-btn"
              style={gradientBtn}
            >
              + New Plan
            </button>
          </div>

          {/* Create Form */}
          {showCreate && (
            <form
              onSubmit={handleCreate}
              style={{ ...glassCard, padding: '24px', marginBottom: '24px', ...fadeIn(0.12) }}
            >
              <h2 style={{ fontWeight: 700, color: '#fff', marginBottom: '16px', fontSize: '16px' }}>Create Practice Plan</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Plan title *"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  className="glass-input"
                  style={inputBase}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <input
                  type="date"
                  value={form.plan_date}
                  onChange={e => setForm({ ...form, plan_date: e.target.value })}
                  className="glass-input"
                  style={{ ...inputBase, colorScheme: 'dark' }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="glass-input"
                  style={{ ...inputBase, resize: 'none' }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={creating}
                    className="gradient-btn"
                    style={{ ...gradientBtn, opacity: creating ? 0.5 : 1 }}
                  >
                    {creating ? 'Creating...' : 'Create Plan'}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Plans List */}
          {loading ? (
            <SkeletonGrid />
          ) : plans.length === 0 ? (
            <div style={{ ...glassCard, padding: '48px', textAlign: 'center', ...fadeIn(0.15) }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.6 }}>&#128203;</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>No practice plans yet. Create one above!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {plans.map((plan, i) => (
                <div
                  key={plan.id}
                  className="plan-card"
                  style={{ ...glassCard, padding: '20px', ...fadeIn(0.1 + i * 0.04) }}
                >
                  <h3 style={{
                    fontWeight: 800,
                    color: '#fff',
                    fontSize: '17px',
                    marginBottom: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {plan.title}
                  </h3>
                  {plan.plan_date && (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                      {new Date(plan.plan_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '16px' }}>
                    {plan.block_count} block{plan.block_count !== 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => router.push(`/trainer/practice-plans/${plan.id}`)}
                      className="action-btn"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: '#fff' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setShareModal({ planId: plan.id }); setShareMsg(''); setShareTeamId(''); }}
                      className="action-btn"
                      style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                    >
                      Share
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="action-btn"
                      style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.15)' }}
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

      {/* Templates Tab */}
      {tab === 'templates' && (
        <>
          <div style={{ ...fadeIn(0.1), display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => setShowTplCreate(!showTplCreate)}
              className="gradient-btn"
              style={gradientBtn}
            >
              + New Template
            </button>
          </div>

          {/* Create Template Form */}
          {showTplCreate && (
            <form
              onSubmit={handleTplCreate}
              style={{ ...glassCard, padding: '24px', marginBottom: '24px', ...fadeIn(0.12) }}
            >
              <h2 style={{ fontWeight: 700, color: '#fff', marginBottom: '16px', fontSize: '16px' }}>Create Template</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Template name *"
                  value={tplForm.title}
                  onChange={e => setTplForm({ ...tplForm, title: e.target.value })}
                  required
                  className="glass-input"
                  style={inputBase}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...sectionHeader, display: 'block', marginBottom: '6px', fontSize: '11px' }}>Type</label>
                    <select
                      value={tplForm.template_type}
                      onChange={e => setTplForm({ ...tplForm, template_type: e.target.value })}
                      className="glass-input"
                      style={{ ...inputBase }}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    >
                      <option value="block" style={{ background: '#1a1a2e' }}>Block (single drill)</option>
                      <option value="practice" style={{ background: '#1a1a2e' }}>Full Practice</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...sectionHeader, display: 'block', marginBottom: '6px', fontSize: '11px' }}>Focus Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Warm-up, Defense"
                      value={tplForm.focus_area}
                      onChange={e => setTplForm({ ...tplForm, focus_area: e.target.value })}
                      className="glass-input"
                      style={inputBase}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Notes (optional)"
                  value={tplForm.notes}
                  onChange={e => setTplForm({ ...tplForm, notes: e.target.value })}
                  rows={2}
                  className="glass-input"
                  style={{ ...inputBase, resize: 'none' }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={tplCreating}
                    className="gradient-btn"
                    style={{ ...gradientBtn, opacity: tplCreating ? 0.5 : 1 }}
                  >
                    {tplCreating ? 'Creating...' : 'Create Template'}
                  </button>
                  <button type="button" onClick={() => setShowTplCreate(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Templates List */}
          {loading ? (
            <SkeletonGrid />
          ) : templates.length === 0 ? (
            <div style={{ ...glassCard, padding: '48px', textAlign: 'center', ...fadeIn(0.15) }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.6 }}>&#128221;</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '4px' }}>No templates yet.</p>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>Create block or full-practice templates to reuse in your plans.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {templates.map((tpl, i) => (
                <div
                  key={tpl.id}
                  className="tpl-card"
                  style={{ ...glassCard, padding: '20px', ...fadeIn(0.1 + i * 0.04) }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <h3 style={{
                      fontWeight: 800,
                      color: '#fff',
                      fontSize: '17px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {tpl.title}
                    </h3>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontWeight: 600,
                      marginLeft: '8px',
                      flexShrink: 0,
                      background: tpl.template_type === 'practice'
                        ? 'rgba(168,85,247,0.1)'
                        : 'rgba(var(--primary-rgb),0.1)',
                      color: tpl.template_type === 'practice' ? '#c084fc' : 'var(--primary-light)',
                      border: `1px solid ${tpl.template_type === 'practice' ? 'rgba(168,85,247,0.2)' : 'rgba(var(--primary-rgb),0.2)'}`,
                    }}>
                      {tpl.template_type === 'practice' ? 'Full Practice' : 'Block'}
                    </span>
                  </div>
                  {tpl.focus_area && (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{tpl.focus_area}</p>
                  )}
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '16px' }}>
                    {tpl.block_count} block{tpl.block_count !== 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => router.push(`/trainer/practice-plans/templates/${tpl.id}`)}
                      className="action-btn"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: '#fff' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleTplDelete(tpl.id)}
                      className="action-btn"
                      style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.15)' }}
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
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShareModal(null); }}
        >
          <div
            className="modal-content"
            style={{
              ...glassCard,
              width: '100%',
              maxWidth: '400px',
              padding: '28px',
              background: 'rgba(20,20,35,0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontWeight: 800, color: '#fff', fontSize: '18px' }}>Share Practice Plan</h2>
              <button
                onClick={() => setShareModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ ...sectionHeader, display: 'block', marginBottom: '8px', fontSize: '11px' }}>Send to team (or all teams)</label>
                <select
                  value={shareTeamId}
                  onChange={e => setShareTeamId(e.target.value)}
                  className="glass-input"
                  style={inputBase}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="" style={{ background: '#1a1a2e' }}>All my players</option>
                  {teams.map(t => <option key={t.id} value={t.id} style={{ background: '#1a1a2e' }}>{t.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={sharing}
                className="gradient-btn"
                style={{ ...gradientBtn, width: '100%', opacity: sharing ? 0.5 : 1 }}
              >
                {sharing ? 'Sending...' : 'Send as DM'}
              </button>
              {shareMsg && (
                <div style={{
                  fontSize: '14px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: shareMsg.includes('Sent') ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${shareMsg.includes('Sent') ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  color: shareMsg.includes('Sent') ? '#4ade80' : '#ef4444',
                }}>
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
