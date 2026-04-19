import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Keywise',
  description: 'Keywise terms of service for property management software. Usage policies, payment terms, and liability.',
  alternates: { canonical: 'https://keywise.app/terms' },
  openGraph: {
    title: 'Terms of Service | Keywise',
    description: 'Keywise terms of service for property management software. Usage policies, payment terms, and liability.',
    url: 'https://keywise.app/terms',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | Keywise',
    description: 'Keywise terms of service for property management software.',
  },
  robots: { index: true, follow: true },
};

const N = '#0F3460';
const TEAL_DARK = '#00A886';
const BORDER = '#E0E6F0';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const TEAL = '#00D4AA';

export default function TermsPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#1A1A2E', minHeight: '100vh' }}>
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
          <h1 style={{ fontSize: 40, fontWeight: 800, color: N, letterSpacing: '-1px', margin: '0 0 16px', lineHeight: 1.1 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: INK_MUTED, margin: 0 }}>Effective date: April 1, 2026</p>
        </div>

        <div style={{ fontSize: 15, color: INK_MID, lineHeight: 1.8 }}>
          <Section title="1. Service Description">
            <p>Keywise is a property management platform designed for independent landlords. The service includes tools for lease tracking, rent collection, tenant communication, document management, and AI-assisted lease analysis.</p>
            <p>By creating an account, you agree to these Terms of Service. If you do not agree, do not use Keywise.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>You must be at least 18 years old and legally capable of entering into contracts to use Keywise. By using the platform, you represent that you meet these requirements.</p>
          </Section>

          <Section title="3. User Responsibilities">
            <p>You are responsible for:</p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>Ensuring all information you enter (tenant data, lease terms, property details) is accurate</li>
              <li>Complying with all applicable landlord-tenant laws in your jurisdiction</li>
              <li>Obtaining appropriate consent before submitting tenant personal information into the platform</li>
              <li>All actions taken under your account</li>
            </ul>
            <p>You may not use Keywise for any unlawful purpose, to harass tenants, or to violate fair housing laws.</p>
          </Section>

          <Section title="4. Payment Terms">
            <p><strong>Free Plan:</strong> Keywise offers a free tier for up to 2 units with core features including lease tracking, document storage, AI communications, and a tenant portal. No credit card is required.</p>
            <p><strong>Pro Plan:</strong> $19/month, billed monthly. The Pro plan includes unlimited units, online rent collection, payment reminders, maintenance tracking, and priority support.</p>
            <p><strong>Transaction Fee:</strong> A $2 fee applies to each online rent payment processed through Keywise. This fee is charged in addition to the monthly subscription.</p>
            <p><strong>Billing:</strong> Subscriptions renew automatically each month. You may cancel at any time from your account settings. Cancellations take effect at the end of the current billing period — no refunds are issued for partial months.</p>
            <p><strong>Payment Processing:</strong> All payments are processed by Stripe. By using online rent collection, you agree to <a href="https://stripe.com/legal" target="_blank" rel="noopener" style={{ color: TEAL_DARK }}>Stripe's Terms of Service</a>.</p>
          </Section>

          <Section title="5. Intellectual Property">
            <p>Keywise and its content, features, and functionality are owned by Keywise and protected by intellectual property laws. You retain ownership of all data you input into the platform.</p>
            <p>By uploading documents or data, you grant Keywise a limited license to process and display that content solely to provide the service to you.</p>
          </Section>

          <Section title="6. AI Features">
            <p>Keywise uses AI (powered by Anthropic's Claude) to analyze lease documents, draft communications, and surface insights. AI-generated content is provided as-is and may contain errors. You are responsible for reviewing and verifying any AI-generated output before acting on it. Keywise does not provide legal advice.</p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>To the maximum extent permitted by law, Keywise is provided "as is" without warranties of any kind. We do not guarantee uninterrupted, error-free service.</p>
            <p>Keywise shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits or data, arising from your use of the platform, even if advised of the possibility of such damages.</p>
            <p>Our total liability to you for any claim arising from these Terms or the service shall not exceed the greater of (a) $100 or (b) the amount you paid Keywise in the 12 months preceding the claim.</p>
          </Section>

          <Section title="8. Termination">
            <p>We may suspend or terminate your account if you violate these Terms or engage in conduct harmful to other users or the platform. You may terminate your account at any time from your account settings.</p>
          </Section>

          <Section title="9. Governing Law">
            <p>These Terms are governed by the laws of the State of California, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Orange County, California.</p>
          </Section>

          <Section title="10. Changes to These Terms">
            <p>We may update these Terms from time to time. We will provide notice of material changes via email or in-app notification. Continued use of Keywise after changes constitutes acceptance of the updated Terms.</p>
          </Section>

          <Section title="11. Contact">
            <p>Legal questions? Contact us at <a href="mailto:legal@keywise.app" style={{ color: TEAL_DARK }}>legal@keywise.app</a>.</p>
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
