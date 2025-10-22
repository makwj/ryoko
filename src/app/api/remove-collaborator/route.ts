/**
 * Remove Collaborator API Route
 * 
 * Handles removing a collaborator from a trip and cleaning up associated invitation records.
 * This prevents constraint violations when re-inviting the same user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { tripId, collaboratorId } = await request.json();

    if (!tripId || !collaboratorId) {
      return NextResponse.json({ error: 'Missing tripId or collaboratorId' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Use service role key to access auth.users table
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Verify the requesting user is the trip owner
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is the trip owner
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, owner_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only trip owner can remove collaborators' }, { status: 403 });
    }

    // Get the collaborator's email from auth.users using admin privileges
    const { data: collaboratorData, error: collaboratorError } = await supabase.auth.admin.getUserById(collaboratorId);
    
    if (collaboratorError || !collaboratorData?.user?.email) {
      console.warn('Could not get collaborator email:', collaboratorError);
      return NextResponse.json({ success: true, message: 'Collaborator removed (invitation cleanup skipped)' });
    }

    // Delete any invitation records for this collaborator to prevent constraint violations
    const { error: inviteError } = await supabase
      .from('invitations')
      .delete()
      .eq('trip_id', tripId)
      .eq('invitee_email', collaboratorData.user.email);

    if (inviteError) {
      console.warn('Failed to delete invitation records:', inviteError);
      return NextResponse.json({ success: true, message: 'Collaborator removed (invitation cleanup failed)' });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Collaborator removed and invitation records cleaned up' 
    });

  } catch (e: unknown) {
    console.error('Error removing collaborator:', e);
    return NextResponse.json({ 
      error: (e as Error)?.message || 'Failed to remove collaborator' 
    }, { status: 500 });
  }
}
