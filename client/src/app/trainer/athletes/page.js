'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

function isYouTube(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}
function getYouTubeEmbed(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}
function isSupabaseVideo(url) {
  return url && url.includes('supabase') && (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.avi'));
}
function isSupabaseImage(url) {
  return url && url.includes('supabase') && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp'));
}

export default function TrainerAthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [playerMedia, setPlayerMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

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

  async function handleSelectAthlete(a) {
    if (selectedAthlete?.id === a.id) {
      setSelectedAthlete(null);
      setPlayerMedia([]);
      return;
    }
    setSelectedAthlete(a);
    setPlayerMedia([]);
    setMediaLoading(true);
    try {
      const res = await apiFetch(`/media/player/${a.user_id}`);
      if (res.ok) setPlayerMedia(await res.json());
    } catch {}
    setMediaLoading(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Browse Players</h1>
        <p className="text-gray-400 mt-1">Search by name, school, or goal</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, school, email..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          style={{ backgroundColor: '#1e1e30' }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-white hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#2563eb' }}
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
            <div className="text-gray-500 text-center py-12">Search for players above</div>
          ) : athletes.length === 0 ? (
            <div
              className="rounded-xl p-12 border border-gray-800 text-center"
              style={{ backgroundColor: '#1e1e30' }}
            >
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-white mb-2">No players found</h3>
              <p className="text-gray-400">Try a different search term</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">{athletes.length} player{athletes.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {athletes.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl p-5 border cursor-pointer transition-all hover:border-blue-600 ${
                      selectedAthlete?.id === a.id ? 'border-blue-600' : 'border-gray-800'
                    }`}
                    style={{
                      backgroundColor: selectedAthlete?.id === a.id ? 'rgba(232,93,38,0.08)' : '#1e1e30',
                    }}
                    onClick={() => handleSelectAthlete(a)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: '#2563eb' }}
                      >
                        {(a.first_name || a.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {a.first_name ? `${a.first_name} ${a.last_name || ''}`.trim() : a.email}
                        </h3>
                        {a.school_name && (
                          <div className="text-xs text-gray-500">🏫 {a.school_name}</div>
                        )}
                      </div>
                    </div>
                    {a.primary_goal && (
                      <span
                        className="inline-block text-xs px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(232,93,38,0.15)', color: '#2563eb' }}
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
                className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                style={{ backgroundColor: '#2563eb' }}
              >
                {selectedAthlete.photo_url
                  ? <img src={selectedAthlete.photo_url} alt="" className="w-full h-full object-cover" />
                  : (selectedAthlete.first_name || selectedAthlete.email).charAt(0).toUpperCase()}
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

            <div className="space-y-3 mb-5">
              {selectedAthlete.school_name && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">School</div>
                  <div className="text-sm text-white">{selectedAthlete.school_name}</div>
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
                  <div className="text-sm text-gray-300 leading-relaxed line-clamp-3">{selectedAthlete.bio}</div>
                </div>
              )}
            </div>

            {/* Film count */}
            <div className="border-t border-gray-700 pt-4 mb-4">
              {mediaLoading ? (
                <p className="text-xs text-gray-500">Loading film...</p>
              ) : (
                <p className="text-xs text-gray-400">
                  🎬 {playerMedia.length} clip{playerMedia.length !== 1 ? 's' : ''} in Film Room
                </p>
              )}
            </div>

            <button
              onClick={() => {
                const name = selectedAthlete.first_name
                  ? `${selectedAthlete.first_name} ${selectedAthlete.last_name || ''}`.trim()
                  : selectedAthlete.email;
                router.push(`/trainer/messages?with=${selectedAthlete.user_id}&name=${encodeURIComponent(name)}&role=athlete`);
              }}
              className="w-full py-2.5 rounded-lg font-bold text-white text-sm hover:opacity-90 transition-opacity mb-2"
              style={{ backgroundColor: '#2563eb' }}
            >
              💬 Message
            </button>
            <Link
              href={`/player/${selectedAthlete.user_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-lg font-bold text-sm text-center hover:opacity-90 transition-opacity mb-2 border border-gray-600 text-gray-300"
            >
              Open Profile ↗
            </Link>
            <button
              onClick={() => { setSelectedAthlete(null); setPlayerMedia([]); }}
              className="w-full py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
