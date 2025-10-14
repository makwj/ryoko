import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/send-invitations
export async function POST(request: NextRequest) {
  try {
    const { tripId, tripTitle, invites } = await request.json();

    if (!tripId || !Array.isArray(invites)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Use anon key with end-user bearer so RLS applies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership aligns with insert RLS
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('id, owner_id')
      .eq('id', tripId)
      .single();
    if (tripErr || !trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    if (trip.owner_id !== user.id) return NextResponse.json({ error: 'Only owner can invite' }, { status: 403 });

    const rows = invites
      .map((i: any) => (typeof i === 'string' ? { email: i } : i))
      .filter((i: any) => i && i.email)
      .map((i: any) => ({
        trip_id: tripId,
        inviter_id: user.id,
        invitee_email: String(i.email).toLowerCase(),
        invitee_name: i.name || null,
        status: 'pending'
      }));

    if (rows.length === 0) return NextResponse.json({ error: 'No valid invites' }, { status: 400 });

    const { error } = await supabase.from('invitations').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ sentCount: rows.length, tripId, tripTitle: tripTitle || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to send invitations' }, { status: 500 });
  }
}

// Optional explicit 405 for non-POSTs
export function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
