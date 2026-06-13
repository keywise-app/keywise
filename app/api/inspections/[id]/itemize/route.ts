import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getDeadline } from '../../../../../lib/compliance/ca/ab2801-itemization';

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
// GET /api/inspections/[id]/itemize
// ---------------------------------------------------------------------------

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  // Get unit_id from inspection
  const { data: inspection } = await supabase
    .from('inspections')
    .select('unit_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: itemization } = await supabase
    .from('deposit_itemizations')
    .select('*')
    .eq('unit_id', inspection.unit_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ itemization: itemization ?? null });
}

// ---------------------------------------------------------------------------
// POST /api/inspections/[id]/itemize — create or update
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const body = await req.json();

  // Get unit_id from inspection
  const { data: inspection } = await supabase
    .from('inspections')
    .select('unit_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const unitId = body.unit_id || inspection.unit_id;
  const deadlineAt = body.move_out_date
    ? getDeadline(body.move_out_date).toISOString()
    : null;

  const row = {
    unit_id: unitId,
    user_id: user.id,
    deposit_amount: body.deposit_amount ?? 0,
    move_out_date: body.move_out_date || null,
    deadline_at: deadlineAt,
    line_items: body.line_items ?? [],
    total_deducted: body.total_deducted ?? 0,
    balance_to_tenant: body.balance_to_tenant ?? 0,
    status: 'draft',
    tenant_email: body.tenant_email || null,
  };

  // Check if one already exists for this unit
  const { data: existing } = await supabase
    .from('deposit_itemizations')
    .select('id')
    .eq('unit_id', unitId)
    .eq('user_id', user.id)
    .limit(1)
    .single();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('deposit_itemizations')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase
      .from('deposit_itemizations')
      .insert(row)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json({ itemization: result });
}

// ---------------------------------------------------------------------------
// PATCH /api/inspections/[id]/itemize — update status
// ---------------------------------------------------------------------------

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const body = await req.json();

  // Get unit_id from inspection
  const { data: inspection } = await supabase
    .from('inspections')
    .select('unit_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, any> = {};
  if (body.status) {
    updates.status = body.status;
    if (body.status === 'sent') {
      updates.sent_at = new Date().toISOString();
      updates.sent_method = 'email';
    }
  }

  const { data, error } = await supabase
    .from('deposit_itemizations')
    .update(updates)
    .eq('unit_id', inspection.unit_id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ itemization: data });
}
