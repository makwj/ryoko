/**
 * Admin Posts API Route
 * * Unified endpoint for retrieving and managing social content (posts and guides).
 * Aggregates both user posts and shared trip guides into a single, chronologically sorted feed.
 * Enriches content with author details and reaction counts (likes) for analytics display.
 * Provides administrative controls to toggle "featured" status and permanently delete posts along with their associated storage assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get the Supabase admin client
async function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Server misconfigured');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Ensure the user is an admin
async function ensureAdmin(req: NextRequest) {
  const supabase = await getAdminClient();
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin';
}

// GET - Fetch posts
export async function GET(req: NextRequest) {
  try {
    const ok = await ensureAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabase = await getAdminClient();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const type = (searchParams.get('type') || 'all').toLowerCase(); // 'post' | 'guide' | 'all'

    const postsPromise = (type === 'post' || type === 'all')
      ? (async () => {
          let query = supabase.from('posts').select('id, author_id, content, created_at, is_featured');
          if (q) query = query.ilike('content', `%${q}%`);
          const { data } = await query.order('created_at', { ascending: false }).limit(200);
          // likes
          const ids = (data || []).map(p => p.id);
          let likesMap = new Map<string, number>();
          if (ids.length > 0) {
            const { data: likeRows } = await supabase.from('post_reactions')
              .select('post_id, type').in('post_id', ids).eq('type', 'like');
            (likeRows || []).forEach(r => likesMap.set(r.post_id, (likesMap.get(r.post_id) || 0) + 1));
          }
          // authors
          const authorIds = Array.from(new Set((data || []).map(p => p.author_id)));
          const { data: authors } = await supabase.from('profiles').select('id, name').in('id', authorIds);
          const authorMap = new Map((authors || []).map(a => [a.id, a.name]));
          return (data || []).map(p => ({
            type: 'post',
            id: p.id,
            author_name: authorMap.get(p.author_id) || 'User',
            created_at: p.created_at,
            excerpt: p.content?.slice(0, 120) || '',
            is_featured: p.is_featured || false,
            total_likes: likesMap.get(p.id) || 0,
          }));
        })()
      : Promise.resolve([]);

    // Fetch guides
    const guidesPromise = (type === 'guide' || type === 'all')
      ? (async () => {
          let query = supabase.from('trips').select('id, owner_id, title, destination, share_caption, created_at, updated_at, is_featured_social').eq('shared_to_social', true).eq('archived', false);
          if (q) query = query.ilike('title', `%${q}%`);
          const { data } = await query.order('updated_at', { ascending: false }).limit(200);
          // likes
          const ids = (data || []).map(t => t.id);
          let likesMap = new Map<string, number>();
          if (ids.length > 0) {
            const { data: likeRows } = await supabase.from('trip_reactions')
              .select('trip_id, type').in('trip_id', ids).eq('type', 'like');
            (likeRows || []).forEach(r => likesMap.set(r.trip_id, (likesMap.get(r.trip_id) || 0) + 1));
          }
          // authors
          const ownerIds = Array.from(new Set((data || []).map(t => t.owner_id)));
          const { data: authors } = await supabase.from('profiles').select('id, name').in('id', ownerIds);
          const authorMap = new Map((authors || []).map(a => [a.id, a.name]));
          return (data || []).map(t => ({
            type: 'guide',
            id: t.id,
            author_name: authorMap.get(t.owner_id) || 'User',
            created_at: t.updated_at || t.created_at,
            excerpt: t.title,
            is_featured: t.is_featured_social || false,
            total_likes: likesMap.get(t.id) || 0,
          }));
        })()
      : Promise.resolve([]);

    // Combine posts and guides
    const [posts, guides] = await Promise.all([postsPromise, guidesPromise]);
    // Sort by created_at
    const combined = [...posts, ...guides].sort((a, b) => new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime());
    return NextResponse.json({ items: combined });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed' }, { status: 500 });
  }
}

// PATCH - Update post featured status
export async function PATCH(req: NextRequest) {
  try {
    const ok = await ensureAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabase = await getAdminClient();
    const { postId, is_featured } = await req.json();
    if (!postId || typeof is_featured !== 'boolean') return NextResponse.json({ error: 'postId and is_featured required' }, { status: 400 });
    const { error } = await supabase.from('posts').update({ is_featured }).eq('id', postId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed' }, { status: 500 });
  }
}

// DELETE - Delete post
export async function DELETE(req: NextRequest) {
  try {
    const ok = await ensureAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabase = await getAdminClient();
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

    // delete storage files for this post
    const { data: images } = await supabase.from('post_images').select('image_path').eq('post_id', postId);
    if (images && images.length > 0) {
      await supabase.storage.from('post-images').remove(images.map(i => i.image_path));
    }
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed' }, { status: 500 });
  }
}


