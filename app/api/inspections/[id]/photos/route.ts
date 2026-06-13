import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 30;

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
// GET /api/inspections/[id]/photos
// ---------------------------------------------------------------------------

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const inspectionId = params.id;

  // Verify ownership
  const { data: inspection } = await supabase
    .from('inspections')
    .select('id')
    .eq('id', inspectionId)
    .eq('user_id', user.id)
    .single();

  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: photos, error } = await supabase
    .from('inspection_photos')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ photos });
}

// ---------------------------------------------------------------------------
// POST /api/inspections/[id]/photos — upload photo
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const inspectionId = params.id;

  // Verify ownership
  const { data: inspection } = await supabase
    .from('inspections')
    .select('id')
    .eq('id', inspectionId)
    .eq('user_id', user.id)
    .single();

  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const roomName = formData.get('room_name') as string;
  const caption = (formData.get('caption') as string) || '';

  if (!file || !roomName) {
    return NextResponse.json({ error: 'file and room_name are required' }, { status: 400 });
  }

  // Determine sort_order
  const { count } = await supabase
    .from('inspection_photos')
    .select('id', { count: 'exact', head: true })
    .eq('inspection_id', inspectionId)
    .eq('room_name', roomName);

  const sortOrder = (count ?? 0) + 1;

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${inspectionId}/${roomName.replace(/[^a-zA-Z0-9]/g, '_')}_${sortOrder}_${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(`inspections/${fileName}`, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(`inspections/${fileName}`);

  const photoUrl = urlData.publicUrl;
  const photoPath = `inspections/${fileName}`;

  // Insert row
  const { data: photo, error: insertError } = await supabase
    .from('inspection_photos')
    .insert({
      inspection_id: inspectionId,
      room_name: roomName,
      photo_path: photoPath,
      photo_url: photoUrl,
      caption,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ photo }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/inspections/[id]/photos?photoId=xxx
// ---------------------------------------------------------------------------

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const inspectionId = params.id;
  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get('photoId');

  if (!photoId) {
    return NextResponse.json({ error: 'photoId is required' }, { status: 400 });
  }

  // Verify ownership
  const { data: inspection } = await supabase
    .from('inspections')
    .select('id')
    .eq('id', inspectionId)
    .eq('user_id', user.id)
    .single();

  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get photo path for storage cleanup
  const { data: photo } = await supabase
    .from('inspection_photos')
    .select('photo_path')
    .eq('id', photoId)
    .eq('inspection_id', inspectionId)
    .single();

  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  // Delete from storage
  if (photo.photo_path) {
    await supabase.storage.from('documents').remove([photo.photo_path]);
  }

  // Delete row
  const { error } = await supabase
    .from('inspection_photos')
    .delete()
    .eq('id', photoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
