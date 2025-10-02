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
  additionalInfo?: string;
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
      return data.result;
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
  }
  return null;
}

// Helper function to fetch places from Google Places API
async function fetchPlaces(query: string): Promise<GooglePlaceResult[]> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_PLACES_API_KEY}`
    );

    if (response.ok) {
      const data: GooglePlaceResponse = await response.json();
      return data.results || [];
    }
  } catch (error) {
    console.error('Error fetching places:', error);
  }
  return [];
}

// Helper function to filter by rating and reviews
function filterHighQualityPlaces(places: GooglePlaceResult[], minRating: number = 4.0, minReviews: number = 50): GooglePlaceResult[] {
  return places.filter(place => 
    (place.rating || 0) >= minRating && 
    (place.user_ratings_total || 0) >= minReviews
  );
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
      additionalInfo 
    } = tripData;


    // Step 1: Analyze user intent using Gemini AI
    let userIntent = {
      hasSpecificPlaceType: false,
      specificPlaceType: null as string | null,
      shouldOverrideInterests: false,
      searchQueries: [] as string[],
      reasoning: ''
    };

    if (additionalInfo && additionalInfo.trim()) {
      
      const intentPrompt = `
Analyze this user request: "${additionalInfo}"
Trip destination: ${destination}
Trip interests: ${interests.join(', ')}

Determine:
1. Does the user want a SPECIFIC TYPE of place (restaurant, museum, spa, hotel, etc.)?
2. What specific place type do they want?
3. Should this override the general trip interests?
4. What Google Places search queries would best find this?

Return ONLY a JSON object:
{
  "hasSpecificPlaceType": boolean,
  "specificPlaceType": "restaurant|museum|spa|lodging|shopping_mall|park|gym|movie_theater|night_club|place_of_worship|null",
  "shouldOverrideInterests": boolean,
  "searchQueries": ["query1", "query2", "query3"],
  "reasoning": "Brief explanation of the analysis"
}

Return only the JSON object, no additional text.
`;

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const intentResult = await model.generateContent(intentPrompt);
        const intentResponse = await intentResult.response;
        const intentText = intentResponse.text();

        const cleanedIntentText = intentText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const intentMatch = cleanedIntentText.match(/\{[\s\S]*\}/);
        
        if (intentMatch) {
          userIntent = JSON.parse(intentMatch[0]);
        }
      } catch (error) {
        console.error('Error analyzing user intent:', error);
        // Fallback to simple keyword matching
        const lowerInfo = additionalInfo.toLowerCase();
        if (lowerInfo.includes('restaurant') || lowerInfo.includes('food')) {
          userIntent = {
            hasSpecificPlaceType: true,
            specificPlaceType: 'restaurant',
            shouldOverrideInterests: true,
            searchQueries: [`${additionalInfo}`, `restaurant ${destination}`],
            reasoning: 'Fallback: Detected restaurant/food keywords'
          };
        }
      }
    }

    
    // Step 2: Prepare place queries based on priority
    const placesQueries = [];
    
    if (userIntent.hasSpecificPlaceType && userIntent.shouldOverrideInterests) {
      // Priority 1: User wants specific place type that overrides interests
      
      // Use Gemini's suggested queries first
      placesQueries.push(...userIntent.searchQueries);
      
      // Add additional variations for the specific type
      if (userIntent.specificPlaceType) {
        placesQueries.push(`best ${userIntent.specificPlaceType} ${destination}`);
        placesQueries.push(`top rated ${userIntent.specificPlaceType} ${destination}`);
        placesQueries.push(`popular ${userIntent.specificPlaceType} ${destination}`);
      }
      
      // Add complementary interests if they don't conflict
      const placeTypes = getPlacesTypesFromInterests(interests);
      placeTypes.forEach(type => {
        if (type !== userIntent.specificPlaceType) {
          placesQueries.push(`${type} in ${destination}`);
        }
      });
      
    } else if (userIntent.hasSpecificPlaceType && !userIntent.shouldOverrideInterests) {
      // Priority 2: User wants specific type but also consider interests
      
      // Use specified queries but include interest-based queries too
      placesQueries.push(...userIntent.searchQueries);
      
      const placeTypes = getPlacesTypesFromInterests(interests);
      placeTypes.forEach(type => {
        placesQueries.push(`${type} in ${destination}`);
        placesQueries.push(`best ${type} ${destination}`);
      });
      
    } else {
      // Priority 3: Use interests as primary with additional context
      
      const placeTypes = getPlacesTypesFromInterests(interests);
      
      // Generate queries based on interests
      placeTypes.forEach(type => {
        placesQueries.push(`${type} in ${destination}`);
        placesQueries.push(`best ${type} ${destination}`);
        placesQueries.push(`top rated ${type} ${destination}`);
      });
      
      // Add Gemini-suggested queries if any
      if (userIntent.searchQueries.length > 0) {
        placesQueries.push(...userIntent.searchQueries);
      } else if (additionalInfo && additionalInfo.trim()) {
        // Fallback: Use additional info as context
        placesQueries.push(`${additionalInfo} ${destination}`);
      }
    }
    
    // Always add some generic variety
    placesQueries.push(`attractions ${destination}`);
    placesQueries.push(`popular places ${destination}`);
    
    // Fetch places with all queries
    const allPlaces = await Promise.all(
      placesQueries.map(query => fetchPlaces(query))
    );
    
    // Flatten and deduplicate by place_id
    const uniquePlaces = new Map();
    allPlaces.flat().forEach(place => {
      if (!uniquePlaces.has(place.place_id)) {
        uniquePlaces.set(place.place_id, place);
      }
    });
    
    const initialPlaces = Array.from(uniquePlaces.values());

    // Step 3: Filter for high-quality places
    const highQualityPlaces = filterHighQualityPlaces(initialPlaces);

    // Take top places for detailed analysis
    const topPlaces = highQualityPlaces.slice(0, 30);
    
    // Step 4: Get detailed information for top places
    const detailedPlaces = await Promise.all(
      topPlaces.map(async (place) => {
        const details = await getPlacesDetails(place.place_id);
        return details;
      })
    );

    // Filter out places where details couldn't be fetched
    const validPlaces = detailedPlaces.filter(place => place !== null);

    // Step 5: Prepare context for Gemini AI curation
    const tripContext = getTripContext(tripData);
    
    const placesForGemini = validPlaces.map(place => ({
      name: place.result.name,
      address: place.result.formatted_address,
      rating: place.result.rating,
      review_count: place.result.user_ratings_total,
      types: place.result.types || [],
      price_level: place.result.price_level || null,
      opening_hours: place.result.opening_hours?.weekday_text || null,
      reviews: (place.result.reviews || []).slice(0, 3).map((r: { text: string }) => r.text).join(' | '),
      website: place.result.website || null
    }));

    // Step 6: Use Gemini AI for intelligent curation and personalization
    const curationPrompt = `
You are an expert travel curator helping to create personalized recommendations for a ${tripContext}.

TRIP DETAILS:
- Destination: ${destination}
- Duration: ${numberOfDays} days
- Group Size: ${numberOfParticipants} people
- Interests: ${interests.join(', ')}
- Trip Dates: ${startDate} for ${numberOfDays} days
${additionalInfo ? `- Additional Requirements: ${additionalInfo}` : ''}

AVAILABLE PLACES:
${JSON.stringify(placesForGemini, null, 2)}

YOUR TASK:
Analyze all the places above and curate the BEST 8-12 recommendations that match this specific group's needs.

${userIntent.hasSpecificPlaceType && userIntent.shouldOverrideInterests ? `
CRITICAL PRIORITY: The user has requested specific types of places and wants them to override general interests.

Intent Analysis: ${userIntent.reasoning}
Specific Place Type Requested: ${userIntent.specificPlaceType}
Additional Context: "${additionalInfo}"

You MUST prioritize places that match this specific request over general interests. Focus primarily on places that match their specific request while considering the group's other interests as secondary.
` : ''}

${userIntent.hasSpecificPlaceType && !userIntent.shouldOverrideInterests ? `
BALANCED APPROACH: The user has requested specific types of places but also wants to consider general interests.

Intent Analysis: ${userIntent.reasoning}
Specific Place Type Requested: ${userIntent.specificPlaceType}
Additional Context: "${additionalInfo}"

Balance the specific request with general interests. Include places that match their specific request alongside places that match the general trip interests.
` : ''}

CONSIDERATIONS:
1. **Group Size**: Recommend places suitable for ${numberOfParticipants} people
2. **Trip Duration**: Ensure places fit within a ${numberOfDays}-day itinerary
3. **Interests Match**: Prioritize places that align with: ${interests.join(', ')}
4. **Seasonal Relevance**: Consider timing for ${startDate}
5. **Quality Assurance**: Only recommend places with 4.0+ ratings and good reviews
6. **Practical Factors**: Consider opening hours, accessibility, booking needs
7. **Diversity**: Include variety in types of experiences
${additionalInfo ? `8. **Special Requirements**: Address these specific needs: ${additionalInfo}` : ''}

For each recommendation, provide:
1. **Why it's recommended**: Specific reasons it matches this group
2. **Best for**: Specific subgroup interests or times
3. **Timing advice**: How long to spend, best times to visit
4. **Group dynamics**: How it works for ${numberOfParticipants} people
5. **Practical tips**: Booking requirements, accessibility, logistics

CATEGORIZE BY:
- **Must-Visit**: Essential places for this specific group (2-3 places)
- **Recommended**: Highly suitable places (4-5 places)  
- **Consider**: Good options if time/interest allows (3-4 places)

    IMPORTANT: Return ONLY a valid JSON array in this exact format:
    [
      {
        "name": "Exact place name",
        "category": "Must-Visit|Recommended|Consider",
        "activity_type": "Food|Culture|History|Nature|Shopping|Entertainment|Sports|Religion|Transportation|Accommodation|Activity",
        "recommendation_reason": "Why this specific place matches this group's needs (2-3 sentences)",
        "best_for": "Specific interests or times this place is perfect for",
        "timing_advice": "How long to spend and when to visit",
        "group_suitability": "How it works for this group size and dynamics",
        "practical_tips": "Booking, accessibility, or other logistics advice"
      }
    ]

    CRITICAL: Do not include any explanatory text, comments, code blocks, or markdown formatting. Return ONLY the JSON array as plain text.
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(curationPrompt);
    const response = await result.response;
    const text = response.text();


    // Parse Gemini's curation with improved extraction
    let curatedPlaces;
    try {
      // Remove any markdown code blocks
      const cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Extract JSON array with more precise matching
      const jsonMatch = cleanedText.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        
        curatedPlaces = JSON.parse(jsonString);
      } else {
        // Try alternative approach - look for JSON array boundaries
        const startIndex = cleanedText.indexOf('[');
        const endIndex = cleanedText.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          const jsonString = cleanedText.substring(startIndex, endIndex + 1);
          curatedPlaces = JSON.parse(jsonString);
        } else {
          throw new Error('No JSON array found in Gemini response');
        }
      }
      
      // Validate that we have an array
      if (!Array.isArray(curatedPlaces)) {
        throw new Error('Gemini response is not an array');
      }
      
      
    } catch (parseError) {
      console.error('Failed to parse Gemini curation:', parseError);
      console.error('Raw response text:', text);
      
      // Fallback: Try to manually extract places from the text
      try {
        const fallbackPlaces = extractPlacesFromText(text, validPlaces);
        if (fallbackPlaces.length > 0) {
          curatedPlaces = fallbackPlaces;
        } else {
          throw new Error('Fallback parsing also failed');
        }
      } catch (fallbackError) {
        console.error('Fallback parsing failed:', fallbackError);
        return NextResponse.json({ 
          error: 'Failed to parse AI response', 
          details: 'Invalid JSON format from Gemini',
          raw_response: text.substring(0, 500)
        }, { status: 500 });
      }
    }

    // Step 7: Match curated places with Google Places data and enhance
    const enhancedRecommendations = await Promise.all(
      curatedPlaces.map(async (curated: CuratedPlace, index: number) => {
        // Find the matching Google Places data
        const matchingPlace = validPlaces.find(place => 
          place.result.name.toLowerCase().includes(curated.name.toLowerCase()) ||
          curated.name.toLowerCase().includes(place.result.name.toLowerCase())
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
            opening_hours: matchingPlace.result.opening_hours?.weekday_text || null,
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
        high_quality_places: highQualityPlaces.length,
        curated_count: enhancedRecommendations.length,
        trip_context: tripContext
      }
    });

  } catch (error) {
    console.error('Error generating enhanced recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}