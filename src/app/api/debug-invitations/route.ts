/**
 * Debug Invitations API Route
 * 
 * DEVELOPMENT ONLY - This endpoint should be disabled or restricted in production.
 * 
 * Helps debug and clean up invitation records that might be causing constraint violations.
 * 
 * SECURITY NOTE: Restrict access to this endpoint in production by:
 * 1. Adding environment check: if (process.env.NODE_ENV === 'production') return 403
 * 2. Requiring admin role or special token
 * 3. Removing this endpoint entirely in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Restrict in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is disabled in production' }, { status: 403 });
  }

  try {
    const { tripId, email, action = 'check' } = await request.json();

    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Use service role key for admin operations
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
      .select('id, owner_id, collaborators')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only trip owner can debug invitations' }, { status: 403 });
    }

    if (action === 'check') {
      // Check for existing invitations for this trip
      const { data: invitations, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('trip_id', tripId);

      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        tripId,
        collaborators: trip.collaborators,
        invitations: invitations || [],
        message: `Found ${invitations?.length || 0} invitation records for this trip`
      });
    }

    if (action === 'cleanup') {
      if (!email) {
        return NextResponse.json({ error: 'Email required for cleanup' }, { status: 400 });
      }

      // Delete all invitation records for this trip and email
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('trip_id', tripId)
        .eq('invitee_email', email.toLowerCase());

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Cleaned up invitation records for ${email} on trip ${tripId}` 
      });
    }

    if (action === 'cleanup-all') {
      // Delete all invitation records for this trip (use with caution)
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('trip_id', tripId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Cleaned up all invitation records for trip ${tripId}` 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (e: unknown) {
    console.error('Error debugging invitations:', e);
    return NextResponse.json({ 
      error: (e as Error)?.message || 'Failed to debug invitations' 
    }, { status: 500 });
  }
}
