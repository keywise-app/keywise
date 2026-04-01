import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Delete in dependency order — children before parents
    const tables = [
      'signing_tokens',
      'payments',
      'documents',
      'maintenance',
      'expenses',
      'leases',
      'properties',
      'buildings',
      'profiles',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', user_id);
      if (error) {
        // Log but don't abort — some tables may not have this user's data
        console.error(`[delete-account] Error deleting from ${table}:`, error.message);
      } else {
        console.log(`[delete-account] Deleted from ${table} for user`, user_id);
      }
    }

    // Delete the auth user last
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);
    if (authError) {
      console.error('[delete-account] Auth delete error:', authError.message);
      return NextResponse.json({ error: 'Failed to delete auth user: ' + authError.message }, { status: 500 });
    }

    console.log('[delete-account] Successfully deleted user', user_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-account] Unexpected error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to delete account.' }, { status: 500 });
  }
}
