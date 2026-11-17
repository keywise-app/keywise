// Server-rendered discovery view. Shares positioning and claims with the public landing page.
import type { Metadata } from 'next';
import Link from 'next/link';
import { brand, brandWorkflows, brandSteps, brandFaqs } from '../lib/brand';
export const metadata: Metadata = {
 title: brand.title,
 description: `${brand.description} ${brand.freeLabel}. No credit card required.`,
 alternates: { canonical:'https://keywise.app' },
};
export default function BotLandingPage() {
 return <main style={{fontFamily:'system-ui,sans-serif',maxWidth:900,margin:'0 auto',padding:'40px 24px',color:'#253950',lineHeight:1.7}}>
  <header><Link href="/">{brand.name}</Link><p>{brand.category}</p><h1>{brand.promise}</h1><p>{brand.description}</p><p>{brand.freeLabel} · No credit card required</p><Link href="/?signup=true">{brand.primaryAction} →</Link></header>
  <section><h2>Know what needs you. Then get on with your day.</h2>{brandWorkflows.map(w => <article key={w.number}><h3>{w.title}</h3><p>{w.detail}</p></article>)}</section>
  <section><h2>You don’t have to move everything at once.</h2><ol>{brandSteps.map(s => <li key={s.title}><strong>{s.title}</strong> — {s.detail}</li>)}</ol></section>
  <section><h2>Built from everyday experience</h2><p>Keywise was built by an independent landlord in Southern California, with a focus on everyday property records and tasks.</p><Link href="/about/chris">Meet the founder</Link></section>
  <section><h2>California tools</h2><p>Dedicated California calculators and notice tools sit alongside the property management workspace. Guidance is state-specific and does not replace legal advice.</p><Link href="/tools">Explore California tools</Link></section>
  <section><h2>Start free. Decide what you need.</h2><p>Free: $0 for {brand.freeUnits} unit, no credit card required. Pro: $49/month for additional units and online rent collection. The 14-day Pro trial requires a card. Online rent payments carry a $2 transaction fee.</p><Link href="/pricing">Compare plans, fees and available offers</Link></section>
  <section><h2>Before you start</h2>{brandFaqs.map(f => <div key={f.q}><h3>{f.q}</h3><p>{f.a}</p></div>)}</section>
  <footer><Link href="/tenant-login">Tenant login</Link> · <Link href="/contact">Contact</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></footer>
 </main>;
}
