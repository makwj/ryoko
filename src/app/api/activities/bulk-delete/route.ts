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

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const body = await request.json();
    const { activityIds } = body as { activityIds: string[] };

    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return NextResponse.json({ error: 'activityIds array is required' }, { status: 400 });
    }

    const { error } = await admin
      .from('activities')
      .delete()
      .in('id', activityIds);

    if (error) {
      console.error('Bulk delete activities error:', error);
      return NextResponse.json({ error: 'Failed to delete activities' }, { status: 500 });
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
