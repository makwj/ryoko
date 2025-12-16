/**
 * Nearby Accommodations API Route
 * * Finds lodging options in close proximity to a specific landmark or destination.
 * Resolves the precise coordinates of the target location using the Google Places Text Search API.
 * Performs a radial search for nearby hotels and accommodations using the Places Nearby API.
 * Enriches results with detailed metadata (ratings, photos, websites) via the Place Details API.
 */

import { NextRequest, NextResponse } from 'next/server';

// Nearby accommodations request interface
interface NearbyAccommodationsRequest {
  destination: string;
  placeName: string;
  refreshToken?: string;
}

// POST - Find nearby accommodations
export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    const { destination, placeName, refreshToken }: NearbyAccommodationsRequest = await request.json();
    if (!destination || !placeName) {
      return NextResponse.json({ error: 'Destination and place name are required' }, { status: 400 });
    }

    // Resolve anchor place
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(placeName + ' ' + destination)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const textSearchRes = await fetch(textSearchUrl);
    const textSearchData = await textSearchRes.json();
    if (!textSearchData.results || textSearchData.results.length === 0) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    const anchorPlace = textSearchData.results[0];
    const { lat, lng } = anchorPlace.geometry.location;

    // Find lodgings nearby
    const jitter = refreshToken ? Math.min(1000, (refreshToken.length * 53) % 1000) : 0;
    const radius = 3000 + jitter;
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=lodging&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const nearbyRes = await fetch(nearbyUrl);
    const nearbyData = await nearbyRes.json();
    if (!nearbyData.results || nearbyData.results.length === 0) {
      return NextResponse.json({ error: 'No nearby accommodations found' }, { status: 404 });
    }

    const detailsFields = 'editorial_summary,types,formatted_address,rating,user_ratings_total,website,url,photos';
    const top = nearbyData.results.slice(0, 10);
    const detailed = await Promise.all(
      top.map(async (p: any) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=${encodeURIComponent(detailsFields)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          const details = detailsData?.result || {};
          return { ...p, __details: details };
        } catch {
          return p;
        }
      })
    );

    // Map results to expected Accommodation shape
    const results = detailed.slice(0, 8).map((p: any) => {
      const d = p.__details || {};
      const address = d.formatted_address || p.vicinity || destination;
      const photoRef = (d.photos && d.photos[0]?.photo_reference) || (p.photos && p.photos[0]?.photo_reference);
      const image = photoRef ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${process.env.GOOGLE_PLACES_API_KEY}` : undefined;
      const linkUrl = d.website || d.url || undefined;
      return {
        name: p.name,
        category: 'accommodation',
        description: address ? `Located at ${address}.` : 'Nearby accommodation.',
        location: address,
        rating: typeof (d.rating ?? p.rating) === 'number' ? (d.rating ?? p.rating) : undefined,
        image,
        linkUrl
      };
    });

    return NextResponse.json({ success: true, accommodations: results, destination, placeName });
  } catch (error) {
    console.error('Nearby accommodations error:', error);
    return NextResponse.json({ error: 'Failed to find nearby accommodations' }, { status: 500 });
  }
}


