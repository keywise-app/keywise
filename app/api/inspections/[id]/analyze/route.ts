import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { analyzeInspection, type PhotoPair } from '../../../../../lib/compliance/ca/ab2801-analysis';

export const runtime = 'nodejs';
export const maxDuration = 120;

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
// POST /api/inspections/[id]/analyze
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const inspectionId = params.id;

  // Get the inspection to find unit_id
  const { data: inspection } = await supabase
    .from('inspections')
    .select('id, unit_id, user_id')
    .eq('id', inspectionId)
    .eq('user_id', user.id)
    .single();

  if (!inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
  }

  const unitId = inspection.unit_id;

  // Find move-in and move-out inspections for this unit
  const { data: allInspections } = await supabase
    .from('inspections')
    .select('id, ab2801_type, type, status')
    .eq('unit_id', unitId)
    .eq('status', 'completed')
    .order('inspection_date', { ascending: true });

  if (!allInspections || allInspections.length < 2) {
    return NextResponse.json(
      { error: 'Need both move-in and move-out inspections to compare' },
      { status: 400 },
    );
  }

  const moveInInsp = allInspections.find(
    (i) => i.ab2801_type === 'move_in' || i.type === 'move_in',
  );
  const moveOutInsp = allInspections.find(
    (i) =>
      i.ab2801_type === 'move_out_pre_repair' ||
      i.ab2801_type === 'move_out_post_repair' ||
      i.type === 'move_out',
  );

  if (!moveInInsp || !moveOutInsp) {
    return NextResponse.json(
      { error: 'Could not find both move-in and move-out inspections' },
      { status: 400 },
    );
  }

  // Fetch photos for both inspections
  const { data: allPhotos } = await supabase
    .from('inspection_photos')
    .select('room_name, photo_url, inspection_id')
    .in('inspection_id', [moveInInsp.id, moveOutInsp.id]);

  if (!allPhotos || allPhotos.length === 0) {
    return NextResponse.json({ error: 'No photos found for comparison' }, { status: 400 });
  }

  // Pair photos by room — use first photo from each inspection per room
  const moveInByRoom: Record<string, string> = {};
  const moveOutByRoom: Record<string, string> = {};

  for (const photo of allPhotos) {
    if (photo.inspection_id === moveInInsp.id && !moveInByRoom[photo.room_name]) {
      moveInByRoom[photo.room_name] = photo.photo_url;
    }
    if (photo.inspection_id === moveOutInsp.id && !moveOutByRoom[photo.room_name]) {
      moveOutByRoom[photo.room_name] = photo.photo_url;
    }
  }

  // Build photo pairs (only rooms that have both move-in and move-out)
  const photoPairs: PhotoPair[] = [];
  for (const room of Object.keys(moveOutByRoom)) {
    if (moveInByRoom[room]) {
      photoPairs.push({
        room,
        moveInUrl: moveInByRoom[room],
        moveOutUrl: moveOutByRoom[room],
      });
    }
  }

  if (photoPairs.length === 0) {
    return NextResponse.json(
      { error: 'No matching rooms found between move-in and move-out photos' },
      { status: 400 },
    );
  }

  // Run AI analysis
  const findings = await analyzeInspection(photoPairs);

  // Save to inspection_analyses
  const { error: saveError } = await supabase.from('inspection_analyses').insert({
    unit_id: unitId,
    move_in_inspection_id: moveInInsp.id,
    move_out_inspection_id: moveOutInsp.id,
    ai_findings: findings,
    cost_usd: photoPairs.length * 0.05, // Rough estimate for tracking
    generated_at: new Date().toISOString(),
  });

  if (saveError) {
    console.error('[analyze] Failed to save analysis:', saveError.message);
    // Still return findings even if save fails
  }

  return NextResponse.json({ findings, roomsAnalyzed: photoPairs.length });
}
