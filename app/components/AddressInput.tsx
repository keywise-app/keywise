'use client';
import { useState, useRef, useEffect } from 'react';
import { T, input } from '../lib/theme';

export default function AddressInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    console.log('Mapbox token:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.slice(0, 10));
  }, []);

  const lookup = async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setShow(false); return; }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&types=address&country=US&limit=5`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data.features?.map((f: any) => f.place_name) || [];
    setSuggestions(list);
    setShow(list.length > 0);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={input}
        value={value}
        placeholder={placeholder || 'Start typing an address...'}
        onChange={e => {
          onChange(e.target.value);
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => lookup(e.target.value), 300);
        }}
        onBlur={() => setTimeout(() => setShow(false), 200)}
      />
      {show && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: 'white', border: `1px solid ${T.border}`,
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 4,
        }}>
          {suggestions.map((s, i) => (
            <div key={i}
              onMouseDown={() => { onChange(s); setShow(false); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: T.ink,
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
