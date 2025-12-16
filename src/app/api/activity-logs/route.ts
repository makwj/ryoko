/**
 * Activity Logs API Route
 * * Manages the retrieval, creation, and deletion of trip activity audit logs.
 * Provides a paginated GET endpoint to fetch history with resolved user profiles.
 * Allows recording new system events via POST with detailed metadata support.
 * Includes a secure DELETE endpoint restricted to trip owners for clearing activity history.
 */

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

// GET - Fetch activity logs for a trip
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Fetch activity logs
    const { data: logs, error } = await admin
      .from('activity_logs')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching activity logs:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to fetch activity logs',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    // Fetch user names for the logs
    const userIds = [...new Set((logs || []).map(log => log.user_id))];
    let userNames: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      
      userNames = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile.name || 'Unknown';
        return acc;
      }, {} as Record<string, string>);
    }

    // Add user names to logs
    const logsWithNames = (logs || []).map(log => ({
      ...log,
      user: {
        name: userNames[log.user_id] || 'Unknown'
      }
    }));

    return NextResponse.json({ logs: logsWithNames });
  } catch (error) {
    console.error('Activity logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Log a new activity
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const body = await request.json();
    const { 
      tripId, 
      userId, 
      activityType, 
      title, 
      description, 
      metadata 
    } = body;

    if (!tripId || !userId || !activityType || !title) {
      return NextResponse.json({ 
        error: 'tripId, userId, activityType, and title are required' 
      }, { status: 400 });
    }

    // Insert the activity log
    const { data: log, error } = await admin
      .from('activity_logs')
      .insert({
        trip_id: tripId,
        user_id: userId,
        activity_type: activityType,
        title,
        description,
        metadata
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to log activity',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Log activity API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Clear all activity logs for a trip (owner only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const userId = searchParams.get('userId');

    if (!tripId || !userId) {
      return NextResponse.json({ 
        error: 'tripId and userId are required' 
      }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify user is the trip owner
    const { data: trip, error: tripError } = await admin
      .from('trips')
      .select('owner_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.owner_id !== userId) {
      return NextResponse.json({ error: 'Only trip owner can clear activity history' }, { status: 403 });
    }

    // Delete all activity logs for the trip
    const { error: deleteError } = await admin
      .from('activity_logs')
      .delete()
      .eq('trip_id', tripId);

    if (deleteError) {
      console.error('Error clearing activity logs:', deleteError);
      return NextResponse.json({ error: 'Failed to clear activity history' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear activity logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
