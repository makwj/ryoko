import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Server misconfigured');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function ensureAdmin(req: NextRequest) {
  const supabase = await getAdminClient();
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin';
}

export async function GET(req: NextRequest) {
  try {
    const ok = await ensureAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabase = await getAdminClient();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    // Fetch profiles first
    let query = supabase.from('profiles').select('id, name, avatar_url, role, is_banned, created_at');
    if (q) query = query.ilike('name', `%${q}%`);
    const { data: profiles, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const users = profiles || [];
    if (users.length === 0) return NextResponse.json({ users: [] });

    // Enrich with email from auth.users (service role can read auth schema)
    const ids = users.map(u => u.id);
    const { data: authUsers } = await supabase
      .from('auth.users' as any)
      .select('id, email')
      .in('id', ids);
    const idToEmail = new Map<string, string | null>();
    (authUsers || []).forEach((u: any) => {
      idToEmail.set(u.id, u.email);
    });
    
    const merged = users.map(u => {
      return { 
        ...u, 
        email: idToEmail.get(u.id) || null
      };
    });
    return NextResponse.json({ users: merged });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ok = await ensureAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabase = await getAdminClient();
    const { userId, role, is_banned } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (typeof is_banned === 'boolean') updates.is_banned = is_banned;
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed' }, { status: 500 });
  }
}


