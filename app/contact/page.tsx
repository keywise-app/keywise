'use client';
import { useState } from 'react';
import Link from 'next/link';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: `1.5px solid ${BORDER}`, borderRadius: 10,
  padding: '11px 14px', fontSize: 14, color: N,
  fontFamily: 'inherit', outline: 'none', background: '#fff',
  transition: 'border-color 0.15s',
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, message: form.message }),
      });
      const data = await res.json();
      setStatus(data.success ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: N, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: N, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
              <circle cx="13" cy="16" r="2" fill={TEAL} />
              <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: N, letterSpacing: '-0.3px' }}>keywise</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>← Back to home</Link>
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px 100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
        {/* Left: info */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Get in touch</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 16px', lineHeight: 1.1 }}>Contact Us</h1>
          <p style={{ fontSize: 16, color: INK_MID, lineHeight: 1.7, margin: '0 0 40px' }}>
            Have a question, feedback, or need help? We'd love to hear from you. We typically respond within one business day.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ContactItem icon="✉️" label="General" value="hello@keywise.app" href="mailto:hello@keywise.app" />
            <ContactItem icon="🔒" label="Privacy" value="privacy@keywise.app" href="mailto:privacy@keywise.app" />
            <ContactItem icon="⚖️" label="Legal" value="legal@keywise.app" href="mailto:legal@keywise.app" />
          </div>

          <div style={{ marginTop: 48, paddingTop: 40, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK_MID, marginBottom: 16 }}>Follow us</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <SocialLink label="X / Twitter" href="https://twitter.com/keywiseapp" />
              <SocialLink label="LinkedIn" href="https://linkedin.com/company/keywise" />
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div style={{ background: BG, borderRadius: 20, padding: 36, border: `1px solid ${BORDER}` }}>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: N, margin: '0 0 8px' }}>Message sent!</h2>
              <p style={{ fontSize: 15, color: INK_MID, margin: '0 0 24px' }}>We'll get back to you within one business day.</p>
              <button onClick={() => { setStatus('idle'); setForm({ name: '', email: '', message: '' }); }}
                style={{ background: N, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: N, margin: '0 0 24px', letterSpacing: '-0.3px' }}>Send a message</h2>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Name</label>
                <input style={inputStyle} type="text" placeholder="Your name" value={form.name} onChange={upd('name')} required />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Email</label>
                <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email} onChange={upd('email')} required />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Message</label>
                <textarea style={{ ...inputStyle, height: 140, resize: 'vertical' }} placeholder="How can we help?" value={form.message} onChange={upd('message')} required />
              </div>

              {status === 'error' && (
                <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 16px' }}>Something went wrong. Please email us directly at hello@keywise.app.</p>
              )}

              <button type="submit" disabled={status === 'sending' || !form.name || !form.email || !form.message}
                style={{ width: '100%', background: N, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: status === 'sending' ? 'default' : 'pointer', fontFamily: 'inherit', opacity: status === 'sending' ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                {status === 'sending' ? 'Sending…' : 'Send Message →'}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ContactItem({ icon, label, value, href }: { icon: string; label: string; value: string; href: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: INK_MID, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <a href={href} style={{ fontSize: 14, color: N, fontWeight: 600, textDecoration: 'none' }}>{value}</a>
      </div>
    </div>
  );
}

function SocialLink({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener"
      style={{ fontSize: 13, color: INK_MID, fontWeight: 500, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 14px', textDecoration: 'none' }}>
      {label}
    </a>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #E0E6F0', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
      <span style={{ fontSize: 13, color: '#8892A4' }}>© {new Date().getFullYear()} Keywise. All rights reserved.</span>
      <div style={{ display: 'flex', gap: 24 }}>
        <Link href="/privacy" style={{ fontSize: 13, color: '#8892A4', textDecoration: 'none' }}>Privacy</Link>
        <Link href="/terms" style={{ fontSize: 13, color: '#8892A4', textDecoration: 'none' }}>Terms</Link>
        <Link href="/contact" style={{ fontSize: 13, color: '#8892A4', textDecoration: 'none' }}>Contact</Link>
      </div>
    </footer>
  );
}
