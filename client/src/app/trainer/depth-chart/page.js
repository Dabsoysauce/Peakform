'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

export default function DepthChartPage() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [chart, setChart] = useState({ PG: [], SG: [], SF: [], PF: [], C: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [addingPos, setAddingPos] = useState(null);

  useEffect(() => { loadTeams(); }, []);
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

  function getMemberById(userId) {
    return members.find(m => m.id === userId || m.user_id === userId);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-white">Depth Chart</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {teams.length === 0 && <option value="">No teams</option>}
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button
            onClick={saveChart}
            disabled={saving || !selectedTeamId}
            className="px-4 py-2 rounded-lg font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#2563eb' }}
          >
            {saving ? 'Saving...' : 'Save Chart'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.includes('saved') ? 'text-green-400 bg-green-900/20 border border-green-800' : 'text-red-400 bg-red-900/20 border border-red-800'}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : !selectedTeamId ? (
        <div className="text-gray-400 text-center py-12">Select a team to manage the depth chart.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {POSITIONS.map(pos => (
            <div key={pos} className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
              <div className="px-3 py-2 border-b border-gray-800 font-black text-center text-sm" style={{ color: '#2563eb' }}>
                {pos}
              </div>
              <div className="p-2 space-y-2">
                {(chart[pos] || []).map((entry, idx) => (
                  <div key={entry.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}>
                    <span className="text-xs font-black text-gray-500 w-4 flex-shrink-0">{idx + 1}</span>
                    <span className="text-sm text-white flex-1 truncate">
                      {entry.first_name || 'Player'} {entry.last_name || ''}
                    </span>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => moveEntry(pos, idx, -1)} disabled={idx === 0} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs leading-none">↑</button>
                      <button onClick={() => moveEntry(pos, idx, 1)} disabled={idx === (chart[pos]?.length || 0) - 1} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs leading-none">↓</button>
                    </div>
                    <button onClick={() => removeEntry(pos, entry.user_id)} className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0">×</button>
                  </div>
                ))}
                {(chart[pos] || []).length === 0 && (
                  <div className="text-center text-gray-600 text-xs py-2">Empty</div>
                )}
                {addingPos === pos ? (
                  <div>
                    <select
                      onChange={e => { if (e.target.value) addPlayerToPosition(pos, e.target.value); }}
                      className="w-full px-2 py-1 rounded border border-gray-700 bg-gray-900 text-white text-xs focus:outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>Select player</option>
                      {unassignedInPos(pos).map(m => (
                        <option key={m.id || m.user_id} value={m.id || m.user_id}>
                          {m.first_name || m.email} {m.last_name || ''}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => setAddingPos(null)} className="text-xs text-gray-500 hover:text-white mt-1 w-full text-center">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingPos(pos)}
                    className="w-full text-xs text-gray-500 hover:text-blue-400 py-1 border border-dashed border-gray-700 rounded hover:border-blue-600 transition-colors"
                  >
                    + Add
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
