/**
 * Nearby Attractions API Route
 * * Discovers popular tourist spots and points of interest near a specific location.
 * Resolves the target location's coordinates using the Google Places Text Search API.
 * Performs multiple radial searches for various categories (e.g., museums, parks) to ensure diverse results.
 * Filters out accommodations and enriches the remaining attractions with detailed editorial summaries and photos.
 */

import { NextRequest, NextResponse } from 'next/server';

// Nearby attractions request interface
interface NearbyAttractionsRequest {
  destination: string;
  placeName: string;
  refreshToken?: string; // used to vary results (page token / seed)
}

// Attraction interface
interface Attraction {
  name: string;
  category: string;
  description: string;
  location?: string;
  rating?: number;
  distance?: string;
}

// POST - Find nearby attractions
export async function POST(request: NextRequest) {
  try {
    const { destination, placeName, refreshToken }: NearbyAttractionsRequest = await request.json();
    
    if (!destination || !placeName) {
      return NextResponse.json({ error: 'Destination and place name are required' }, { status: 400 });
    }

    // Require Places API
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('GOOGLE_PLACES_API_KEY is not set');
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    // 1) Text Search to resolve the specific place (by placeName within destination)
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(placeName + ' ' + destination)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const textSearchRes = await fetch(textSearchUrl);
    const textSearchData = await textSearchRes.json();

    if (!textSearchData.results || textSearchData.results.length === 0) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    const anchorPlace = textSearchData.results[0];
    const { lat, lng } = anchorPlace.geometry.location;

    // 2) Nearby Search around the resolved coordinates to find popular destinations
    // Use refreshToken to jitter radius to vary results between requests
    const jitter = refreshToken ? Math.min(1000, (refreshToken.length * 97) % 1000) : 0;
    const radius = 2500 + jitter; // meters

    // Run multiple nearby searches with different types and merge
    const typesToQuery = ['point_of_interest', 'tourist_attraction', 'museum', 'park', 'art_gallery', 'shopping_mall'];
    const nearbyResults: Record<string, any> = {};

    for (const t of typesToQuery) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${t}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        for (const r of data.results) {
          if (r.place_id) nearbyResults[r.place_id] = r;
        }
      }
      // If we already have enough, stop early
      if (Object.keys(nearbyResults).length >= 16) break;
    }

    const merged = Object.values(nearbyResults) as any[];
    if (merged.length === 0) {
      return NextResponse.json({ error: 'No nearby places found' }, { status: 404 });
    }

    // 3) Enrich with Place Details to get short descriptions when available
    const detailsFields = 'editorial_summary,types,formatted_address,rating,user_ratings_total,website,url,photos';
    const top = merged.slice(0, 10); // enrich a subset

    const detailed = await Promise.all(
      top.map(async (p) => {
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

    // 4) Map results to expected Attraction shape with description preference
    const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const mapCategory = (types?: string[]) => {
      if (!types || types.length === 0) return 'Popular Place';
      const blacklist = new Set(['point_of_interest']);
      const preferredList = [
        'tourist_attraction','museum','park','zoo','aquarium','art_gallery','shopping_mall','amusement_park','stadium',
        'place_of_worship','church','hindu_temple','mosque','synagogue','university','library','night_club','casino',
        'campground','rv_park','natural_feature'
      ];
      const preferred = types.find(t => preferredList.includes(t) && !blacklist.has(t));
      const fallback = types.find(t => !blacklist.has(t));
      return capitalize(preferred || fallback || 'popular_place');
    };

    const attractions = detailed
      .filter((p: any) => !(p.types || []).includes('lodging')) // exclude accommodations from attractions
      .slice(0, 8)
      .map((p: any) => {
      const d = p.__details || {};
      const summary = d.editorial_summary?.overview as string | undefined;
      const types = (d.types || p.types) as string[] | undefined;
      const address = d.formatted_address || p.vicinity || destination;
      const photoRef = (d.photos && d.photos[0]?.photo_reference) || (p.photos && p.photos[0]?.photo_reference);
      const image = photoRef ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${process.env.GOOGLE_PLACES_API_KEY}` : undefined;
      const linkUrl = d.website || d.url || undefined;
      return {
        name: p.name,
        category: mapCategory(types), // front-end will remap to itinerary labels
        description: summary ? summary : (address ? `Located at ${address}.` : 'Popular nearby place.'),
        location: address,
        rating: typeof (d.rating ?? p.rating) === 'number' ? (d.rating ?? p.rating) : undefined,
        distance: undefined,
        image,
        linkUrl
      };
    });

    return NextResponse.json({
      success: true,
      attractions,
      destination,
      placeName,
      anchor: { name: anchorPlace.name, location: anchorPlace.formatted_address, lat, lng }
    });

  } catch (error) {
    console.error('Nearby attractions error:', error);
    return NextResponse.json(
      { error: 'Failed to find nearby attractions' },
      { status: 500 }
    );
  }
}
