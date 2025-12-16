/**
 * Image Comments API Route
 * * Manages the retrieval, creation, and deletion of user comments attached to specific images.
 * Utilizes the Supabase Service Role client to securely perform database operations.
 * Provides a GET endpoint to fetch chronological discussion threads for a given image ID.
 * Includes POST and DELETE methods to handle user interactions and content moderation.
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

// GET - Fetch comments
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId') || searchParams.get('image_id');

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('image_comments')
      .select(`*`)
      .eq('image_id', imageId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Comments fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// POST - Add a new comment
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const { imageId, content, userId } = await request.json();

    if (!imageId || !content || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: commentData, error } = await admin
      .from('image_comments')
      .insert([
        {
          image_id: imageId,
          user_id: userId,
          content: content.trim()
        }
      ])
      .select(`*`)
      .single();

    if (error) {
      console.error('Comment insert error:', error);
      return NextResponse.json({ error: `Failed to add comment: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      comment: commentData,
      message: 'Comment added successfully' 
    });

  } catch (error) {
    console.error('Comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const { error } = await admin
      .from('image_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Comment delete error:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully' 
    });

  } catch (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


