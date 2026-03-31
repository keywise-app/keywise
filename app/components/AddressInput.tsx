'use client';
import { useState, useRef } from 'react';
import { T, input } from '../lib/theme';

export default function AddressInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookup = async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setShow(false); return; }
    const res = await fetch(`/api/address-search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const list: string[] = data.suggestions || [];
    console.log('suggestions:', list, 'show:', list.length > 0);
    setSuggestions(list);
    setShow(list.length > 0);
  };

  const rect = inputRef.current?.getBoundingClientRect();

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
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
      {show && suggestions.length > 0 && (
        <div style={{
          position: 'fixed',
          top: (rect?.bottom ?? 0) + 4,
          left: rect?.left ?? 0,
          width: rect?.width ?? 300,
          zIndex: 99999,
          background: 'white',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
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
