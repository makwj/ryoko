/**
 * Gallery Upload API Route
 * 
 * Handles image uploads to Supabase Storage for the trip gallery system.
 * Validates file types and sizes, generates unique filenames, and stores metadata.
 * Uses Supabase service role for secure file uploads with proper error handling.
 * Returns upload URLs and metadata for the frontend gallery display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST - Upload image to gallery
export async function POST(request: NextRequest) {
  try {
    // Get the Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase server env vars');
      return NextResponse.json({ error: 'Server is misconfigured' }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    console.log('Upload API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tripId = formData.get('tripId') as string;
    const dayNumber = parseInt(formData.get('dayNumber') as string);
    const caption = formData.get('caption') as string;
    const userId = formData.get('userId') as string;

    console.log('Form data:', { tripId, dayNumber, caption, userId, fileName: file?.name, fileSize: file?.size });

    if (!file || !tripId || !dayNumber || !userId) {
      console.error('Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size);
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${tripId}/${dayNumber}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    console.log('Generated filename:', fileName);

    // Upload file to Supabase Storage (service role bypasses RLS)
    console.log('Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('gallery-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload image: ${uploadError.message}` }, { status: 500 });
    }

    console.log('Storage upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = admin.storage
      .from('gallery-images')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);

    // Save image metadata to database
    console.log('Saving to database...');
    const { data: imageData, error: dbError } = await admin
      .from('gallery_images')
      .insert([
        {
          trip_id: tripId,
          day_number: dayNumber,
          image_url: urlData.publicUrl,
          image_name: file.name,
          caption: caption || null,
          uploaded_by: userId
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await admin.storage.from('gallery-images').remove([fileName]);
      return NextResponse.json({ error: `Failed to save image metadata: ${dbError.message}` }, { status: 500 });
    }

    console.log('Database save successful:', imageData);

    return NextResponse.json({ 
      success: true, 
      image: imageData,
      message: 'Image uploaded successfully' 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { imageId, fileName } = await request.json();

    if (!imageId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase server env vars');
      return NextResponse.json({ error: 'Server is misconfigured' }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, serviceKey);

    // Delete from database first (service role bypasses RLS)
    const { error: dbError } = await admin
      .from('gallery_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json({ error: 'Failed to delete image from database' }, { status: 500 });
    }

    // Delete from storage
    const { error: storageError } = await admin.storage
      .from('gallery-images')
      .remove([fileName]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Don't fail the request if storage deletion fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { imageId, caption } = await request.json();

    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase server env vars');
      return NextResponse.json({ error: 'Server is misconfigured' }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, serviceKey);

    const { data, error } = await admin
      .from('gallery_images')
      .update({ caption: caption ?? null })
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      console.error('Caption update error:', error);
      return NextResponse.json({ error: 'Failed to update caption' }, { status: 500 });
    }

    return NextResponse.json({ success: true, image: data });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}