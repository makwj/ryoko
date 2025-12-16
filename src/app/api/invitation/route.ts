/**
 * Invitation API Route
 * 
 * Handles trip invitation responses (accept/decline) from invited users.
 * Validates user authentication and updates invitation status in the database.
 * Manages collaborator addition to trips when invitations are accepted.
 * Provides secure invitation handling with proper authorization checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST - Handle invitation response
export async function POST(request: NextRequest) {
  try {
    const { invitationId, action } = await request.json();

    // Get the authorization token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    // Check if the token is missing
    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    // Check if the server is misconfigured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Create the Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    // Check if the invitation is not found
    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Handle the invitation acceptance
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
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed to process invitation' }, { status: 500 });
  }
}


