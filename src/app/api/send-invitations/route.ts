/**
 * Send Invitations API Route
 * * Manages the distribution of trip collaboration invites to email addresses.
 * Validates requester ownership of the trip using Row Level Security (RLS) policies via Supabase.
 * Pre-cleans existing pending invitations for target emails to prevent unique constraint conflicts.
 * Batch inserts new invitation records with 'pending' status and returns the count of sent invites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST - Send invitations
export async function POST(request: NextRequest) {
  try {
    const { tripId, tripTitle, invites } = await request.json();

    if (!tripId || !Array.isArray(invites)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get the authorization token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });

    // Check if the server is misconfigured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Create the Supabase client using the anonymous key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership aligns with insert RLS policy
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('id, owner_id')
      .eq('id', tripId)
      .single();
    if (tripErr || !trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    if (trip.owner_id !== user.id) return NextResponse.json({ error: 'Only owner can invite' }, { status: 403 });

    // Prepare the rows for insertion
    const rows = invites
      .map((i: string | { email: string; name?: string }) => (typeof i === 'string' ? { email: i } : i))
      .filter((i: { email: string; name?: string }) => i && i.email)
      .map((i: { email: string; name?: string }) => ({
        trip_id: tripId,
        inviter_id: user.id,
        invitee_email: String(i.email).toLowerCase(),
        invitee_name: i.name || null,
        status: 'pending'
      }));

    if (rows.length === 0) return NextResponse.json({ error: 'No valid invites' }, { status: 400 });

    // Clean up any existing invitation records for these emails to prevent constraint violations
    const emailsToClean = rows.map(row => row.invitee_email);
    const { error: cleanupError } = await supabase
      .from('invitations')
      .delete()
      .eq('trip_id', tripId)
      .in('invitee_email', emailsToClean);
    
    if (cleanupError) {
      console.warn('Failed to clean up existing invitations:', cleanupError);
      // Continue anyway - the insert might still work
    }

    const { error } = await supabase.from('invitations').insert(rows);
    if (error) {
      // If it's still a constraint violation, provide a more helpful error message
      if (error.message.includes('duplicate key value violates unique constraint')) {
        return NextResponse.json({ 
          error: 'Some invitations already exist. Please try again or contact support if the issue persists.' 
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ sentCount: rows.length, tripId, tripTitle: tripTitle || null });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed to send invitations' }, { status: 500 });
  }
}

// Optional explicit 405 for non-POSTs
export function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
