import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { imageId, content, userId } = await request.json();

    if (!imageId || !content || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: commentData, error } = await supabase
      .from('image_comments')
      .insert([
        {
          image_id: imageId,
          user_id: userId,
          content: content.trim()
        }
      ])
      .select(`
        *,
        user:profiles(name)
      `)
      .single();

    if (error) {
      console.error('Comment insert error:', error);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
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

export async function DELETE(request: NextRequest) {
  try {
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const { error } = await supabase
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


