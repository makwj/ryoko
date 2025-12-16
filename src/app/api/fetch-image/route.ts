/**
 * Unsplash Image Search API Route
 * * Server-side endpoint for retrieving contextual images using the Unsplash API.
 * Accepts a search query (e.g., location name) to fetch high-quality landscape photos.
 * Securely manages the Unsplash Access Key on the server side to prevent exposure.
 * Includes graceful error handling to return null values if the external API fails or returns no results.
 */

import { NextRequest, NextResponse } from 'next/server';

// POST - Fetch image from Unsplash
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get the Unsplash access key
    const unsplashAccessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    
    // Check if the Unsplash access key is configured
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

    // Get the image data
    const data = await response.json();
    
    // Check if the image data is valid
    if (data.results && data.results.length > 0) {
      // Get the image URL
      const imageUrl = data.results[0].urls.regular;
      return NextResponse.json({ image_url: imageUrl });
    }

    // Return the image URL
    return NextResponse.json({ image_url: null });
  } catch (error) {
    // Log the error
    console.error('Error fetching image:', error);
    // Return the error
    return NextResponse.json({ image_url: null });
  }
}
