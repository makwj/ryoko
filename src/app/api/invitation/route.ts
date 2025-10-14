import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { invitationId, action } = await request.json();

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (action === 'accept') {
      // Add user as collaborator on trip (by user id)
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('collaborators')
        .eq('id', invitation.trip_id)
        .single();
      if (tripError) return NextResponse.json({ error: tripError.message }, { status: 400 });

      const current = Array.isArray(trip?.collaborators) ? trip.collaborators : [];
      if (!current.includes(user.id)) current.push(user.id);

      const { error: collabError } = await supabase
        .from('trips')
        .update({ collaborators: current })
        .eq('id', invitation.trip_id);
      if (collabError) return NextResponse.json({ error: collabError.message }, { status: 400 });

      // Delete the invitation after successful acceptance to keep the table clean
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

      return NextResponse.json({ success: true, status: 'accepted', deleted: true, message: 'Invitation accepted' });
    }

    if (action === 'decline') {
      // Delete the invitation record on decline to keep the table clean
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
      return NextResponse.json({ success: true, status: 'declined', deleted: true, message: 'Invitation declined' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to process invitation' }, { status: 500 });
  }
}


