'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'];

export default function AIWorkoutPage() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [form, setForm] = useState({
    goals: '',
    weaknesses: '',
    fitness_level: 'intermediate',
    focus_areas: '',
    duration_days: 5,
  });

  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  const [assigning, setAssigning] = useState(false);
  const [assignedDays, setAssignedDays] = useState(new Set());
  const [assignMsg, setAssignMsg] = useState('');

  useEffect(() => {
    async function loadTeams() {
      setLoadingTeams(true);
      try {
        const res = await apiFetch('/teams');
        if (!res.ok) return;
        const teamsData = await res.json();
        setTeams(teamsData);

        const memberMap = new Map();
        await Promise.all(
          teamsData.map(async (team) => {
            const mRes = await apiFetch(`/teams/${team.id}/members`);
            if (!mRes.ok) return;
            const members = await mRes.json();
            members.forEach((m) => {
              if (!memberMap.has(m.user_id)) memberMap.set(m.user_id, m);
            });
          })
        );
        setPlayers([...memberMap.values()]);
      } catch {}
      setLoadingTeams(false);
    }
    loadTeams();
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!selectedPlayer) return;
    setError('');
    setPlan(null);
    setAssignedDays(new Set());
    setAssignMsg('');
    setGenerating(true);

    try {
      const res = await apiFetch('/ai/generate-workout', {
        method: 'POST',
        body: JSON.stringify({ userId: selectedPlayer.user_id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate plan');
      } else {
        setPlan(data.plan);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setGenerating(false);
  }

  async function assignDay(workout, index) {
    if (!selectedPlayer || assigning) return;
    setAssigning(true);
    setAssignMsg('');

    const today = new Date();
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() + index);
    const dateStr = sessionDate.toISOString().slice(0, 10);

    try {
      const res = await apiFetch(`/workouts/assign/${selectedPlayer.user_id}`, {
        method: 'POST',
        body: JSON.stringify({
          session_name: workout.session_name,
          session_date: dateStr,
          notes: workout.notes,
          duration_minutes: workout.duration_minutes,
          exercises: workout.exercises,
        }),
      });
      if (res.ok) {
        setAssignedDays((prev) => new Set([...prev, index]));
      } else {
        const data = await res.json();
        setAssignMsg(data.error || 'Failed to assign workout');
      }
    } catch {
      setAssignMsg('Network error during assignment');
    }
    setAssigning(false);
  }

  async function assignAll() {
    if (!plan || !selectedPlayer || assigning) return;
    setAssigning(true);
    setAssignMsg('');

    const today = new Date();
    let successCount = 0;

    for (let i = 0; i < plan.workouts.length; i++) {
      if (assignedDays.has(i)) continue;
      const workout = plan.workouts[i];
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() + i);
      const dateStr = sessionDate.toISOString().slice(0, 10);

      try {
        const res = await apiFetch(`/workouts/assign/${selectedPlayer.user_id}`, {
          method: 'POST',
          body: JSON.stringify({
            session_name: workout.session_name,
            session_date: dateStr,
            notes: workout.notes,
            duration_minutes: workout.duration_minutes,
            exercises: workout.exercises,
          }),
        });
        if (res.ok) {
          setAssignedDays((prev) => new Set([...prev, i]));
          successCount++;
        }
      } catch {}
    }

    setAssignMsg(
      successCount > 0
        ? `Assigned ${successCount} workout${successCount !== 1 ? 's' : ''} to ${selectedPlayer.first_name || 'player'}`
        : 'No new workouts to assign'
    );
    setAssigning(false);
  }

  const allAssigned = plan && plan.workouts.every((_, i) => assignedDays.has(i));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Workout Generator</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Input a player's goals and weaknesses — Claude builds a full workout plan.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-5">
        {/* Player selector */}
        <div className="rounded-xl border border-gray-700 p-5" style={{ backgroundColor: '#1e1e30' }}>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Select Player</h2>
          {loadingTeams ? (
            <p className="text-gray-500 text-sm">Loading players...</p>
          ) : players.length === 0 ? (
            <p className="text-gray-500 text-sm">No players on your teams yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {players.map((p) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Player';
                const active = selectedPlayer?.user_id === p.user_id;
                return (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => { setSelectedPlayer(p); setPlan(null); setAssignMsg(''); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? 'border-blue-500 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}
                    style={active ? { backgroundColor: 'rgba(37,99,235,0.15)' } : {}}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: active ? '#2563eb' : '#374151', color: 'white' }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Form fields */}
        <div className="rounded-xl border border-gray-700 p-5 space-y-4" style={{ backgroundColor: '#1e1e30' }}>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Training Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Goals</label>
              <textarea
                className="w-full rounded-lg border border-gray-600 bg-gray-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                placeholder="e.g. Increase vertical jump, improve explosiveness"
                value={form.goals}
                onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Weaknesses to Address</label>
              <textarea
                className="w-full rounded-lg border border-gray-600 bg-gray-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                placeholder="e.g. Ankle stability, core strength, lateral quickness"
                value={form.weaknesses}
                onChange={(e) => setForm((f) => ({ ...f, weaknesses: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Fitness Level</label>
              <select
                className="w-full rounded-lg border border-gray-600 bg-gray-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
                value={form.fitness_level}
                onChange={(e) => setForm((f) => ({ ...f, fitness_level: e.target.value }))}
              >
                {FITNESS_LEVELS.map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Number of Days</label>
              <input
                type="number"
                min={1}
                max={14}
                className="w-full rounded-lg border border-gray-600 bg-gray-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
                value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Focus Areas</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-600 bg-gray-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="e.g. Lower body, conditioning"
                value={form.focus_areas}
                onChange={(e) => setForm((f) => ({ ...f, focus_areas: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={!selectedPlayer || generating}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#2563eb' }}
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Generating Plan...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Generate Workout Plan
            </>
          )}
        </button>
      </form>

      {/* Generated plan */}
      {plan && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/30 p-5" style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-white">{plan.plan_name}</h2>
                <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
              </div>
              <button
                onClick={assignAll}
                disabled={assigning || allAssigned}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: allAssigned ? '#374151' : '#16a34a', color: 'white' }}
              >
                {allAssigned ? 'All Assigned' : assigning ? 'Assigning...' : `Assign All to ${selectedPlayer?.first_name || 'Player'}`}
              </button>
            </div>
            {assignMsg && (
              <p className="text-green-400 text-sm mt-3">{assignMsg}</p>
            )}
          </div>

          {plan.workouts.map((workout, i) => {
            const assigned = assignedDays.has(i);
            return (
              <div
                key={i}
                className="rounded-xl border p-5 space-y-4 transition-all"
                style={{
                  backgroundColor: '#1e1e30',
                  borderColor: assigned ? '#16a34a' : '#374151',
                }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37,99,235,0.2)', color: '#60a5fa' }}>
                        Day {workout.day}
                      </span>
                      {assigned && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.2)', color: '#4ade80' }}>
                          Assigned
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold mt-2">{workout.session_name}</h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {workout.focus} &middot; {workout.duration_minutes} min
                    </p>
                    {workout.notes && (
                      <p className="text-gray-500 text-xs mt-1 italic">{workout.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => assignDay(workout, i)}
                    disabled={assigning || assigned}
                    className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: assigned ? 'transparent' : 'rgba(37,99,235,0.2)',
                      color: assigned ? '#4ade80' : '#60a5fa',
                      border: `1px solid ${assigned ? '#16a34a' : '#2563eb'}`,
                    }}
                  >
                    {assigned ? 'Assigned' : 'Assign Day'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-700">
                        <th className="pb-2 font-medium">Exercise</th>
                        <th className="pb-2 font-medium w-14">Sets</th>
                        <th className="pb-2 font-medium w-14">Reps</th>
                        <th className="pb-2 font-medium w-20">Weight</th>
                        <th className="pb-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {workout.exercises.map((ex, j) => (
                        <tr key={j}>
                          <td className="py-2 text-white font-medium">{ex.exercise_name}</td>
                          <td className="py-2 text-gray-300">{ex.sets ?? '—'}</td>
                          <td className="py-2 text-gray-300">{ex.reps ?? '—'}</td>
                          <td className="py-2 text-gray-300">{ex.weight_lbs != null ? `${ex.weight_lbs} lbs` : 'BW'}</td>
                          <td className="py-2 text-gray-500 text-xs">{ex.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
