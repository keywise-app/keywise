// app/bot/page.tsx
// Server-rendered landing page for search engine bots and social crawlers.
// Real users never see this — middleware rewrites only for bot user-agents.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keywise — AI Property Management for Small Landlords',
  description: 'Free property management for 1-2 units. AI lease extraction, online rent collection, document signing. Built for independent landlords.',
  alternates: { canonical: 'https://keywise.app' },
};

export default function BotLandingPage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: '#1A1A2E' }}>
      <header>
        <h1>Keywise — AI Property Management for Small Landlords</h1>
        <p>
          Property management, done in 10 seconds. Upload your lease. AI does the rest.
          Collect rent, sign documents, manage tenants — all in one place. Free for 1 unit.
        </p>
      </header>

      <section>
        <h2>Features</h2>
        <ul>
          <li><strong>AI Lease Extraction</strong> — Drop a PDF. Keywise extracts every term — including late fees, payment dates, and clauses — automatically.</li>
          <li><strong>Online Rent Collection</strong> — Tenants pay online. You get paid faster. Automatic reminders handle the follow-ups.</li>
          <li><strong>Smart Communications</strong> — Late notices, renewals, entry notices — drafted in seconds with AI, ready to send in one click.</li>
          <li><strong>Maintenance Tracking</strong> — Log issues, assign contractors, and track every repair from open to resolved.</li>
          <li><strong>Document Storage</strong> — Leases, insurance certificates, inspection reports — organized, searchable, always accessible.</li>
          <li><strong>Portfolio Overview</strong> — Buildings, units, cash flow, occupancy — see your whole portfolio at a glance.</li>
          <li><strong>Native Document Signing</strong> — Send leases and addenda for e-signature without third-party tools.</li>
          <li><strong>Move-In/Out Inspections</strong> — Room-by-room inspections with photo documentation and digital signatures.</li>
          <li><strong>Fair Market Value Analysis</strong> — AI estimates market rent for each unit based on local comps and property attributes.</li>
        </ul>
      </section>

      <section>
        <h2>How It Works</h2>
        <ol>
          <li><strong>Import your documents</strong> — Drop your existing leases and documents. Keywise reads them and sets everything up — tenant names, rent amounts, lease dates, late fees.</li>
          <li><strong>Invite your tenants</strong> — Send a magic link in one click. Tenants get access to their portal where they can view their lease and pay rent online.</li>
          <li><strong>Manage everything in one place</strong> — Dashboard, communications, maintenance, payments — all connected, all organized, no more scattered apps.</li>
        </ol>
      </section>

      <section>
        <h2>Built by a Landlord, for Landlords</h2>
        <p>
          I own a duplex in Southern California. Spent years juggling spreadsheets, DocuSign, and Venmo.
          Built Keywise to solve my own problem first.
        </p>
        <ul>
          <li>No more $15 per DocuSign link for every lease and addendum</li>
          <li>No more typing the same tenant info into 5 different tools</li>
          <li>No more chasing rent on Venmo every month</li>
        </ul>
        <p>Keywise solves all of this — for free if you have 1-2 units.</p>
      </section>

      <section>
        <h2>Why Landlords Choose Keywise</h2>
        <p>Professional property management tools at a fraction of the cost.</p>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Keywise ($49/mo)</th>
              <th>Buildium ($50+/mo)</th>
              <th>AppFolio ($280+/mo)</th>
              <th>Innago (Free*)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>AI Lease PDF Extraction</td><td>Yes</td><td>No</td><td>No</td><td>No</td></tr>
            <tr><td>AI Smart Actions (proactive)</td><td>Yes</td><td>No</td><td>No</td><td>No</td></tr>
            <tr><td>Free for 1-2 Units</td><td>Yes</td><td>No</td><td>No</td><td>Yes</td></tr>
            <tr><td>Online Rent Collection</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Native Document Signing</td><td>Yes</td><td>No</td><td>No</td><td>No</td></tr>
            <tr><td>Move-In/Out Inspections</td><td>Yes</td><td>Yes</td><td>Yes</td><td>No</td></tr>
            <tr><td>Fair Market Rent AI</td><td>Yes</td><td>No</td><td>No</td><td>No</td></tr>
            <tr><td>Setup Time</td><td>30 seconds</td><td>Hours</td><td>Days</td><td>30 minutes</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Pricing</h2>
        <ul>
          <li><strong>Free</strong> — 1-2 units. AI lease extraction, rent collection, document signing, tenant portal.</li>
          <li><strong>Pro ($49/month)</strong> — Unlimited units. Everything in Free plus maintenance tracking, portfolio analytics, priority support.</li>
        </ul>
        <p>No credit card required. Free for 1 unit forever.</p>
      </section>

      <section>
        <h2>Frequently Asked Questions</h2>
        <dl>
          <dt>Is Keywise really free?</dt>
          <dd>Yes — free forever for landlords with 1-2 units. No credit card required, no trial period.</dd>

          <dt>How does AI lease extraction work?</dt>
          <dd>Upload a PDF of your lease. Our AI reads the document and extracts tenant name, rent amount, lease dates, late fee terms, and more — in seconds.</dd>

          <dt>Can my tenants pay rent through Keywise?</dt>
          <dd>Yes. Tenants get a portal where they can pay rent online via ACH or card. Automatic reminders go out before and after due dates.</dd>

          <dt>Is my data secure?</dt>
          <dd>All data is encrypted at rest and in transit. We use Supabase (built on PostgreSQL) with row-level security. Your data is never shared or sold.</dd>

          <dt>What if I have more than 2 units?</dt>
          <dd>The Pro plan at $49/month covers unlimited units with all features included.</dd>
        </dl>
      </section>

      <footer style={{ marginTop: 60, paddingTop: 20, borderTop: '1px solid #E0E6F0', fontSize: 14, color: '#8892A4' }}>
        <p>&copy; 2026 Keywise. AI property management for independent landlords.</p>
        <nav>
          <a href="https://keywise.app">Home</a> |
          <a href="https://keywise.app/blog">Blog</a> |
          <a href="https://keywise.app/contact">Contact</a>
        </nav>
      </footer>
    </main>
  );
}
