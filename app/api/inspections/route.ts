import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function getUser(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    return data.user;
  }

  // Try cookie-based auth
  const cookieStore = await cookies();
  const token =
    cookieStore.get('sb-access-token')?.value ??
    cookieStore.get('supabase-auth-token')?.value;

  if (token) {
    const { data } = await supabase.auth.getUser(token);
    return data.user;
  }

  return null;
}

// ---------------------------------------------------------------------------
// GET /api/inspections?unit_id=xxx
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get('unit_id');

  let query = supabase
    .from('inspections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (unitId) {
    query = query.eq('unit_id', unitId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inspections: data });
}

// ---------------------------------------------------------------------------
// POST /api/inspections
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { unit_id, ab2801_type, inspection_date } = body;

  if (!unit_id) {
    return NextResponse.json({ error: 'unit_id is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Derive the legacy type field for backward compat
  const type = ab2801_type?.startsWith('move_out') ? 'move_out' : 'move_in';

  const { data, error } = await supabase
    .from('inspections')
    .insert({
      user_id: user.id,
      unit_id,
      ab2801_type: ab2801_type || null,
      type,
      status: 'in-progress',
      inspection_date: inspection_date || new Date().toISOString().split('T')[0],
      rooms: [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inspection: data }, { status: 201 });
}
