import Link from 'next/link';
export default function AcquisitionLanding({agents=false}:{agents?:boolean}) {
 const source=agents?'agent-referral':'landlord-community';
 return <main style={{maxWidth:960,margin:'0 auto',padding:'40px 24px 80px',color:'#0F3460',lineHeight:1.6}}>
  <Link href="/" style={{fontWeight:750,fontSize:24,textDecoration:'none'}}>Keywise</Link>
  <p style={{marginTop:48,fontWeight:650}}>{agents?'For agents helping independent landlords':'For landlords with occupied rentals'}</p>
  <h1 style={{fontSize:'clamp(36px,6vw,64px)',lineHeight:1.08,maxWidth:800}}>{agents?'Help your landlord clients stay organized after move-in.':'Your rental is already running. Get it under control.'}</h1>
  <p style={{fontSize:20,maxWidth:720}}>{agents?'Give owners a place to organize their existing lease, rent records, repairs and next steps. They can keep using their current listing and screening services.':'Bring one existing lease into Keywise. Keep rent, repairs and upcoming renewal work connected to the rental.'}</p>
  <Link href={`/?signup=true&source=${source}`} style={{display:'inline-block',padding:'14px 24px',background:'#0F3460',color:'white',borderRadius:10,fontWeight:700}}>Set up my rental →</Link>
  <p>Free for one unit. No credit card required. Invite tenants when you are ready.</p>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:24,margin:'48px 0'}} aria-label="Getting started">
   {[['1. Bring your lease','Upload an existing lease or enter the details manually.'],['2. Review the records','Confirm terms, dates and whether to create rent charges now or later.'],['3. Take the next step','Track rent, follow a repair or prepare a renewal from the connected workspace.']].map(([title,body])=><article key={title} style={{borderTop:'2px solid #0F3460'}}><h2 style={{fontSize:21}}>{title}</h2><p>{body}</p></article>)}
  </section>
  <h2>Start before changing how tenants pay</h2><p>Record rent received elsewhere. Online collection is optional and requires an eligible paid plan and payment account. Creating records does not invite or message a tenant.</p>
  <p><Link href="/pricing">See current plans and payment fees</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/contact">Contact Keywise</Link></p>
 </main>;
}
