import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Types for Google Places API responses
interface GooglePlaceResponse {
  results: GooglePlaceResult[];
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: Array<{ photo_reference: string }>;
}

interface GooglePlaceDetails {
  result: {
    name: string;
    formatted_address: string;
    rating: number;
    user_ratings_total: number;
    opening_hours?: {
      weekday_text: string[];
    };
    photos?: Array<{ photo_reference: string }>;
    website?: string;
    formatted_phone_number?: string;
    types: string[];
    reviews?: Array<{
      text: string;
      rating: number;
    }>;
    price_level?: number;
    place_id: string;
  };
}

interface CuratedPlace {
  name: string;
  category: string;
  activity_type: string;
  recommendation_reason: string;
  best_for?: string;
  practical_tips?: string;
  timing_advice?: string;
  group_suitability?: string;
}

interface TripData {
  trip_id: string;
  destination: string;
  interests: string[];
  numberOfDays: number;
  numberOfParticipants: number;
  startDate: string;
  endDate: string;
  excludePlaceIds?: string[]; // For generating more recommendations
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// Interest to Google Places Type Mapping
const INTEREST_MAPPING: { [key: string]: string[] } = {
  'history': ['museum', 'historical_site', 'monument', 'cemetery', 'tourist_attraction'],
  'food': ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'bakery', 'cafe'],
  'shopping': ['shopping_mall', 'store', 'clothing_store', 'jewelry_store', 'market'],
  'relaxation': ['spa', 'park', 'natural_feature', 'beach', 'resort'],
  'adventure': ['amusement_park', 'natural_feature', 'park', 'campground'],
  'culture': ['museum', 'art_gallery', 'cultural_center', 'library', 'theater'],
  'nightlife': ['bar', 'night_club', 'casino'],
  'nature': ['park', 'zoo', 'aquarium', 'natural_feature', 'campground'],
  'religion': ['church', 'mosque', 'temple', 'synagogue', 'hindu_temple'],
  'entertainment': ['amusement_park', 'movie_theater', 'casino', 'bowling_alley'],
  'sports': ['gym', 'stadium', 'sports_complex', 'golf_course', 'swimming_pool'],
  'transportation': ['subway_station', 'bus_station', 'train_station', 'airport'],
  'accommodation': ['lodging', 'hotel', 'hostel', 'resort', 'guest_house']
};

// Helper function to get Google Places types from interests
function getPlacesTypesFromInterests(interests: string[]): string[] {
  const types: string[] = [];
  
  interests.forEach(interest => {
    const lowerInterest = interest.toLowerCase();
    if (INTEREST_MAPPING[lowerInterest]) {
      types.push(...INTEREST_MAPPING[lowerInterest]);
    }
  });
  
  // Remove duplicates and return
  return [...new Set(types)];
}

// Helper function to get comprehensive Google Places data
async function getPlacesDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  try {
    const fields = 'name,formatted_address,rating,user_ratings_total,opening_hours,photos,website,formatted_phone_number,types,reviews,price_level,place_id';
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
  }
  return null;
}

// Helper function to fetch places from Google Places API
async function fetchPlaces(query: string, destination?: string): Promise<GooglePlaceResult[]> {
  try {
    // Ensure the query includes the destination for better location targeting
    let searchQuery = query;
    if (destination && !query.toLowerCase().includes(destination.toLowerCase())) {
      searchQuery = `${query} in ${destination}`;
    }
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${process.env.GOOGLE_PLACES_API_KEY}`
    );

    if (response.ok) {
      const data: GooglePlaceResponse = await response.json();
      if (data.results) {
        return data.results;
      } else {
        console.warn('No results found for query:', query);
        return [];
      }
    } else {
      console.error('Google Places API error:', response.status, response.statusText);
      return [];
    }
  } catch (error) {
    console.error('Error fetching places for query:', query, error);
    return [];
  }
}

// Helper function to filter places by destination
function filterPlacesByDestination(places: GooglePlaceResult[], destination: string): GooglePlaceResult[] {
  // Since Google Places API queries already include the destination,
  // we can trust that the results are relevant to the destination.
  // Only filter out obvious outliers if needed.
  
  const destinationLower = destination.toLowerCase();
  
  return places.filter(place => {
    const address = place.formatted_address || '';
    const name = place.name || '';
    
    // Keep the place if:
    // 1. The destination appears in the address, OR
    // 2. The destination appears in the name, OR  
    // 3. No obvious geographic mismatch (very permissive)
    return address.toLowerCase().includes(destinationLower) ||
           name.toLowerCase().includes(destinationLower) ||
           true; // Trust Google Places API results
  });
}

// Helper function to determine trip season and timing context
function getTripContext(tripData: TripData): string {
  const { numberOfDays, numberOfParticipants, startDate } = tripData;
  
  // Calculate trip duration
  const duration = numberOfDays <= 3 ? "short" : numberOfDays <= 7 ? "medium" : "long";
  
  // Determine season from start date
  const month = new Date(startDate).getMonth() + 1;
  let season = "spring";
  if (month >= 6 && month <= 8) season = "summer";
  else if (month >= 9 && month <= 11) season = "autumn";
  else if (month >= 12 || month <= 2) season = "winter";
  
  // Group size context
  let groupSize = "small group";
  if (numberOfParticipants >= 10) groupSize = "large group";
  else if (numberOfParticipants >= 5) groupSize = "medium group";
  
  return `${duration} ${numberOfDays <= 3 ? "day" : "days"} trip during ${season} for a ${groupSize}`;
}

// Fallback function to extract places from unstructured text
function extractPlacesFromText(text: string, availablePlaces: GooglePlaceDetails[]): CuratedPlace[] {
  const extractedPlaces: CuratedPlace[] = [];
  
  // Try to find place names mentioned in the text
  availablePlaces.forEach(place => {
    const placeName = place.result.name.toLowerCase();
    const textMatch = text.toLowerCase().includes(placeName);
    
    if (textMatch) {
      // Determine category and activity type from the text context
      let category = 'Consider';
      let activityType = 'Activity';
      
      // Simple heuristics for categorization
      const placeText = text.toLowerCase().substring(text.toLowerCase().indexOf(placeName) - 100, text.toLowerCase().indexOf(placeName) + 100);
      
      if (placeText.includes('must') || placeText.includes('essential') || placeText.includes('highlight')) {
        category = 'Must-Visit';
      } else if (placeText.includes('recommend') || placeText.includes('great') || placeText.includes('excellent')) {
        category = 'Recommended';
      }
      
      // Determine activity type from Google Places types
      if (place.result.types?.includes('restaurant') || place.result.types?.includes('food')) {
        activityType = 'Food';
      } else if (place.result.types?.includes('museum') || place.result.types?.includes('art_gallery')) {
        activityType = 'Culture';
      } else if (place.result.types?.includes('park') || place.result.types?.includes('natural_feature')) {
        activityType = 'Nature';
      } else if (place.result.types?.includes('shopping_mall') || place.result.types?.includes('store')) {
        activityType = 'Shopping';
      } else if (place.result.types?.includes('tourist_attraction')) {
        activityType = 'Activity';
      }
      
      extractedPlaces.push({
        name: place.result.name,
        category: category,
        activity_type: activityType,
        recommendation_reason: "This place was mentioned in our analysis and meets the quality criteria.",
        best_for: "General visitors interested in this type of experience",
        timing_advice: "Visit during regular opening hours",
        group_suitability: "Suitable for various group sizes",
        practical_tips: "Check opening hours and consider advance booking if needed"
      });
    }
  });
  
  // Limit to top places
  return extractedPlaces.slice(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('GOOGLE_PLACES_API_KEY is not set');
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }
    
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY is not set');
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const { tripData }: { tripData: TripData } = await request.json();
    
    if (!tripData) {
      return NextResponse.json({ error: 'Trip data is required' }, { status: 400 });
    }

    const { 
      destination, 
      interests = [], 
      numberOfDays, 
      numberOfParticipants, 
      startDate,
      excludePlaceIds = []
    } = tripData;


    // Step 1: Generate search queries based on interests
    const placeTypes = getPlacesTypesFromInterests(interests);
    const placesQueries = [
      ...placeTypes.map(type => `${type} in ${destination}`),
      ...interests.map(interest => `best ${interest} ${destination}`),
      ...interests.map(interest => `popular ${interest} ${destination}`),
      `attractions ${destination}`,
      `popular places ${destination}`
    ];

    // Only include accommodation searches if accommodation is explicitly in interests
    if (interests.includes('accommodation')) {
      placesQueries.push(
        `best hotels ${destination}`,
        `accommodation ${destination}`,
        `lodging ${destination}`
      );
    }


    // Step 2: Fetch places from Google Places API
    const allPlaces = await Promise.all(
      placesQueries.map(query => fetchPlaces(query, destination))
    );
    
    // Flatten and deduplicate by place_id, excluding already shown places
    const uniquePlaces = new Map();
    allPlaces.flat().forEach(place => {
      if (place && place.place_id && place.name) {
        // Skip places that are already shown
        if (!excludePlaceIds.includes(place.place_id) && !uniquePlaces.has(place.place_id)) {
          uniquePlaces.set(place.place_id, place);
        }
      } else {
        console.warn('Invalid place data:', place);
      }
    });
    
    let initialPlaces = Array.from(uniquePlaces.values());
    
    // Add randomization to get different results each time
    initialPlaces = initialPlaces.sort(() => Math.random() - 0.5);

    if (initialPlaces.length === 0) {
      console.warn('No places found for destination:', destination);
      return NextResponse.json({ 
        error: 'No places found for the specified destination',
        recommendations: []
      }, { status: 200 });
    }

    // Step 3: Use places directly from Google Places API
    // Since queries already include the destination, results should be relevant
    const destinationFilteredPlaces = initialPlaces;

    // Step 4: Take top places for detailed analysis
    const topPlaces = destinationFilteredPlaces.slice(0, 30);
    
    // Step 5: Get detailed information for top places
    const placesWithDetails = await Promise.all(
      topPlaces.map(place => getPlacesDetails(place.place_id))
    );

    const validPlaces = placesWithDetails.filter(place => place && place.result);

    if (validPlaces.length === 0) {
      console.warn('No places with valid details found');
      return NextResponse.json({ 
        error: 'No detailed information available for places',
        recommendations: []
      }, { status: 200 });
    }

    // Step 6: Prepare context for Gemini AI curation
    const tripContext = getTripContext(tripData);
    
    const placesForGemini = validPlaces.map(place => {
      if (!place || !place.result || !place.result.name) {
        console.warn('Invalid place in validPlaces:', place);
        return null;
      }
      return {
        name: place.result.name,
        address: place.result.formatted_address,
        rating: place.result.rating,
        review_count: place.result.user_ratings_total,
        types: place.result.types || [],
        price_level: place.result.price_level || null,
        opening_hours: (place.result as any).opening_hours?.weekday_text || null,
        reviews: (place.result.reviews || []).slice(0, 5).map((r: { text: string }) => r.text).join(' | '),
        website: place.result.website || null
      };
    }).filter((place): place is NonNullable<typeof place> => place !== null);

    if (placesForGemini.length === 0) {
      console.warn('No valid places for Gemini after filtering');
      return NextResponse.json({ 
        error: 'No valid places found for curation',
        recommendations: []
      }, { status: 200 });
    }

    console.log(`Sending ${placesForGemini.length} places to Gemini for ${destination}`);
    console.log(`Sample places: ${placesForGemini.slice(0, 3).map(p => p.name).join(', ')}`);

    // Step 7: Use Gemini AI for intelligent curation and personalization
    const curationPrompt = `
You are an expert travel curator helping to create personalized recommendations for a ${tripContext}.

TRIP DETAILS:
- Destination: ${destination}
- Duration: ${numberOfDays} days
- Group Size: ${numberOfParticipants} people
- Interests: ${interests.join(', ')}
- Trip Dates: ${startDate} for ${numberOfDays} days

AVAILABLE PLACES:
${JSON.stringify(placesForGemini, null, 2)}

YOUR TASK:
Analyze all the places above and curate the BEST 8-12 recommendations that match this specific group's needs.

CRITICAL DATA-DRIVEN REQUIREMENTS:
1. **Use ONLY verified information** from the provided data (reviews, opening hours, ratings, types)
2. **Base insights on actual review content** - extract patterns from the 5 reviews provided
3. **Use opening hours for timing advice** - if available, suggest best times based on hours
4. **Extract group dynamics from reviews** - look for mentions of families, couples, groups, etc.
5. **Derive practical tips from reviews** - look for mentions of booking, parking, accessibility, etc.

CONSIDERATIONS:
1. **Group Size**: Recommend places suitable for ${numberOfParticipants} people
2. **Trip Duration**: Ensure places fit within a ${numberOfDays}-day itinerary
3. **Interests Match**: Prioritize places that align with: ${interests.join(', ')}
4. **Quality Assurance**: Only recommend places with 4.0+ ratings and good reviews
5. **Review-Based Insights**: Extract insights from actual user reviews provided

For each recommendation, provide:
1. **recommendation_reason**: Why this place matches the group based on reviews and ratings
2. **best_for**: Extract from reviews - who reviewers say it's good for
3. **timing_advice**: Use opening hours if available, otherwise say "Check opening hours"
4. **group_suitability**: Extract from reviews - what reviewers say about group experiences
5. **practical_tips**: Extract from reviews - booking, parking, accessibility mentions

CATEGORIZE BY:
- **Must-Visit**: Essential places for this specific group (2-3 places)
- **Recommended**: Highly suitable places (4-5 places)  
- **Consider**: Good options if time/interest allows (3-4 places)

CRITICAL OUTPUT FORMAT REQUIREMENTS:
1. Return ONLY a valid JSON array - no other text, explanations, or formatting
2. Start with [ and end with ] 
3. Each object must have exactly these fields: name, category, activity_type, recommendation_reason, best_for, timing_advice, group_suitability, practical_tips
4. Use double quotes for all strings
5. Ensure valid JSON syntax throughout

EXAMPLE OUTPUT FORMAT:
[
  {
    "name": "Exact place name",
    "category": "Must-Visit",
    "activity_type": "Food",
    "recommendation_reason": "Why this place matches the group based on reviews and ratings (2-3 sentences)",
    "best_for": "Extract from reviews - who reviewers say it's good for",
    "timing_advice": "Use opening hours if available, otherwise 'Check opening hours'",
    "group_suitability": "Extract from reviews - what reviewers say about group experiences",
    "practical_tips": "Extract from reviews - booking, parking, accessibility mentions"
  }
]

VALID CATEGORIES: Must-Visit, Recommended, Consider
VALID ACTIVITY TYPES: Food, Culture, History, Nature, Shopping, Entertainment, Sports, Religion, Transportation, Accommodation, Activity

ABSOLUTE REQUIREMENTS:
- Return ONLY the JSON array as plain text
- No markdown formatting, no code blocks, no explanations
- Valid JSON syntax that can be parsed directly
- Include 8-12 recommendations total
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(curationPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Empty response from Gemini curation');
    }

    console.log(`Gemini response length: ${text.length} characters`);
    console.log(`Gemini response preview: ${text.substring(0, 200)}...`);
    console.log(`Gemini response ends with: ${text.substring(text.length - 200)}`);
    
    // Check for common parsing issues
    if (text.includes('```')) {
      console.log('WARNING: Response contains markdown code blocks');
    }
    if (!text.includes('[') || !text.includes(']')) {
      console.log('WARNING: Response does not contain JSON array brackets');
    }
    if (text.includes('"name"') && text.includes('"category"')) {
      console.log('INFO: Response contains expected JSON fields');
    } else {
      console.log('WARNING: Response missing expected JSON fields');
    }

    // Parse Gemini's curation with improved extraction
    let curatedPlaces;
    try {
      // Clean the text more aggressively
      let cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[^{[]*/, '') // Remove text before first [ or {
        .replace(/[^}\]]*$/, '') // Remove text after last } or ]
        .trim();
      
      // Try to find JSON array
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        console.log(`Attempting to parse JSON: ${jsonString.substring(0, 100)}...`);
        curatedPlaces = JSON.parse(jsonString);
      } else {
        // Try alternative approach - look for JSON array boundaries
        const startIndex = cleanedText.indexOf('[');
        const endIndex = cleanedText.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          const jsonString = cleanedText.substring(startIndex, endIndex + 1);
          console.log(`Attempting to parse JSON from boundaries: ${jsonString.substring(0, 100)}...`);
          curatedPlaces = JSON.parse(jsonString);
        } else {
          throw new Error('No JSON array found in Gemini response');
        }
      }
      
      // Validate that we have an array
      if (!Array.isArray(curatedPlaces)) {
        throw new Error('Gemini response is not an array');
      }
      
      console.log(`Successfully parsed ${curatedPlaces.length} recommendations from Gemini`);
      
    } catch (parseError) {
      console.error('Failed to parse Gemini curation:', parseError);
      console.error('Raw response text:', text);
      console.log('Falling back to text extraction...');
      
      // Fallback: Try to manually extract places from the text
      try {
        const fallbackPlaces = extractPlacesFromText(text, validPlaces.filter(p => p !== null) as GooglePlaceDetails[]);
        if (fallbackPlaces.length > 0) {
          console.log(`Fallback extraction found ${fallbackPlaces.length} places`);
          curatedPlaces = fallbackPlaces;
        } else {
          throw new Error('Fallback parsing also failed');
        }
      } catch (fallbackError) {
        console.error('Fallback parsing failed:', fallbackError);
        
        // Last resort: Create basic recommendations from available places
        console.log('Creating basic recommendations from available places...');
        const basicRecommendations = validPlaces.filter(place => place && place.result).slice(0, 8).map((place, index) => ({
          name: place!.result.name,
          category: index < 3 ? 'Must-Visit' : index < 6 ? 'Recommended' : 'Consider',
          activity_type: place!.result.types?.includes('restaurant') ? 'Food' : 
                        place!.result.types?.includes('museum') ? 'Culture' : 'Activity',
          recommendation_reason: `This ${place!.result.types?.[0] || 'place'} has a ${place!.result.rating || 'good'} rating and ${place!.result.user_ratings_total || 0} reviews.`,
          best_for: 'General visitors',
          timing_advice: 'Check opening hours before visiting',
          group_suitability: 'Suitable for various group sizes',
          practical_tips: 'Check reviews for specific details'
        }));
        
        curatedPlaces = basicRecommendations;
      }
    }

    // Step 8: Match curated places with Google Places data and enhance
    const enhancedRecommendations = await Promise.all(
      curatedPlaces.map(async (curated: CuratedPlace, index: number) => {
        // Find the matching Google Places data
        const matchingPlace = validPlaces.find(place => 
          place && place.result && (
            place.result.name.toLowerCase().includes(curated.name.toLowerCase()) ||
            curated.name.toLowerCase().includes(place.result.name.toLowerCase())
          )
        );

        if (matchingPlace) {
          // Generate photo URL if available
                let photoUrl = null;
          if (matchingPlace.result.photos && matchingPlace.result.photos.length > 0) {
            const photoReference = matchingPlace.result.photos[0].photo_reference;
                  photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
                }

                return {
                  id: `rec_${Date.now()}_${index}`,
            title: matchingPlace.result.name,
            description: curated.recommendation_reason,
            location: matchingPlace.result.formatted_address,
            activity_type: curated.activity_type,
            category: curated.category,
            best_for: curated.best_for,
            timing_advice: curated.timing_advice,
            group_suitability: curated.group_suitability,
            practical_tips: curated.practical_tips,
            estimated_time: curated.timing_advice?.includes('Half day') ? 'Half day' : 
                            curated.timing_advice?.includes('Full day') ? 'Full day' : '2-3 hours',
            // Enhanced Google Places data
            rating: matchingPlace.result.rating || null,
            user_ratings_total: matchingPlace.result.user_ratings_total || null,
            opening_hours: (matchingPlace.result as any).opening_hours?.weekday_text || null,
            website: matchingPlace.result.website || null,
            phone_number: matchingPlace.result.formatted_phone_number || null,
            price_level: matchingPlace.result.price_level || null,
                  image_url: photoUrl,
            place_id: matchingPlace.result.place_id,
            relevant_link: matchingPlace.result.website || `https://www.google.com/search?q=${encodeURIComponent(matchingPlace.result.name)}`,
                  generated_at: new Date().toISOString()
                };
        }

        // Fallback for unmatched places
        return {
          id: `rec_${Date.now()}_${index}`,
          title: curated.name,
          description: curated.recommendation_reason,
          location: destination,
          activity_type: curated.activity_type,
          category: curated.category,
          best_for: curated.best_for,
          timing_advice: curated.timing_advice,
          group_suitability: curated.group_suitability,
          practical_tips: curated.practical_tips,
          estimated_time: 'Half day',
          relevant_link: `https://www.google.com/search?q=${encodeURIComponent(curated.name + ' ' + destination)}`,
          generated_at: new Date().toISOString()
        };
      })
    );

    return NextResponse.json({ 
      recommendations: enhancedRecommendations,
      metadata: {
        total_places_found: initialPlaces.length,
        places_after_filtering: destinationFilteredPlaces.length,
        curated_count: enhancedRecommendations.length,
        trip_context: tripContext
      }
    });

  } catch (error) {
    console.error('Error generating enhanced recommendations:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}