import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server is misconfigured');
  }
  return createClient(supabaseUrl, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId') || searchParams.get('image_id');
    const userId = searchParams.get('userId') || searchParams.get('user_id');

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }

    const [{ count, error: countError }, { data: existing, error: likedError }] = await Promise.all([
      admin.from('image_likes').select('*', { count: 'exact', head: true }).eq('image_id', imageId),
      userId ? admin.from('image_likes').select('id').eq('image_id', imageId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null }) as any
    ]);

    if (countError || likedError) {
      const err = countError || likedError;
      console.error('Likes fetch error:', err);
      return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 });
    }

    return NextResponse.json({ likesCount: count || 0, likedByUser: Boolean(existing) });
  } catch (error) {
    console.error('Likes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const { imageId, userId } = await request.json();

    if (!imageId || !userId) {
      return NextResponse.json({ error: 'imageId and userId are required' }, { status: 400 });
    }

    // Toggle like: if exists, delete; else insert
    const { data: existing, error: selectError } = await admin
      .from('image_likes')
      .select('id')
      .eq('image_id', imageId)
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('Like select error:', selectError);
      return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
    }

    let likedByUser = false;
    if (existing) {
      const { error: delError } = await admin
        .from('image_likes')
        .delete()
        .eq('id', existing.id);
      if (delError) {
        console.error('Like delete error:', delError);
        return NextResponse.json({ error: 'Failed to unlike' }, { status: 500 });
      }
      likedByUser = false;
    } else {
      const { error: insError } = await admin
        .from('image_likes')
        .insert([{ image_id: imageId, user_id: userId }]);
      if (insError) {
        console.error('Like insert error:', insError);
        return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
      }
      likedByUser = true;
    }

    const { count, error: countError } = await admin
      .from('image_likes')
      .select('*', { count: 'exact', head: true })
      .eq('image_id', imageId);

    if (countError) {
      console.error('Like count error:', countError);
      return NextResponse.json({ error: 'Failed to get like count' }, { status: 500 });
    }

    return NextResponse.json({ likesCount: count || 0, likedByUser });
  } catch (error) {
    console.error('Likes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}


