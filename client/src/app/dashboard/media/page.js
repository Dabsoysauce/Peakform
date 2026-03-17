'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const defaultForm = { title: '', description: '', url: '', media_type: 'video' };

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

function isYouTube(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

function getYouTubeEmbed(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

export default function MediaPage() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    setLoading(true);
    try {
      const res = await apiFetch('/media');
      if (res.ok) setMedia(await res.json());
    } catch {}
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const res = await apiFetch('/media', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to upload media');
        return;
      }
      setShowModal(false);
      setForm(defaultForm);
      loadMedia();
    } catch {
      setFormError('Network error');
    }
    setFormLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this media?')) return;
    setDeleteLoading(id);
    try {
      await apiFetch(`/media/${id}`, { method: 'DELETE' });
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch {}
    setDeleteLoading(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Form Film</h1>
          <p className="text-gray-400 mt-1">Upload and organize your training videos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#e85d26' }}
        >
          + Add Media
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading media...</div>
      ) : media.length === 0 ? (
        <div
          className="rounded-xl p-12 border border-gray-800 text-center"
          style={{ backgroundColor: '#1e1e30' }}
        >
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-xl font-bold text-white mb-2">No videos yet</h3>
          <p className="text-gray-400 mb-6">Upload your form videos to share with your trainer and track technique.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90"
            style={{ backgroundColor: '#e85d26' }}
          >
            Upload First Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((m) => {
            const embedUrl = isYouTube(m.url) ? getYouTubeEmbed(m.url) : null;
            return (
              <div
                key={m.id}
                className="rounded-xl border border-gray-800 overflow-hidden hover:border-orange-800 transition-colors"
                style={{ backgroundColor: '#1e1e30' }}
              >
                {/* Thumbnail / Embed */}
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : m.thumbnail_url ? (
                    <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-600">
                      <span className="text-4xl">🎬</span>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:underline"
                        style={{ color: '#e85d26' }}
                      >
                        Open Link ↗
                      </a>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-white text-sm mb-1 truncate">{m.title || 'Untitled'}</h3>
                  {m.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{m.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deleteLoading === m.id}
                      className="text-xs px-2.5 py-1 rounded border border-red-900 text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <Modal title="Add Media" onClose={() => { setShowModal(false); setForm(defaultForm); setFormError(''); }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Squat Form Check - 225lbs"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Video URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://youtube.com/watch?v=... or direct link"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              />
              <p className="text-xs text-gray-500 mt-1">YouTube links will be embedded automatically</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notes about this video..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select
                value={form.media_type}
                onChange={(e) => setForm({ ...form, media_type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-orange-500"
                style={{ backgroundColor: '#16213e' }}
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setForm(defaultForm); setFormError(''); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#e85d26' }}
              >
                {formLoading ? 'Uploading...' : 'Add Media'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
