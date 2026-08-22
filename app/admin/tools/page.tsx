'use client';
import { useState, useEffect } from 'react';

const T = {
  navy: '#0F3460', teal: '#00D4AA', tealLight: '#E0FAF5', tealDark: '#00A886',
  bg: '#F0F4FF', surface: '#fff', border: '#E0E6F0', ink: '#1A1A2E',
  inkMuted: '#8892A4', inkMid: '#4A5068', greenDark: '#00875A', greenLight: '#E8F8F0',
  coral: '#FF6B6B', coralLight: '#FFF0F0', amberDark: '#9A6500', amberLight: '#FFF8E0',
  radius: 12, radiusSm: 10,
};

export default function AdminToolsPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [intelReports, setIntelReports] = useState<any[]>([]);

  const [bcSubject, setBcSubject] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcType, setBcType] = useState('announcement');
  const [bcFilter, setBcFilter] = useState('all');
  const [bcSpecific, setBcSpecific] = useState('');
  const [bcSending, setBcSending] = useState(false);
  const [bcResult, setBcResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [bcPreview, setBcPreview] = useState(false);

  const [intelRunning, setIntelRunning] = useState(false);
  const [buildPrompt, setBuildPrompt] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('kw_admin');
    if (saved) { setPassword(saved); setAuthed(true); }
  }, []);

  useEffect(() => { if (authed) fetchData(); }, [authed]);

  const fetchData = async (pw = password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, action: 'tools_data' }),
      });
      const data = await res.json();
      if (!data.error) {
        setBroadcasts(data.broadcasts || []);
        setIntelReports(data.intelReports || []);
        setAuthed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ background: T.surface, borderRadius: T.radius, padding: 40, width: 360, boxShadow: '0 4px 24px rgba(15,52,96,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Keywise Admin Tools</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            placeholder="Password"
            style={{ width: '100%', padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 14, margin: '16px 0 12px', outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={() => fetchData()} disabled={loading}
            style={{ width: '100%', padding: '12px', background: T.navy, color: '#fff', border: 'none', borderRadius: T.radiusSm, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Checking...' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ background: T.navy, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/admin" style={{ color: '#fff', fontSize: 13, textDecoration: 'none', opacity: 0.8 }}>← Dashboard</a>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Admin Tools</span>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* BROADCAST EMAIL */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 14 }}>📢 Broadcast Email</div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, display: 'block', marginBottom: 4 }}>Subject</label>
              <input value={bcSubject} onChange={e => setBcSubject(e.target.value)} placeholder="Email subject line"
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, display: 'block', marginBottom: 4 }}>Recipients</label>
                <select value={bcFilter} onChange={e => setBcFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, outline: 'none' }}>
                  <option value="all">All users</option>
                  <option value="pro">Pro subscribers only</option>
                  <option value="trial">Trial/Free users</option>
                  <option value="specific">Specific email</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, display: 'block', marginBottom: 4 }}>Type</label>
                <select value={bcType} onChange={e => setBcType(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, outline: 'none' }}>
                  <option value="announcement">📣 Announcement</option>
                  <option value="feature">🚀 New Feature</option>
                  <option value="bug">🐛 Bug Fix</option>
                  <option value="newsletter">📰 Newsletter</option>
                  <option value="notice">⚠️ Important Notice</option>
                </select>
              </div>
            </div>

            {bcFilter === 'specific' && (
              <div style={{ marginBottom: 12 }}>
                <input value={bcSpecific} onChange={e => setBcSpecific(e.target.value)} placeholder="recipient@example.com"
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, display: 'block', marginBottom: 4 }}>Message</label>
              <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)}
                placeholder="Write your email message here... (line breaks will be converted to HTML)"
                style={{ width: '100%', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            {bcResult && (
              <div style={{ background: bcResult.failed > 0 ? T.amberLight : T.greenLight, border: `1px solid ${bcResult.failed > 0 ? T.amberDark : T.greenDark}33`, borderRadius: T.radiusSm, padding: '10px 14px', marginBottom: 12, fontSize: 13, fontWeight: 600, color: bcResult.failed > 0 ? T.amberDark : T.greenDark }}>
                Sent {bcResult.sent} of {bcResult.total} emails{bcResult.failed > 0 ? ` (${bcResult.failed} failed)` : ''}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setBcPreview(!bcPreview)}
                style={{ padding: '10px 16px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, color: T.navy, cursor: 'pointer' }}>
                {bcPreview ? 'Hide Preview' : '👁 Preview'}
              </button>
              <button onClick={async () => {
                if (!bcSubject || !bcMessage) { alert('Subject and message are required'); return; }
                if (bcFilter === 'specific' && !bcSpecific) { alert('Enter recipient email'); return; }
                if (!confirm(`Send broadcast "${bcSubject}" to ${bcFilter === 'specific' ? bcSpecific : bcFilter + ' users'}?`)) return;
                setBcSending(true);
                setBcResult(null);
                const res = await fetch('/api/admin/broadcast', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password, subject: bcSubject, message: bcMessage, type: bcType, recipient_filter: bcFilter, specific_email: bcSpecific }),
                });
                const data = await res.json();
                setBcSending(false);
                if (data.error) { alert('Error: ' + data.error); }
                else { setBcResult(data); fetchData(); }
              }} disabled={bcSending || !bcSubject || !bcMessage}
                style={{ padding: '10px 20px', background: T.navy, color: '#fff', border: 'none', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !bcSubject || !bcMessage ? 0.5 : 1 }}>
                {bcSending ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>

            {bcPreview && bcSubject && (
              <div style={{ marginTop: 16, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, overflow: 'hidden' }}>
                <div style={{ background: T.navy, padding: '16px 24px' }}>
                  <div style={{ color: T.teal, fontSize: 16, fontWeight: 700 }}>Keywise</div>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginBottom: 12,
                    background: bcType === 'feature' ? T.tealLight : bcType === 'bug' ? T.coralLight : bcType === 'notice' ? T.amberLight : T.bg,
                    color: bcType === 'feature' ? T.tealDark : bcType === 'bug' ? T.coral : bcType === 'notice' ? T.amberDark : T.navy }}>
                    {bcType === 'announcement' ? '📣 Announcement' : bcType === 'feature' ? '🚀 New Feature' : bcType === 'bug' ? '🐛 Bug Fix' : bcType === 'newsletter' ? '📰 Newsletter' : '⚠️ Important Notice'}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 12 }}>{bcSubject}</div>
                  <div style={{ fontSize: 14, color: T.inkMid, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{bcMessage}</div>
                </div>
              </div>
            )}
          </div>

          {broadcasts.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.inkMuted, marginBottom: 8 }}>Sent History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {broadcasts.map((b: any) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{b.subject}</div>
                      <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{new Date(b.created_at).toLocaleDateString()} — {b.recipient_filter} — {b.type}</div>
                    </div>
                    <div style={{ fontSize: 12, color: T.greenDark, fontWeight: 600 }}>
                      {b.sent_count}/{b.recipient_count} sent
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COMPETITIVE INTELLIGENCE */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>Competitive Intelligence</div>
            <button onClick={async () => {
              setIntelRunning(true);
              try {
                const res = await fetch('/api/admin/run-intelligence', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password }),
                });
                const data = await res.json();
                if (data.success) fetchData();
                else alert(data.error || 'Failed');
              } catch { alert('Error running intelligence'); }
              setIntelRunning(false);
            }} disabled={intelRunning}
              style={{ padding: '8px 16px', background: T.navy, color: '#fff', border: 'none', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: intelRunning ? 0.7 : 1 }}>
              {intelRunning ? 'Running...' : 'Run Now'}
            </button>
          </div>

          {intelReports.length === 0 ? (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 24, textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
              No intelligence reports yet. Click "Run Now" to generate.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {intelReports.map((r: any) => (
                <div key={r.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: T.navy }}>{r.date}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(r.urgent?.length || 0) > 0 && <span style={{ background: '#FFF0F0', color: '#CC0000', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{r.urgent.length} urgent</span>}
                      {(r.opportunities?.length || 0) > 0 && <span style={{ background: '#FFF8E0', color: '#9A6500', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{r.opportunities.length} opportunities</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.6 }}>{r.summary}</div>
                  {(r.urgent || []).map((u: any, i: number) => (
                    <div key={i} style={{ background: '#FFF0F0', borderLeft: '3px solid #FF4444', borderRadius: 6, padding: '10px 12px', marginTop: 8, fontSize: 12, color: T.ink, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div><strong>{u.title}</strong>: {u.description}</div>
                      <button onClick={() => setBuildPrompt(`Build this feature for Keywise (keywise.app):\n\nFeature: ${u.title}\nDescription: ${u.description}\nPriority: ${u.priority || 'high'}\nEffort: ${u.effort || 'medium'}\nType: ${u.type || 'defensive'}\n\nContext:\n- Tech stack: Next.js app router, TypeScript, Supabase, Anthropic Claude API, Stripe Connect, Resend, Twilio\n- GitHub: github.com/keywise-app/keywise\n- Live at: keywise.app\n\nRequirements:\n1. Build the complete feature end to end\n2. Add any required Supabase tables (show me the SQL to run)\n3. Make it mobile responsive\n4. Handle errors gracefully\n5. After building, run: git add . && git commit -m "Add: ${u.title}" && git push\n\nBuild it now.`)}
                        style={{ background: T.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Build This
                      </button>
                    </div>
                  ))}
                  {(r.opportunities || []).map((o: any, i: number) => (
                    <div key={i} style={{ background: '#FFF8E0', borderLeft: '3px solid #FFB347', borderRadius: 6, padding: '10px 12px', marginTop: 8, fontSize: 12, color: T.ink, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div><strong>{o.title}</strong>: {o.description}</div>
                      <button onClick={() => setBuildPrompt(`Build this feature for Keywise (keywise.app):\n\nFeature: ${o.title}\nDescription: ${o.description}\nPriority: ${o.priority || 'medium'}\nEffort: ${o.effort || 'medium'}\nSource: ${o.source || ''}\n\nContext:\n- Tech stack: Next.js app router, TypeScript, Supabase, Anthropic Claude API, Stripe Connect, Resend, Twilio\n- GitHub: github.com/keywise-app/keywise\n- Live at: keywise.app\n\nRequirements:\n1. Build the complete feature end to end\n2. Add any required Supabase tables (show me the SQL to run)\n3. Make it mobile responsive\n4. Handle errors gracefully\n5. After building, run: git add . && git commit -m "Add: ${o.title}" && git push\n\nBuild it now.`)}
                        style={{ background: T.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Build This
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {buildPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={() => { setBuildPrompt(null); setPromptCopied(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 640, width: '100%', maxHeight: '85vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Claude Code Prompt</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>Copy this prompt and paste it into Claude Code in your terminal.</div>
            <textarea readOnly value={buildPrompt}
              style={{ width: '100%', height: 280, padding: 14, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, fontFamily: 'monospace', color: T.ink, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, background: T.bg }}
              onFocus={e => e.target.select()} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { navigator.clipboard.writeText(buildPrompt); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }}
                style={{ flex: 1, background: T.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {promptCopied ? '✓ Copied!' : 'Copy Prompt'}
              </button>
            </div>
            <button onClick={() => { setBuildPrompt(null); setPromptCopied(false); }}
              style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: '8px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
