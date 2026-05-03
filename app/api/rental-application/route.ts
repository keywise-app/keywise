import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { action, ...payload } = await req.json();

    if (action === 'create_listing') {
      const { user_id, property_address, rent, beds, baths, available_date, description, required_fields } = payload;
      if (!user_id || !property_address) return NextResponse.json({ error: 'user_id and property_address required' }, { status: 400 });

      const { data, error } = await supabase.from('rental_listings').insert({
        user_id,
        property_address,
        rent: rent || 0,
        beds: beds || 0,
        baths: baths || 0,
        available_date: available_date || null,
        description: description || '',
        required_fields: required_fields || ['name', 'email', 'phone', 'current_address', 'employer', 'income', 'move_in_date', 'reason_for_moving'],
        status: 'active',
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ listing: data });
    }

    if (action === 'submit_application') {
      const { listing_id, applicant_data } = payload;
      if (!listing_id || !applicant_data?.name || !applicant_data?.email) {
        return NextResponse.json({ error: 'listing_id, name, and email required' }, { status: 400 });
      }

      // Verify listing exists and is active
      const { data: listing } = await supabase.from('rental_listings').select('id, status, user_id').eq('id', listing_id).single();
      if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      if (listing.status !== 'active') return NextResponse.json({ error: 'This listing is no longer accepting applications' }, { status: 400 });

      const { data, error } = await supabase.from('rental_applications').insert({
        listing_id,
        landlord_id: listing.user_id,
        applicant_name: applicant_data.name,
        applicant_email: applicant_data.email,
        applicant_phone: applicant_data.phone || '',
        applicant_data,
        status: 'new',
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ application: data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Rental application error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
