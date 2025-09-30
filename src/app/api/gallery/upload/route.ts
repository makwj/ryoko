import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
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

    // Upload file to Supabase Storage
    console.log('Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data: urlData } = supabase.storage
      .from('gallery-images')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);

    // Save image metadata to database
    console.log('Saving to database...');
    const { data: imageData, error: dbError } = await supabase
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
      await supabase.storage.from('gallery-images').remove([fileName]);
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

    // Delete from database first
    const { error: dbError } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json({ error: 'Failed to delete image from database' }, { status: 500 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
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