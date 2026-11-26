'use client';

import { useState } from 'react';

const reminder = `Subject: Rent payment reminder for [property address]

Date: [date]
To: [tenant name]

Hello [tenant name],

Our records show that the rent payment of $[rent amount] for [property address], due on [due date], has not yet been received. If you have already paid, please let me know so I can update my records.

Please use [payment instructions] to make the payment, or contact me at [phone or email] if you have a question or need to discuss the balance.

Thank you,
[landlord or property manager name]`;

export default function ReminderTemplate() {
  const [copyStatus, setCopyStatus] = useState('');

  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(reminder);
      setCopyStatus('Copied. Replace the brackets and check the details before sending.');
    } catch {
      setCopyStatus('Copy was blocked by your browser. You can select the text below and copy it manually.');
    }
  }

  return (
    <div style={{ background: '#F0F4FF', border: '1px solid #E0E6F0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <strong style={{ color: '#0F3460', fontSize: 16 }}>Editable rent reminder</strong>
        <button type="button" onClick={copyReminder} style={{ background: '#0F3460', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          Copy reminder
        </button>
      </div>
      <p role="status" aria-live="polite" style={{ minHeight: 24, margin: '0 0 12px', color: '#4A5068', fontSize: 16 }}>{copyStatus}</p>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text', color: '#1A1A2E', fontFamily: 'Georgia, serif', fontSize: 16, lineHeight: 1.7 }}>{reminder}</pre>
    </div>
  );
}
