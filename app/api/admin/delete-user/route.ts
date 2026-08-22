import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteUserCompletely } from '../../../../lib/admin/delete-user';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { password, user_id } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const result = await deleteUserCompletely(supabase, user_id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[admin/delete-user] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
