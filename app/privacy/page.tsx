'use client';
import Link from 'next/link';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: INK, minHeight: '100vh' }}>
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

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 100px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 16px', lineHeight: 1.1 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: INK_MUTED, margin: 0 }}>Effective date: April 1, 2026</p>
        </div>

        <div style={{ fontSize: 15, color: INK_MID, lineHeight: 1.8 }}>
          <Section title="1. Information We Collect">
            <p>We collect the following types of information when you use Keywise:</p>
            <ul>
              <li><strong>Account information:</strong> your name, email address, and password when you create an account.</li>
              <li><strong>Property information:</strong> addresses, unit details, lease terms, and rent amounts you enter into the platform.</li>
              <li><strong>Tenant information:</strong> tenant names, email addresses, phone numbers, and lease data you provide.</li>
              <li><strong>Payment data:</strong> bank account and payment method information processed through Stripe. Keywise does not store raw payment card or bank account numbers — these are handled directly by Stripe.</li>
              <li><strong>Usage data:</strong> log data, browser type, IP address, and how you interact with the platform.</li>
              <li><strong>Documents:</strong> lease agreements and other files you upload for processing.</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and improve the Keywise platform</li>
              <li>Process rent payments and send payment notifications</li>
              <li>Send transactional communications (rent reminders, invite links, receipts)</li>
              <li>Analyze lease documents using AI to auto-fill lease data</li>
              <li>Respond to support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>
          </Section>

          <Section title="3. Third-Party Services">
            <p>Keywise integrates with the following third-party providers to deliver the service. Each has its own privacy policy:</p>
            <ul>
              <li><strong>Supabase</strong> — database, authentication, and file storage. <a href="https://supabase.com/privacy" target="_blank" rel="noopener" style={{ color: TEAL_DARK }}>supabase.com/privacy</a></li>
              <li><strong>Stripe</strong> — payment processing and landlord payouts. <a href="https://stripe.com/privacy" target="_blank" rel="noopener" style={{ color: TEAL_DARK }}>stripe.com/privacy</a></li>
              <li><strong>Twilio</strong> — SMS notifications sent to tenants and landlords. <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener" style={{ color: TEAL_DARK }}>twilio.com/legal/privacy</a></li>
              <li><strong>Resend</strong> — transactional email delivery. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener" style={{ color: TEAL_DARK }}>resend.com/legal/privacy-policy</a></li>
              <li><strong>Anthropic</strong> — AI processing of lease documents and communications. Documents you upload may be sent to Anthropic's API for analysis. <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener" style={{ color: TEAL_DARK }}>anthropic.com/privacy</a></li>
            </ul>
          </Section>

          <Section title="4. Data Security">
            <p>We take reasonable measures to protect your data:</p>
            <ul>
              <li>All data is transmitted over HTTPS/TLS</li>
              <li>Passwords are hashed and never stored in plain text</li>
              <li>Access to production databases is restricted and audited</li>
              <li>File uploads are stored in private, access-controlled cloud storage</li>
            </ul>
            <p>No system is 100% secure. If you believe your account has been compromised, contact us immediately at <a href="mailto:privacy@keywise.app" style={{ color: TEAL_DARK }}>privacy@keywise.app</a>.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us. Some data may be retained as required by law or for legitimate business purposes (e.g., payment records).</p>
          </Section>

          <Section title="6. Your Rights">
            <p>Depending on your location, you may have the right to access, correct, or delete your personal data. To exercise any of these rights, contact us at <a href="mailto:privacy@keywise.app" style={{ color: TEAL_DARK }}>privacy@keywise.app</a>.</p>
          </Section>

          <Section title="7. Changes to This Policy">
            <p>We may update this policy from time to time. We'll notify you of material changes via email or an in-app notice. Continued use of Keywise after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="8. Contact">
            <p>Questions about privacy? Contact us at <a href="mailto:privacy@keywise.app" style={{ color: TEAL_DARK }}>privacy@keywise.app</a>.</p>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F3460', margin: '0 0 12px', letterSpacing: '-0.3px' }}>{title}</h2>
      {children}
    </div>
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
