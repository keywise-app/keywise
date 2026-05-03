import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const today = new Date();
  const ninetyDays = new Date(today.getTime() + 90 * 86400000).toISOString().split('T')[0];

  // Find leases expiring in exactly 90 days that haven't been flagged
  const { data: expiring } = await supabase
    .from('leases')
    .select('id, user_id, tenant_name, property, rent, end_date, email')
    .eq('end_date', ninetyDays)
    .eq('archived', false)
    .or('renewal_flagged.is.null,renewal_flagged.eq.false');

  let processed = 0;

  for (const lease of expiring || []) {
    // Get landlord profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', lease.user_id)
      .single();

    if (!profile?.email) continue;

    // Run market analysis
    let analysis: any = {};
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app';
      const res = await fetch(`${baseUrl}/api/market-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: lease.property, current_rent: lease.rent }),
      });
      if (res.ok) analysis = await res.json();
    } catch {}

    // Send renewal reminder email to landlord
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app';
      await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.email,
          subject: `Lease ending in 90 days: ${lease.tenant_name}`,
          from_name: 'Keywise',
          html: `<div style="font-family:Arial;max-width:500px;margin:0 auto"><div style="background:#0F3460;padding:20px 28px;border-radius:12px 12px 0 0"><div style="color:#00D4AA;font-size:20px;font-weight:700">keywise</div></div><div style="background:white;padding:28px;border:1px solid #E0E6F0;border-radius:0 0 12px 12px"><h2 style="color:#0F3460;margin:0 0 12px">Lease Renewal Time</h2><p style="color:#4A5068;line-height:1.6">Hey ${profile.full_name || 'there'}, ${lease.tenant_name}'s lease at <strong>${lease.property}</strong> expires on ${new Date(lease.end_date).toLocaleDateString()}.</p>${analysis.estimated_market_rent ? `<div style="background:#F0F4FF;border-radius:10px;padding:16px;margin:16px 0"><div style="font-weight:700;color:#0F3460;margin-bottom:8px">Market Analysis</div><div style="color:#4A5068;font-size:14px">Current rent: <strong>$${lease.rent}</strong> · Market rate: <strong style="color:#00D4AA">$${analysis.estimated_market_rent}</strong></div><div style="color:#8892A4;font-size:13px;margin-top:6px">${analysis.recommendations || ''}</div></div>` : ''}<a href="https://keywise.app" style="display:inline-block;background:#0F3460;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px">Send Renewal Offer →</a></div></div>`,
        }),
      });
    } catch {}

    // Flag the lease
    await supabase.from('leases').update({
      renewal_flagged: true,
      renewal_flagged_at: new Date().toISOString(),
    }).eq('id', lease.id);

    processed++;
  }

  return NextResponse.json({ success: true, processed });
}
