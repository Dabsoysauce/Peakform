'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EMPTY_FORM = { title: '', type: 'practice', event_date: '', event_time: '', location: '', opponent: '', notes: '' };

function EventModal({ event, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(event ? {
    title: event.title || '',
    type: event.type || 'practice',
    event_date: event.event_date?.slice(0, 10) || '',
    event_time: event.event_time?.slice(0, 5) || '',
    location: event.location || '',
    opponent: event.opponent || '',
    notes: event.notes || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleShare() {
    if (!event?.id) return;
    setSharing(true);
    try {
      const res = await apiFetch(`/events/${event.id}/share`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to share'); return; }
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch { setError('Failed to share'); }
    setSharing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-black text-white">{event ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-lg border border-red-800 bg-red-900/20 text-red-400 text-sm">{error}</div>}
          {shared && <div className="px-3 py-2 rounded-lg border border-green-800 bg-green-900/20 text-green-400 text-sm">Shared to all team members!</div>}

          {/* Type toggle */}
          <div className="flex gap-2">
            {['practice', 'game'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className="flex-1 py-2.5 rounded-lg font-bold text-sm transition-all capitalize"
                style={form.type === t
                  ? { backgroundColor: t === 'game' ? '#dc2626' : '#2563eb', color: 'white' }
                  : { backgroundColor: '#16213e', color: '#9ca3af', border: '1px solid #374151' }}
              >
                {t === 'game' ? '🏀 Game' : '🏋️ Practice'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              required
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={form.type === 'game' ? 'vs Jefferson High' : 'Monday Morning Practice'}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              style={{ backgroundColor: '#16213e' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
              <input
                required
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e', colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={form.event_time}
                onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e', colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Main Gym, Away — Lincoln High, etc."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              style={{ backgroundColor: '#16213e' }}
            />
          </div>

          {form.type === 'game' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Opponent</label>
              <input
                type="text"
                value={form.opponent}
                onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                placeholder="Lincoln High School"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: '#16213e' }}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {form.type === 'game' ? 'Scouting Report / Game Notes' : 'Practice Itinerary / Drill Notes'}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={form.type === 'game'
                ? 'Their #3 is a strong shooter from the corner. Zone defense in 2nd half. Watch for fast breaks...'
                : '10min warmup → Ball-handling drills (20min) → 3-on-3 halfcourt (30min) → Free throw practice (10min) → Cooldown'}
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              style={{ backgroundColor: '#16213e' }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#2563eb' }}
            >
              {saving ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
            </button>
            {event && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={sharing}
                  className="px-4 py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 text-sm"
                  style={{ backgroundColor: '#16a34a' }}
                  title="Share to all team members via DM"
                >
                  {sharing ? '...' : '📤 Share'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="px-4 py-3 rounded-lg font-bold text-red-400 hover:bg-red-900/30 border border-red-800 text-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TrainerSchedulePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [modalEvent, setModalEvent] = useState(null); // null = closed, {} = new, {...} = edit
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    try {
      const res = await apiFetch('/events');
      if (res.ok) setEvents(await res.json());
    } catch {}
    setLoading(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function eventsOnDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.event_date?.slice(0, 10) === dateStr);
  }

  function handleDayClick(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setModalEvent({ ...EMPTY_FORM, event_date: dateStr });
    setModalOpen(true);
  }

  function handleEventClick(e, ev) {
    e.stopPropagation();
    setModalEvent(ev);
    setModalOpen(true);
  }

  async function handleSave(form) {
    if (modalEvent?.id) {
      const res = await apiFetch(`/events/${modalEvent.id}`, { method: 'PUT', body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const updated = await res.json();
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    } else {
      const res = await apiFetch('/events', { method: 'POST', body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const created = await res.json();
      setEvents(prev => [...prev, created]);
    }
    setModalOpen(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this event?')) return;
    await apiFetch(`/events/${id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalOpen(false);
  }

  // Upcoming events list
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.event_date?.slice(0, 10) >= today).slice(0, 5);

  return (
    <div className="max-w-5xl">
      {modalOpen && (
        <EventModal
          event={modalEvent?.id ? modalEvent : null}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Schedule</h1>
          <p className="text-gray-400 mt-1">Manage practices and games for your team</p>
        </div>
        <button
          onClick={() => { setModalEvent({ ...EMPTY_FORM }); setModalOpen(true); }}
          className="px-5 py-2.5 rounded-xl font-bold text-white hover:opacity-90"
          style={{ backgroundColor: '#2563eb' }}
        >
          + New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <button onClick={prevMonth} className="text-gray-400 hover:text-white text-xl px-2">‹</button>
            <h2 className="text-lg font-black text-white">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="text-gray-400 hover:text-white text-xl px-2">›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-500 uppercase py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="text-gray-400 text-center py-12">Loading...</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="border-r border-b border-gray-800/50 min-h-[80px]" />;
                const dayEvents = eventsOnDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className="border-r border-b border-gray-800/50 min-h-[80px] p-1.5 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'text-white' : 'text-gray-400'}`}
                      style={isToday ? { backgroundColor: '#2563eb' } : {}}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.map(ev => (
                        <div
                          key={ev.id}
                          onClick={(e) => handleEventClick(e, ev)}
                          className="text-xs px-1.5 py-0.5 rounded font-medium truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: ev.type === 'game' ? 'rgba(220,38,38,0.25)' : 'rgba(37,99,235,0.25)',
                            color: ev.type === 'game' ? '#f87171' : '#93c5fd',
                          }}
                        >
                          {ev.event_time?.slice(0, 5) ? `${ev.event_time.slice(0, 5)} ` : ''}{ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="font-black text-white">Upcoming</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {upcoming.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8 px-4">No upcoming events.<br/>Click a date to add one.</p>
              ) : upcoming.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => { setModalEvent(ev); setModalOpen(true); }}
                  className="w-full text-left px-5 py-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: ev.type === 'game' ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)',
                        color: ev.type === 'game' ? '#f87171' : '#93c5fd',
                      }}
                    >
                      {ev.type === 'game' ? '🏀 Game' : '🏋️ Practice'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{ev.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {ev.event_time && ` · ${ev.event_time.slice(0, 5)}`}
                  </p>
                  {ev.location && <p className="text-xs text-gray-500">📍 {ev.location}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 p-4" style={{ backgroundColor: '#1e1e30' }}>
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="text-gray-300 font-semibold">Tip:</span> Click any date on the calendar to create an event. Click an existing event to edit or share it with your team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
