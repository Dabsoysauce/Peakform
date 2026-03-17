'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/api';

export default function TrainerAthletesPage() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    setSelectedAthlete(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await apiFetch(`/athletes?${params.toString()}`);
      if (res.ok) setAthletes(await res.json());
      else setAthletes([]);
    } catch {
      setAthletes([]);
    }
    setLoading(false);
  }

  async function loadAll() {
    setLoading(true);
    setSearched(true);
    setSelectedAthlete(null);
    try {
      const res = await apiFetch('/athletes');
      if (res.ok) setAthletes(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Browse Athletes</h1>
        <p className="text-gray-400 mt-1">Search by name, gym, or goal</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, gym, email..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          style={{ backgroundColor: '#1e1e30' }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-white hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#e85d26' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); loadAll(); }}
            className="px-4 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white"
          >
            Clear
          </button>
        )}
      </form>

      <div className="flex gap-6">
        {/* Athletes list */}
        <div className="flex-1">
          {loading ? (
            <div className="text-gray-400 text-center py-12">Searching...</div>
          ) : !searched ? (
            <div className="text-gray-500 text-center py-12">Search for athletes above</div>
          ) : athletes.length === 0 ? (
            <div
              className="rounded-xl p-12 border border-gray-800 text-center"
              style={{ backgroundColor: '#1e1e30' }}
            >
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-white mb-2">No athletes found</h3>
              <p className="text-gray-400">Try a different search term</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {athletes.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl p-5 border cursor-pointer transition-all hover:border-orange-700 ${
                      selectedAthlete?.id === a.id ? 'border-orange-600' : 'border-gray-800'
                    }`}
                    style={{
                      backgroundColor: selectedAthlete?.id === a.id ? 'rgba(232,93,38,0.08)' : '#1e1e30',
                    }}
                    onClick={() => setSelectedAthlete(selectedAthlete?.id === a.id ? null : a)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: '#e85d26' }}
                      >
                        {(a.first_name || a.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {a.first_name ? `${a.first_name} ${a.last_name || ''}`.trim() : a.email}
                        </h3>
                        {a.gym_name && (
                          <div className="text-xs text-gray-500">🏢 {a.gym_name}{a.gym_city ? `, ${a.gym_city}` : ''}</div>
                        )}
                      </div>
                    </div>
                    {a.primary_goal && (
                      <span
                        className="inline-block text-xs px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(232,93,38,0.15)', color: '#e85d26' }}
                      >
                        {a.primary_goal}
                      </span>
                    )}
                    {a.age && (
                      <span className="ml-2 text-xs text-gray-500">{a.age} yrs old</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Athlete detail panel */}
        {selectedAthlete && (
          <div
            className="w-72 flex-shrink-0 rounded-xl border border-gray-800 p-6 self-start sticky top-6"
            style={{ backgroundColor: '#1e1e30' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white"
                style={{ backgroundColor: '#e85d26' }}
              >
                {(selectedAthlete.first_name || selectedAthlete.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-white">
                  {selectedAthlete.first_name
                    ? `${selectedAthlete.first_name} ${selectedAthlete.last_name || ''}`.trim()
                    : 'Unnamed'}
                </h3>
                <p className="text-xs text-gray-500">{selectedAthlete.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedAthlete.gym_name && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Gym</div>
                  <div className="text-sm text-white">
                    {selectedAthlete.gym_name}
                    {selectedAthlete.gym_city && `, ${selectedAthlete.gym_city}`}
                    {selectedAthlete.gym_state && `, ${selectedAthlete.gym_state}`}
                  </div>
                </div>
              )}
              {selectedAthlete.primary_goal && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Goal</div>
                  <div className="text-sm text-white">{selectedAthlete.primary_goal}</div>
                </div>
              )}
              {selectedAthlete.age && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Age</div>
                  <div className="text-sm text-white">{selectedAthlete.age}</div>
                </div>
              )}
              {selectedAthlete.bio && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Bio</div>
                  <div className="text-sm text-gray-300 leading-relaxed">{selectedAthlete.bio}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedAthlete(null)}
              className="mt-5 w-full py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
