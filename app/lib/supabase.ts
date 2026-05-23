import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient syncs auth session to cookies automatically,
// so the server-side createServerClient can read the same session.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);