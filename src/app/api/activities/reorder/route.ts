/**
 * Reorder Activities API Route
 * * Handles the batch updating of activity positions, schedules, and time periods.
 * Processes concurrent updates for multiple activities to support drag-and-drop reordering.
 * Updates key scheduling fields including order index, day number, and optional time periods.
 * Utilizes Supabase admin privileges to execute multiple database updates efficiently in parallel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get the Supabase admin client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server is misconfigured');
  }
  return createClient(supabaseUrl, serviceKey);
}

// PUT - Reorder activities
export async function PUT(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const body = await request.json();
    const { activities } = body as { 
      activities: Array<{ id: string; order_index: number; day_number: number; time_period?: string }> 
    };

    // Check if the activities array is valid
    if (!Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json({ error: 'activities array is required' }, { status: 400 });
    }

    // Update each activity's order_index, day_number, and time_period
    const updatePromises = activities.map(activity => {
      const updateData: { order_index: number; day_number: number; updated_at: string; time_period?: string } = {
        order_index: activity.order_index,
        day_number: activity.day_number,
        updated_at: new Date().toISOString()
      };
      
      // Only update time_period if it's provided
      if (activity.time_period) {
        updateData.time_period = activity.time_period;
      }
      
      return admin
        .from('activities')
        .update(updateData)
        .eq('id', activity.id);
    });

    const results = await Promise.all(updatePromises);
    
    // Check if any updates failed
    const failedUpdates = results.filter(result => result.error);
    if (failedUpdates.length > 0) {
      console.error('Some activity updates failed:', failedUpdates);
      return NextResponse.json({ error: 'Failed to update some activities' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedCount: activities.length });
  } catch (error) {
    console.error('Reorder activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// OPTIONS - Return the allowed methods
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
