/**
 * User Profile API Route
 * * Manages the retrieval and modification of user profile information.
 * Provides a GET endpoint to fetch specific public user details via unique ID.
 * Enables users to update their display name and avatar URL through PUT requests.
 * Utilizes Supabase `upsert` functionality to seamlessly handle both profile creation and updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, avatar_url } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prepare the update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...updateData
      })
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
