import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leaseId = searchParams.get('lease_id');
  if (!leaseId) return NextResponse.json({ error: 'lease_id required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('lease_id', leaseId)
    .order('created_at', { ascending: false });

  // Generate signed URLs for docs with file_path
  const docsWithUrls = await Promise.all((docs || []).map(async (d: any) => {
    if (d.file_path) {
      const { data } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 3600);
      return { ...d, signed_url: data?.signedUrl || '' };
    }
    return { ...d, signed_url: '' };
  }));

  return NextResponse.json({ documents: docsWithUrls });
}
