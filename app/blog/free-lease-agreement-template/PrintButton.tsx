'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: '#F0F4FF',
        border: '1px solid #E0E6F0',
        borderRadius: 8,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 600,
        color: '#4A5068',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      📄 Print / Save PDF
    </button>
  );
}
