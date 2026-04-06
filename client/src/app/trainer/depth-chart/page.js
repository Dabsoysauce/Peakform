'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

const glassCard = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '20px',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
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
  transition: 'transform 0.2s, box-shadow 0.2s',
};

function SkeletonCard() {
  return (
    <div style={{ ...glassCard, padding: '16px', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', marginBottom: '12px' }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px' }} />
      ))}
      <style jsx>{`
        div { position: relative; overflow: hidden; }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        animation: 'shimmer 1.8s ease-in-out infinite',
      }} />
    </div>
  );
}

export default function DepthChartPage() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [chart, setChart] = useState({ PG: [], SG: [], SF: [], PF: [], C: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [addingPos, setAddingPos] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); loadTeams(); }, []);
  useEffect(() => { if (selectedTeamId) loadChartAndMembers(); }, [selectedTeamId]);

  async function loadTeams() {
    try {
      const res = await apiFetch('/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        if (data.length > 0) setSelectedTeamId(data[0].id);
      }
    } catch {}
  }

  async function loadChartAndMembers() {
    setLoading(true);
    try {
      const [chartRes, membersRes] = await Promise.all([
        apiFetch(`/depth-chart/team/${selectedTeamId}`),
        apiFetch(`/teams/${selectedTeamId}/members`),
      ]);
      if (chartRes.ok) setChart(await chartRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch {}
    setLoading(false);
  }

  function getAssignedUserIds() {
    return new Set(Object.values(chart).flat().map(e => e.user_id));
  }

  function addPlayerToPosition(pos, userId) {
    const member = members.find(m => (m.id === userId || m.user_id === userId));
    if (!member) return;
    const uid = member.id || member.user_id;
    const newEntry = {
      user_id: uid,
      position: pos,
      depth_order: (chart[pos]?.length || 0) + 1,
      first_name: member.first_name,
      last_name: member.last_name,
      photo_url: member.photo_url,
    };
    setChart(prev => ({ ...prev, [pos]: [...(prev[pos] || []), newEntry] }));
    setAddingPos(null);
  }

  function removeEntry(pos, userId) {
    setChart(prev => ({
      ...prev,
      [pos]: prev[pos].filter(e => e.user_id !== userId).map((e, i) => ({ ...e, depth_order: i + 1 })),
    }));
  }

  function moveEntry(pos, idx, direction) {
    const newList = [...chart[pos]];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
    const reordered = newList.map((e, i) => ({ ...e, depth_order: i + 1 }));
    setChart(prev => ({ ...prev, [pos]: reordered }));
  }

  async function saveChart() {
    if (!selectedTeamId) return;
    setSaving(true);
    setMsg('');
    try {
      const entries = Object.entries(chart).flatMap(([pos, list]) =>
        list.map(e => ({ user_id: e.user_id, position: pos, depth_order: e.depth_order }))
      );
      const res = await apiFetch(`/depth-chart/team/${selectedTeamId}`, {
        method: 'PUT',
        body: JSON.stringify(entries),
      });
      if (res.ok) {
        setMsg('Depth chart saved!');
      } else {
        const data = await res.json();
        setMsg(data.error || 'Failed to save');
      }
    } catch { setMsg('Network error'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  const assignedIds = getAssignedUserIds();
  const unassignedInPos = (pos) => members.filter(m => {
    const uid = m.id || m.user_id;
    return !chart[pos]?.some(e => e.user_id === uid);
  });

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .glass-input:focus {
          border-color: rgba(var(--primary-rgb), 0.4) !important;
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
        }
        .glass-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #fff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .glass-select:focus {
          border-color: rgba(var(--primary-rgb), 0.4);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
        }
        .glass-select option {
          background: #1a1a2e;
          color: #fff;
        }
        .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(var(--primary-rgb), 0.3);
        }
        .pos-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pos-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .player-row {
          transition: background 0.15s;
        }
        .player-row:hover {
          background: rgba(var(--primary-rgb), 0.08) !important;
        }
        .move-btn {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: none;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 11px;
          transition: all 0.15s;
        }
        .move-btn:hover:not(:disabled) {
          background: rgba(var(--primary-rgb), 0.15);
          color: var(--primary);
        }
        .move-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }
        .remove-btn {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.25);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s;
        }
        .remove-btn:hover {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
        }
        .add-btn {
          width: 100%;
          padding: 8px;
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 10px;
          background: transparent;
          color: rgba(255,255,255,0.3);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-btn:hover {
          border-color: rgba(var(--primary-rgb), 0.3);
          color: var(--primary);
          background: rgba(var(--primary-rgb), 0.04);
        }
      `}</style>

      {/* Header */}
      <div style={{ ...fadeIn(0), display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={sectionHeader}>Team Roster</p>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '4px 0 0' }}>Depth Chart</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            className="glass-select"
            style={{ padding: '10px 14px', fontSize: '14px' }}
          >
            {teams.length === 0 && <option value="">No teams</option>}
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button
            onClick={saveChart}
            disabled={saving || !selectedTeamId}
            className="save-btn"
            style={{ ...gradientBtn, padding: '10px 20px', fontSize: '14px', opacity: (saving || !selectedTeamId) ? 0.5 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Chart'}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {msg && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
          background: msg.includes('saved') ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${msg.includes('saved') ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: msg.includes('saved') ? '#4ade80' : '#ef4444',
          ...fadeIn(0),
        }}>
          {msg}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {POSITIONS.map((pos, i) => (
            <div key={pos} style={fadeIn(0.05 * i)}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : !selectedTeamId ? (
        <div style={{ ...glassCard, padding: '48px', textAlign: 'center', ...fadeIn(0.1) }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.6 }}>&#127936;</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Select a team to manage the depth chart.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {POSITIONS.map((pos, posIdx) => (
            <div
              key={pos}
              className="pos-card"
              style={{
                ...glassCard,
                overflow: 'hidden',
                ...fadeIn(0.06 * posIdx),
              }}
            >
              {/* Position Header */}
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
                background: 'rgba(var(--primary-rgb), 0.04)',
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.04em',
                }}>
                  {pos}
                </span>
              </div>

              {/* Players List */}
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(chart[pos] || []).map((entry, idx) => (
                  <div
                    key={entry.user_id}
                    className="player-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: 'rgba(var(--primary-rgb), 0.04)',
                    }}
                  >
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'rgba(255,255,255,0.2)',
                      width: '16px',
                      flexShrink: 0,
                      textAlign: 'center',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: '#fff',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                    }}>
                      {entry.first_name || 'Player'} {entry.last_name || ''}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                      <button onClick={() => moveEntry(pos, idx, -1)} disabled={idx === 0} className="move-btn">&uarr;</button>
                      <button onClick={() => moveEntry(pos, idx, 1)} disabled={idx === (chart[pos]?.length || 0) - 1} className="move-btn">&darr;</button>
                    </div>
                    <button onClick={() => removeEntry(pos, entry.user_id)} className="remove-btn">&times;</button>
                  </div>
                ))}

                {(chart[pos] || []).length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.15)',
                    fontSize: '12px',
                    padding: '16px 0',
                    fontStyle: 'italic',
                  }}>
                    No players assigned
                  </div>
                )}

                {addingPos === pos ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <select
                      onChange={e => { if (e.target.value) addPlayerToPosition(pos, e.target.value); }}
                      className="glass-select glass-input"
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12px' }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select player</option>
                      {unassignedInPos(pos).map(m => (
                        <option key={m.id || m.user_id} value={m.id || m.user_id}>
                          {m.first_name || m.email} {m.last_name || ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setAddingPos(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingPos(pos)} className="add-btn">
                    + Add Player
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
