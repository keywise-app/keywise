import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Move-In Inspection Checklist for Landlords (Free Download) | Keywise',
  description: 'A complete room-by-room move-in inspection checklist for landlords. Protect your security deposit and document property condition.',
  alternates: { canonical: 'https://keywise.app/blog/move-in-inspection-checklist' },
};

const N = '#0F3460';
const TEAL = '#00D4AA';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function Page() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: INK, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

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
        <Link href="/blog" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>← All articles</Link>
      </nav>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', lineHeight: 1.7 }}>
        <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Inspections · April 2026</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          Move-In Inspection Checklist for Landlords (Free Download)
        </h1>
        <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
          A thorough move-in inspection is the single best thing you can do to protect both yourself and your tenant. It establishes the baseline condition of the property, documents what was already broken, and prevents the dreaded security deposit dispute when the tenant moves out.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Why move-in inspections matter</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Without a documented move-in inspection, you have no defensible record of what the property looked like before the tenant lived in it. If a wall has a hole when they leave, did the tenant make it? Or was it there when they moved in? A simple checklist with photos answers that question definitively.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Most security deposit disputes can be avoided entirely by doing a proper inspection on day one. Both you and your tenant should walk through the property together, document everything, and sign off on the final checklist. That signed document is gold if a disagreement ever arises.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>The complete room-by-room checklist</h2>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>Living Room</h3>
        <ul style={{ fontSize: 15, color: INK_MID, paddingLeft: 24, marginBottom: 16 }}>
          <li>Walls: scuffs, holes, paint condition</li>
          <li>Floors: scratches, stains, carpet condition</li>
          <li>Windows: cracks, screens, locks operating</li>
          <li>Light fixtures and switches working</li>
          <li>Outlets functional (test with phone charger)</li>
          <li>Smoke detector installed and working</li>
          <li>HVAC vents clean and unobstructed</li>
        </ul>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>Kitchen</h3>
        <ul style={{ fontSize: 15, color: INK_MID, paddingLeft: 24, marginBottom: 16 }}>
          <li>Refrigerator: clean, cold, ice maker working, shelves intact</li>
          <li>Stove/oven: all burners and oven heating, knobs present</li>
          <li>Dishwasher: runs through a cycle, no leaks</li>
          <li>Microwave: working, interior clean</li>
          <li>Sink: faucet, sprayer, drain, garbage disposal</li>
          <li>Cabinet doors and drawers — all open/close properly</li>
          <li>Countertops: chips, cracks, burns</li>
          <li>Floors: condition, no soft spots near sink</li>
        </ul>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>Bedrooms</h3>
        <ul style={{ fontSize: 15, color: INK_MID, paddingLeft: 24, marginBottom: 16 }}>
          <li>Walls and ceiling condition</li>
          <li>Carpet/flooring stains or tears</li>
          <li>Closet doors operate, shelves intact</li>
          <li>Windows open, lock, screens present</li>
          <li>Window treatments (blinds/curtains) in good condition</li>
          <li>Smoke detector in each bedroom</li>
        </ul>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>Bathrooms</h3>
        <ul style={{ fontSize: 15, color: INK_MID, paddingLeft: 24, marginBottom: 16 }}>
          <li>Toilet flushes properly, no leaks at base</li>
          <li>Sink faucet hot/cold, drain working</li>
          <li>Tub/shower: hot water, drain, no caulk damage</li>
          <li>Tile and grout condition</li>
          <li>Exhaust fan operating</li>
          <li>Mirror, towel bars, toilet paper holder secure</li>
          <li>Floor near toilet/tub for water damage</li>
        </ul>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>Exterior</h3>
        <ul style={{ fontSize: 15, color: INK_MID, paddingLeft: 24, marginBottom: 16 }}>
          <li>Front door, deadbolt, peephole</li>
          <li>Back door and any sliders</li>
          <li>Outdoor lighting functional</li>
          <li>Lawn/landscaping condition</li>
          <li>Driveway and walkways</li>
          <li>Garage door operates, opener works</li>
          <li>Mailbox accessible</li>
        </ul>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>Tips for a great inspection</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Take photos of everything.</strong> Even items in perfect condition. Photos are worth more than written notes when it's time to compare against move-out condition. Time-stamp them.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Walk through with the tenant.</strong> Don't do the inspection alone, then hand them a sheet. Walk through together so they can see what you're noting and add anything you missed.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          <strong>Get a signature.</strong> Both parties sign and date the completed checklist. Each gets a copy. If it ever comes to a dispute, this signed document is the strongest evidence you can have.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>How Keywise makes inspections easier</h2>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          Paper checklists work, but they get lost, photos get separated from the document, and signatures are a hassle. Keywise has a built-in inspection tool that walks you through the property room by room — you tap to mark condition (Excellent/Good/Fair/Poor), add notes, and snap photos with your phone, all stored in one place.
        </p>
        <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>
          When you're done, Keywise generates a professional inspection report and sends it to your tenant for digital signature. Both parties get a signed PDF, and the entire record lives in the tenant's file — ready to compare against the move-out inspection a year or two later.
        </p>

        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Run inspections in minutes, not hours</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Keywise's mobile inspection tool: room by room, photos, notes, and digital signatures.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
