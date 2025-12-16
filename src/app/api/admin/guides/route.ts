/**
 * Admin Guides API Route
 * * Manages the retrieval and feature status of shared trip guides for the administration interface.
 * Implements strict Role-Based Access Control (RBAC) to ensure only authorized admins can access these endpoints.
 * Provides search functionality and detailed data retrieval for guides, including resolving author profiles.
 * Handles patch requests to toggle "featured" visibility for guides on the home page and social feeds.
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

// GET - Fetch guides
export async function GET(req: NextRequest) {
  try {
    const ok = await ensureAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabase = await getAdminClient();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const id = searchParams.get('id');
    if (id) {
      const { data: trip, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      let author: any = null;
      if (trip?.owner_id) {
        const { data: profile } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', trip.owner_id).single();
        author = profile || null;
      }
      return NextResponse.json({ guide: { ...(trip as any), author } });
    }
    let query = supabase.from('trips').select('id, title, destination, owner_id, shared_to_social, is_featured_home, is_featured_social, updated_at, created_at');
    query = query.eq('shared_to_social', true).eq('archived', false);
    if (q) query = query.ilike('title', `%${q}%`);
    const { data, error } = await query.order('updated_at', { ascending: false }).limit(200);
    if (error) throw error;
    // Attach author names
    const ownerIds = Array.from(new Set((data || []).map(t => t.owner_id)));
    const { data: authors } = await supabase.from('profiles').select('id, name').in('id', ownerIds);
    const map = new Map((authors || []).map(a => [a.id, a.name]));
    const rows = (data || []).map(t => ({ ...t, author_name: map.get(t.owner_id) || 'User' }));
    return NextResponse.json({ guides: rows });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed' }, { status: 500 });
  }
}

// PATCH - Update guide featured status
export async function PATCH(req: NextRequest) {
  try {
    const ok = await ensureAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabase = await getAdminClient();
    const { tripId, is_featured_home, is_featured_social } = await req.json();
    if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (typeof is_featured_home === 'boolean') updates.is_featured_home = is_featured_home;
    if (typeof is_featured_social === 'boolean') updates.is_featured_social = is_featured_social;
    const { error } = await supabase.from('trips').update(updates).eq('id', tripId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed' }, { status: 500 });
  }
}


