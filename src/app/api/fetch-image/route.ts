import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const unsplashAccessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    
    if (!unsplashAccessKey) {
      console.warn('Unsplash access key not configured');
      return NextResponse.json({ image_url: null });
    }

    // Fetch image from Unsplash
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return NextResponse.json({ image_url: null });
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].urls.regular;
      return NextResponse.json({ image_url: imageUrl });
    }

    return NextResponse.json({ image_url: null });

  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ image_url: null });
  }
}
