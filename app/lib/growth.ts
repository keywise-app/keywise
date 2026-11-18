// Fixed vocabulary only. No user IDs, lease fields, URLs or free-form campaigns.
export const growthEvents = ['signup_cta_clicked','signup_link_requested','signup_link_sent','demo_viewed','pricing_viewed','workspace_opened','import_opened','import_resumed','import_reviewed','import_saved'] as const;
export const growthSources = ['direct','landlord-community','agent-referral','founder-network'] as const;
export function acquisitionSource(value: string | null): typeof growthSources[number] {
  return growthSources.includes(value as typeof growthSources[number]) ? value as typeof growthSources[number] : 'direct';
}
export function currentAcquisitionSource() {
  try { return acquisitionSource(sessionStorage.getItem('kw_acquisition_v1')); } catch { return 'direct' as const; }
}
export function captureAcquisition() {
  try {
    const value = new URLSearchParams(window.location.search).get('source');
    if (value && acquisitionSource(value) !== 'direct') sessionStorage.setItem('kw_acquisition_v1', value);
  } catch { /* Analytics must not interrupt setup. */ }
}
export function trackGrowth(event: string, placement: string) {
  if (typeof window === 'undefined' || !growthEvents.includes(event as typeof growthEvents[number])) return;
  try {
    if (navigator.doNotTrack === '1') return;
    const source = currentAcquisitionSource();
    // Aggregate interactions only; repeat events are not unique people or conversions.
    void fetch('/api/growth-events', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,source}),keepalive:true}).catch(()=>{});
    window.gtag?.('event',event,{placement,acquisition_source:source,brand_version:'occupied-rental-v2'});
  } catch { /* Disabled storage or analytics never blocks the product. */ }
}

export async function trackWorkspaceVisit(token:string) {
  try {
    if(navigator.doNotTrack==='1')return false;
    captureAcquisition();
    const source=currentAcquisitionSource();
    const response=await fetch('/api/workspace/visit',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({source})});
    return response.ok;
  } catch { return false; /* Analytics never interrupts the workspace. */ }
}
