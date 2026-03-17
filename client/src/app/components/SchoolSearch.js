'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';

export default function SchoolSearch({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Sync external value
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/schools?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(data.length > 0);
        }
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(school) {
    setQuery(school.name);
    onChange(school.name);
    setOpen(false);
    setResults([]);
  }

  function handleChange(e) {
    setQuery(e.target.value);
    if (!e.target.value) onChange('');
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search for your school..."
          className="w-full px-4 py-2.5 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          style={{ backgroundColor: '#16213e' }}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Searching...</div>
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(''); onChange(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border border-gray-700 overflow-hidden shadow-xl"
          style={{ backgroundColor: '#1e1e30' }}
        >
          {results.map((school, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(school)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-gray-800 last:border-0"
            >
              <p className="text-sm font-medium text-white">{school.name}</p>
              <p className="text-xs text-gray-500">{school.city}, {school.state}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
