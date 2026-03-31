'use client';
import { useState, useRef } from 'react';
import { T, input } from '../lib/theme';

export default function AddressInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const timerRef = useRef<any>(null);

  const search = async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return; }
    const res = await fetch('/api/address-search?q=' + encodeURIComponent(q));
    const data = await res.json();
    setSuggestions(data.suggestions || []);
  };

  return (
    <div>
      <input
        style={input}
        value={value}
        placeholder={placeholder || 'Start typing an address...'}
        onChange={e => {
          onChange(e.target.value);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => search(e.target.value), 300);
        }}
      />
      {suggestions.length > 0 && (
        <div style={{
          background: 'white',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          marginTop: 4,
          zIndex: 99999,
          position: 'relative',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={e => {
                e.preventDefault();
                onChange(s);
                setSuggestions([]);
              }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: 13,
                color: T.ink,
                borderBottom: i < suggestions.length - 1 ? `1px solid ${T.border}` : 'none',
                background: 'white',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.tealLight)}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
