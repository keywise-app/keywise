import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const required = ['unit_id', 'notice_type', 'at_fault', 'notice_text', 'notice_days'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return Response.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('eviction_notices')
      .insert({
        user_id: user.id,
        unit_id: body.unit_id,
        notice_type: body.notice_type,
        at_fault: body.at_fault,
        situation_inputs: body.situation_inputs || {},
        notice_days: body.notice_days,
        can_cure: body.can_cure ?? false,
        cure_terms: body.cure_terms || null,
        relocation_amount: body.relocation_amount || null,
        notice_text: body.notice_text,
        defect_checks: body.defect_checks || {},
        retaliation_flag: body.retaliation_flag ?? false,
        served_at: body.served_at || null,
        served_method: body.served_method || null,
        expires_at: body.expires_at || null,
        status: body.status || 'draft',
        pdf_path: null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return Response.json({ error: 'Failed to save notice' }, { status: 500 });
    }

    return Response.json({ id: data.id });
  } catch (err) {
    console.error('Save notice error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
