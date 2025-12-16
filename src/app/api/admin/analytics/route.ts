/**
 * Admin Analytics API Route
 * * Retrieves high-level system statistics for the administrative dashboard.
 * Executes concurrent database queries to fetch total and daily counts for users and posts.
 * Aggregates data on shared trip guides to track platform content growth.
 * Utilizes the Supabase Service Role client for privileged access to global metrics.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch analytics data
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Create the Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Set the today's date to the beginning of the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Execute concurrent database queries to fetch total and daily counts for users and posts
    const [usersTotal, usersToday, postsTotal, postsToday, guidesTotal] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('trips').select('*', { count: 'exact', head: true }).eq('shared_to_social', true),
    ]);

    // Return the analytics data
    return NextResponse.json({
      usersTotal: usersTotal.count || 0,
      usersToday: usersToday.count || 0,
      postsTotal: postsTotal.count || 0,
      postsToday: postsToday.count || 0,
      guidesTotal: guidesTotal.count || 0,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}


