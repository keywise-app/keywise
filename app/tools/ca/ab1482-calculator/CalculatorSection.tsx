'use client';

import { useState, Suspense } from 'react';
import CalculatorForm from './CalculatorForm';
import TableMode from './TableMode';

const N = '#0F3460';
const TEAL = '#00D4AA';
const BORDER = '#E0E6F0';
const INK_MID = '#4A5068';

export default function CalculatorSection() {
  const [mode, setMode] = useState<'single' | 'multi'>('single');

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', border: `1.5px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <button
            onClick={() => setMode('single')}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'single' ? N : '#fff',
              color: mode === 'single' ? '#fff' : INK_MID,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Single Property
          </button>
          <button
            onClick={() => setMode('multi')}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              border: 'none',
              borderLeft: `1px solid ${BORDER}`,
              cursor: 'pointer',
              background: mode === 'multi' ? N : '#fff',
              color: mode === 'multi' ? '#fff' : INK_MID,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Multiple Properties
          </button>
        </div>
      </div>

      {mode === 'single' ? <Suspense><CalculatorForm /></Suspense> : <TableMode />}
    </div>
  );
}
