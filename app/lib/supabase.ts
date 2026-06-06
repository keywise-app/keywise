import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// These NEXT_PUBLIC_* vars are inlined at build time, so a missing value makes
// `createClient` throw a cryptic "supabaseUrl is required" during `next build`
// (page-data collection) that fails the whole deploy. Surface a clear, actionable
// error instead. The real fix is setting these in the Vercel project env
// (Settings → Environment Variables → Production + Preview).
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'in the Vercel project (Production + Preview). They are inlined at build time.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);