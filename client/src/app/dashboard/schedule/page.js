'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function EventDetail({ event, onClose }) {
  const dateStr = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: event.type === 'game' ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)',
                color: event.type === 'game' ? '#f87171' : '#93c5fd',
              }}
            >
              {event.type === 'game' ? '🏀 Game' : '🏋️ Practice'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-black text-white">{event.title}</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>📆</span>
              <span>{dateStr}{event.event_time && ` at ${event.event_time.slice(0, 5)}`}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>📍</span><span>{event.location}</span>
              </div>
            )}
            {event.opponent && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>⚔️</span><span>vs {event.opponent}</span>
              </div>
            )}
          </div>
          {event.notes && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                {event.type === 'game' ? 'Scouting Report / Notes' : 'Practice Itinerary'}
              </h3>
              <div
                className="rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                style={{ backgroundColor: '#16213e' }}
              >
                {event.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlayerSchedulePage() {
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/teams');
        if (res.ok) {
          const teamsData = await res.json();
          setTeams(teamsData);
          // Load events from all coaches
          const allEvents = [];
          for (const team of teamsData) {
            try {
              const evRes = await apiFetch(`/events/trainer/${team.trainer_id}`);
              if (evRes.ok) {
                const evData = await evRes.json();
                allEvents.push(...evData.map(e => ({ ...e, team_name: team.name })));
              }
            } catch {}
          }
          // Deduplicate by id
          const seen = new Set();
          setEvents(allEvents.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }));
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function eventsOnDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.event_date?.slice(0, 10) === dateStr);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.event_date?.slice(0, 10) >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6);

  if (loading) return <div className="text-gray-400 text-center py-12">Loading schedule...</div>;

  if (teams.length === 0) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Schedule</h1>
        </div>
        <div className="rounded-xl border border-gray-800 p-12 text-center" style={{ backgroundColor: '#1e1e30' }}>
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-lg font-bold text-white mb-2">No team yet</h3>
          <p className="text-gray-400 mb-4">Join a team to see your coach's schedule.</p>
          <a href="/dashboard/team" className="text-blue-400 hover:underline text-sm">Join a team →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {selectedEvent && (
        <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Schedule</h1>
        <p className="text-gray-400 mt-1">Upcoming practices and games from your coach</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <button onClick={prevMonth} className="text-gray-400 hover:text-white text-xl px-2">‹</button>
            <h2 className="text-lg font-black text-white">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="text-gray-400 hover:text-white text-xl px-2">›</button>
          </div>
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-500 uppercase py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="border-r border-b border-gray-800/50 min-h-[80px]" />;
              const dayEvents = eventsOnDay(day);
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              return (
                <div key={day} className="border-r border-b border-gray-800/50 min-h-[80px] p-1.5">
                  <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'text-white' : 'text-gray-400'}`}
                    style={isToday ? { backgroundColor: '#2563eb' } : {}}
                  >
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
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
        </div>

        {/* Upcoming */}
        <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: '#1e1e30' }}>
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="font-black text-white">Upcoming</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {upcoming.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8 px-4">No upcoming events scheduled.</p>
            ) : upcoming.map(ev => (
              <button
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
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
      </div>
    </div>
  );
}
