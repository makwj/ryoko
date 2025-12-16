/**
 * Bulk Delete Activities API Route
 * * Server-side endpoint for removing multiple activities from a trip simultaneously.
 * Utilizes the Supabase Service Role key to perform privileged database deletions.
 * Fetches activity metadata prior to deletion to ensure accurate audit logging.
 * Integrates with ActivityLogger to record the "activities_bulk_deleted" event with details like activity titles and count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ActivityLogger } from '@/lib/activityLogger';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server is misconfigured');
  }
  return createClient(supabaseUrl, serviceKey);
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const body = await request.json();
    const { activityIds, tripId, userId } = body as { 
      activityIds: string[]; 
      tripId?: string; 
      userId?: string; 
    };

    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return NextResponse.json({ error: 'activityIds array is required' }, { status: 400 });
    }

    // Get activity details before deletion for logging
    const { data: activitiesToDelete, error: fetchError } = await admin
      .from('activities')
      .select('id, title, day_number, trip_id')
      .in('id', activityIds);

    if (fetchError) {
      console.error('Error fetching activities for logging:', fetchError);
    }

    const { error } = await admin
      .from('activities')
      .delete()
      .in('id', activityIds);

    if (error) {
      console.error('Bulk delete activities error:', error);
      return NextResponse.json({ error: 'Failed to delete activities' }, { status: 500 });
    }

    // Log the bulk delete activity if we have the required data
    if (tripId && userId && activitiesToDelete && activitiesToDelete.length > 0) {
      try {
        const activityTitles = activitiesToDelete.map(a => a.title).join(', ');
        const dayNumbers = [...new Set(activitiesToDelete.map(a => a.day_number))];
        
        await ActivityLogger.logActivity({
          tripId,
          userId,
          activityType: 'activities_bulk_deleted',
          title: 'Bulk deleted activities',
          description: `Deleted ${activityIds.length} activities: ${activityTitles}`,
          metadata: { 
            activityIds, 
            activityTitles: activitiesToDelete.map(a => a.title),
            dayNumbers,
            count: activityIds.length 
          }
        });
      } catch (logError) {
        console.error('Error logging bulk delete activity:', logError);
        // Don't fail the request if logging fails
      }
    }

    return NextResponse.json({ success: true, deletedCount: activityIds.length });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
