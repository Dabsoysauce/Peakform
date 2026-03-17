'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function AnalysisModal({ media, onClose }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { analyzeFilm(); }, []);

  function isVideo(url) {
    return url && url.includes('supabase') && (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.avi'));
  }

  async function extractVideoFrame(videoUrl) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.currentTime = 2;
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          canvas.getContext('2d').drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        } catch { reject(new Error('Canvas failed')); }
      };
      video.onerror = () => reject(new Error('Video load failed'));
      video.load();
    });
  }

  async function analyzeFilm() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      let body;
      if (isVideo(media.url)) {
        const base64_frame = await extractVideoFrame(media.url);
        body = { base64_frame, title: media.title, description: media.description };
      } else {
        body = { media_url: media.url, title: media.title, description: media.description };
      }
      const res = await fetch(`${API_BASE}/ai/analyze-film`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Analysis failed'); return; }
      setAnalysis(data.analysis);
    } catch { setError('Analysis failed. Try again.'); }
    setLoading(false);
  }

  function renderAnalysis(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return <h3 key={i} className="text-sm font-black text-white uppercase tracking-wide mt-4 mb-1">{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('• '))
        return <li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{line.slice(2)}</li>;
      if (line.trim() === '') return null;
      return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-xl rounded-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">AI Film Analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{media.title || 'Untitled'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Analyzing film...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>
          ) : (
            <div className="space-y-1">{renderAnalysis(analysis)}</div>
          )}
        </div>
        {!loading && !error && (
          <div className="px-6 py-4 border-t border-gray-700 flex-shrink-0">
            <button onClick={analyzeFilm} className="text-xs text-blue-400 hover:underline">Re-analyze ↺</button>
          </div>
        )}
      </div>
    </div>
  );
}

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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
function heightDisplay(inches) {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export default function PublicPlayerProfilePage() {
  const { userId } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const myRole = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [analyzingMedia, setAnalyzingMedia] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BASE}/athletes/${userId}/public`);
        if (res.status === 404) { setNotFound(true); return; }
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          setMedia(data.media);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🏀</div>
          <h1 className="text-2xl font-black text-white mb-2">Player not found</h1>
          <p className="text-gray-400">This profile doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const fullName = profile.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : 'Unknown Player';
  const initials = (profile.first_name || 'P').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f1a' }}>
      {analyzingMedia && <AnalysisModal media={analyzingMedia} onClose={() => setAnalyzingMedia(null)} />}
      {/* Header bar */}
      <div className="border-b border-gray-800" style={{ backgroundColor: '#1e1e30' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-xl font-black text-white">Athlete Edge</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-400 text-sm">Player Profile</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Profile hero */}
        <div className="rounded-2xl border border-gray-800 p-8 mb-8" style={{ backgroundColor: '#1e1e30' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
              style={{ backgroundColor: '#2563eb' }}
            >
              {profile.photo_url
                ? <img src={profile.photo_url} alt={fullName} className="w-full h-full object-cover" />
                : initials}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-black text-white mb-1">{fullName}</h1>
              {profile.primary_goal && (
                <span
                  className="inline-block text-sm px-3 py-1 rounded-full font-medium mb-3"
                  style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563eb' }}
                >
                  {profile.primary_goal}
                </span>
              )}
              {profile.school_name && (
                <p className="text-gray-400 text-sm">🏫 {profile.school_name}</p>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-center sm:text-right">
              {profile.height_inches && (
                <div>
                  <div className="text-xl font-black text-white">{heightDisplay(profile.height_inches)}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Height</div>
                </div>
              )}
              {profile.weight_lbs && (
                <div>
                  <div className="text-xl font-black text-white">{profile.weight_lbs}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">lbs</div>
                </div>
              )}
              {profile.age && (
                <div>
                  <div className="text-xl font-black text-white">{profile.age}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Age</div>
                </div>
              )}
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Message button — only show to logged-in users who aren't the profile owner */}
          {myUserId && myUserId !== userId && (
            <div className="mt-6 pt-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  const dest = myRole === 'trainer' ? '/trainer/messages' : '/dashboard/messages';
                  router.push(`${dest}?with=${userId}&name=${encodeURIComponent(fullName)}`);
                }}
                className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity text-sm"
                style={{ backgroundColor: '#2563eb' }}
              >
                💬 Send Message
              </button>
            </div>
          )}
        </div>

        {/* Film Room */}
        <div>
          <h2 className="text-xl font-black text-white mb-5">
            Film Room
            <span className="ml-3 text-sm font-normal text-gray-500">{media.length} clip{media.length !== 1 ? 's' : ''}</span>
          </h2>

          {media.length === 0 ? (
            <div className="rounded-xl border border-gray-800 p-12 text-center" style={{ backgroundColor: '#1e1e30' }}>
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-gray-400">No film uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {media.map((m) => {
                const embedUrl = isYouTube(m.url) ? getYouTubeEmbed(m.url) : null;
                const isVideo = isSupabaseVideo(m.url);
                const isImage = isSupabaseImage(m.url);
                return (
                  <div key={m.id} className="rounded-xl border border-gray-800 overflow-hidden hover:border-blue-600 transition-colors" style={{ backgroundColor: '#1e1e30' }}>
                    <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                      {embedUrl ? (
                        <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      ) : isVideo ? (
                        <video src={m.url} controls className="w-full h-full object-contain" />
                      ) : isImage ? (
                        <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                      ) : m.thumbnail_url ? (
                        <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-600">
                          <span className="text-4xl">🎬</span>
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: '#2563eb' }}>Open Link ↗</a>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white text-sm mb-1 truncate">{m.title || 'Untitled'}</h3>
                      {m.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{m.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{new Date(m.created_at).toLocaleDateString()}</span>
                        {(isSupabaseImage(m.url) || isSupabaseVideo(m.url)) && (
                          <button
                            onClick={() => setAnalyzingMedia(m)}
                            className="text-xs px-2.5 py-1 rounded border font-medium hover:opacity-80"
                            style={{ borderColor: '#2563eb', color: '#2563eb' }}
                          >
                            🤖 Analyze
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
