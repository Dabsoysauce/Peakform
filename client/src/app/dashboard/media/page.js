'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadMediaFile, deleteMediaFile } from '../../lib/supabase';


function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 p-6" style={{ backgroundColor: '#1e1e30' }}>
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

function isSupabaseVideo(url) {
  return url && url.includes('supabase') && (
    url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.avi')
  );
}

function isSupabaseImage(url) {
  return url && url.includes('supabase') && (
    url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')
  );
}

function AnalysisModal({ media, onClose }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imagePayload, setImagePayload] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { analyzeFilm(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, analysis]);

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
        } catch { reject(new Error('Canvas extraction failed')); }
      };
      video.onerror = () => reject(new Error('Video load failed'));
      video.load();
    });
  }

  async function analyzeFilm() {
    setLoading(true);
    setError('');
    setChatHistory([]);
    try {
      const isVideo = isSupabaseVideo(media.url);
      const isImage = isSupabaseImage(media.url);
      let body;

      if (isVideo) {
        try {
          const base64_frame = await extractVideoFrame(media.url);
          body = { base64_frame, title: media.title, description: media.description };
          setImagePayload({ base64_frame });
        } catch {
          setError('Could not extract a frame from this video. Try uploading a screenshot or image instead.');
          setLoading(false);
          return;
        }
      } else if (isImage) {
        body = { media_url: media.url, title: media.title, description: media.description };
        setImagePayload({ media_url: media.url });
      } else {
        setError('AI analysis works on uploaded image and video files. YouTube links are not supported.');
        setLoading(false);
        return;
      }

      const res = await apiFetch('/ai/analyze-film', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Analysis failed'); return; }
      setAnalysis(data.analysis);
    } catch (err) { setError(err?.message || 'Analysis failed. Please try again.'); }
    setLoading(false);
  }

  async function handleChatSend(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const newHistory = [...chatHistory, { role: 'user', content: message }];
    setChatHistory(newHistory);

    try {
      // Build history for the API: initial analysis exchange + subsequent turns
      const historyForApi = [
        { role: 'assistant', content: analysis },
        ...chatHistory,
      ];
      const res = await apiFetch('/ai/film-chat', {
        method: 'POST',
        body: JSON.stringify({ ...imagePayload, history: historyForApi, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatHistory([...newHistory, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        setChatHistory([...newHistory, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setChatHistory([...newHistory, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setChatLoading(false);
  }

  function renderText(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return <h3 key={i} className="text-sm font-black text-white uppercase tracking-wide mt-3 mb-1">{line.replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('• '))
        return <li key={i} className="text-sm text-gray-300 ml-4 leading-relaxed">{line.slice(2)}</li>;
      if (line.trim() === '') return null;
      return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-xl rounded-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">AI Film Analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{media.title || 'Untitled'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Analyzing your film...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-3 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>
          ) : (
            <>
              {/* Initial analysis */}
              <div className="space-y-1">{renderText(analysis)}</div>

              {/* Follow-up chat */}
              {chatHistory.length > 0 && (
                <div className="border-t border-gray-700 pt-4 space-y-4">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={{
                          backgroundColor: msg.role === 'user' ? '#2563eb' : '#16213e',
                          color: 'white',
                          borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                          borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined,
                        }}
                      >
                        {msg.role === 'assistant' ? <div className="space-y-1">{renderText(msg.content)}</div> : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2.5 rounded-2xl text-sm text-gray-400" style={{ backgroundColor: '#16213e' }}>
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {!loading && !error && (
          <form onSubmit={handleChatSend} className="px-4 py-3 border-t border-gray-700 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question about this film..."
              disabled={chatLoading}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
              style={{ backgroundColor: '#16213e' }}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-50 hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: '#2563eb' }}
            >
              Ask
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function MediaPage() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [form, setForm] = useState({ title: '', description: '', url: '', media_type: 'video' });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [analyzingMedia, setAnalyzingMedia] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => { loadMedia(); }, []);

  async function loadMedia() {
    setLoading(true);
    try {
      const res = await apiFetch('/media');
      if (res.ok) setMedia(await res.json());
    } catch {}
    setLoading(false);
  }

  function handleFileSelect(selected) {
    if (!selected) return;
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (selected.size > maxSize) { setFormError('File must be under 100MB'); return; }
    setFile(selected);
    setFormError('');
    const isVideo = selected.type.startsWith('video/');
    setForm((f) => ({ ...f, media_type: isVideo ? 'video' : 'image' }));
    if (!isVideo) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setUploading(true);

    try {
      let url = form.url;
      let media_type = form.media_type;

      if (uploadMode === 'file') {
        if (!file) { setFormError('Please select a file'); setUploading(false); return; }
        setUploadProgress('Uploading...');
        const userId = localStorage.getItem('userId');
        url = await uploadMediaFile(file, userId);
        media_type = file.type.startsWith('video/') ? 'video' : 'image';
      }

      const res = await apiFetch('/media', {
        method: 'POST',
        body: JSON.stringify({ title: form.title, description: form.description, url, media_type }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to save'); setUploading(false); return; }

      setShowModal(false);
      resetModal();
      loadMedia();
    } catch { setFormError('Upload failed. Try again.'); }
    setUploading(false);
    setUploadProgress('');
  }

  function resetModal() {
    setForm({ title: '', description: '', url: '', media_type: 'video' });
    setFile(null);
    setFilePreview(null);
    setFormError('');
    setUploadProgress('');
  }

  async function handleDelete(m) {
    if (!confirm('Delete this media?')) return;
    setDeleteLoading(m.id);
    try {
      await apiFetch(`/media/${m.id}`, { method: 'DELETE' });
      // Also delete from Supabase storage if it's a stored file
      if (m.url && m.url.includes('supabase')) {
        await deleteMediaFile(m.url).catch(() => {});
      }
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
    } catch {}
    setDeleteLoading(null);
  }

  return (
    <div>
      {analyzingMedia && (
        <AnalysisModal media={analyzingMedia} onClose={() => setAnalyzingMedia(null)} />
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Film Room</h1>
          <p className="text-gray-400 mt-1">Upload and organize your game & practice film</p>
        </div>
        <button
          onClick={() => { setShowModal(true); resetModal(); }}
          className="px-5 py-2.5 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#2563eb' }}
        >
          + Add Film
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : media.length === 0 ? (
        <div className="rounded-xl p-12 border border-gray-800 text-center" style={{ backgroundColor: '#1e1e30' }}>
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-xl font-bold text-white mb-2">No film yet</h3>
          <p className="text-gray-400 mb-6">Upload game film, practice clips, or highlight reels.</p>
          <button onClick={() => { setShowModal(true); resetModal(); }} className="px-6 py-3 rounded-lg font-bold text-white hover:opacity-90" style={{ backgroundColor: '#2563eb' }}>
            Upload First Clip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="flex gap-2">
                      {(isSupabaseImage(m.url) || isSupabaseVideo(m.url)) && (
                        <button
                          onClick={() => setAnalyzingMedia(m)}
                          className="text-xs px-2.5 py-1 rounded border font-medium hover:opacity-80"
                          style={{ borderColor: '#2563eb', color: '#2563eb' }}
                        >
                          🤖 Analyze
                        </button>
                      )}
                      <button onClick={() => handleDelete(m)} disabled={deleteLoading === m.id} className="text-xs px-2.5 py-1 rounded border border-red-900 text-red-400 hover:bg-red-900/20 disabled:opacity-50">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Add Film" onClose={() => { setShowModal(false); resetModal(); }}>
          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {['file', 'url'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setUploadMode(mode); resetModal(); }}
                className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
                style={{
                  backgroundColor: uploadMode === mode ? '#2563eb' : '#16213e',
                  color: uploadMode === mode ? 'white' : '#9ca3af',
                  border: `1px solid ${uploadMode === mode ? '#2563eb' : '#374151'}`,
                }}
              >
                {mode === 'file' ? '📁 Upload File' : '🔗 Paste URL'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <div className="px-4 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{formError}</div>}

            {uploadMode === 'file' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">File *</label>
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  style={{ backgroundColor: '#16213e' }}
                >
                  {file ? (
                    <div>
                      {filePreview
                        ? <img src={filePreview} alt="preview" className="w-full h-32 object-contain mb-2 rounded" />
                        : <div className="text-4xl mb-2">🎬</div>
                      }
                      <p className="text-sm text-white font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-2">📁</div>
                      <p className="text-sm text-gray-400">Drop file here or click to browse</p>
                      <p className="text-xs text-gray-600 mt-1">MP4, MOV, JPG, PNG · Max 100MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">URL *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or direct link"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  style={{ backgroundColor: '#16213e' }}
                />
                <p className="text-xs text-gray-500 mt-1">YouTube links embed automatically</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Shooting Form - Practice 3/17"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notes about this clip..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowModal(false); resetModal(); }} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={uploading} className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#2563eb' }}>
                {uploading ? (uploadProgress || 'Uploading...') : 'Add Film'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
