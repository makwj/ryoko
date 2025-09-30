import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { tripData } = await request.json();
    
    if (!tripData) {
      return NextResponse.json({ error: 'Trip data is required' }, { status: 400 });
    }

    const { destination, interests, numberOfDays, numberOfParticipants, startDate, additionalInfo } = tripData;

    // Step 1: Use Gemini to generate initial recommendations
    const prompt = `
    Generate 5 personalized trip recommendations for a ${numberOfDays}-day trip to ${destination} for ${numberOfParticipants} people starting on ${startDate}.
    
    User interests: ${interests.join(', ')}
    
    ${additionalInfo ? `Additional user requirements/preferences: ${additionalInfo}

    IMPORTANT: Use this additional information to personalize the recommendations. Consider budget preferences, dietary restrictions, accessibility needs, activity preferences, or any specific requirements mentioned.
    
    SPECIAL INSTRUCTIONS:
    - If the user specifically requests FOOD/RESTAURANTS, provide ONLY food-related recommendations
    - If the user specifically requests ACTIVITIES, provide ONLY activity-related recommendations  
    - If the user specifically requests ACCOMMODATION, provide ONLY accommodation-related recommendations
    - If the user specifically requests TRANSPORTATION, provide ONLY transportation-related recommendations
    - Respect the user's specific category request and do not mix different types unless they ask for variety` : ''}
    
    CRITICAL REQUIREMENTS:
    - Provide SPECIFIC, NAMED locations and attractions (e.g., "KLCC Twin Towers", "Petronas Towers", "Batu Caves", "Central Market")
    - Do NOT provide generic descriptions like "walk in the city", "explore downtown", "visit local markets"
    - Each recommendation must be a specific, identifiable place with a proper name
    
    For each recommendation, provide:
    1. A short relevant title (specific attraction/venue name)
    2. A detailed description (2-3 sentences about what makes this specific place special)
    3. The exact location/venue name (must be a specific, named place)
    4. Activity type (Food, Transportation, Accommodation, Activity, Shopping, Nature, History, Culture)
       - For FOOD requests: Use "Food" and focus on restaurants, cafes, food markets, street food, local cuisine
    5. Estimated time needed (e.g., "2-3 hours", "Half day", "Full day")
    
    Examples of GOOD specific locations:
    - Kuala Lumpur: "KLCC Twin Towers", "Petronas Towers", "Batu Caves", "Central Market", "Jalan Alor Food Street"
    - Tokyo: "Tokyo Skytree", "Sensoji Temple", "Tsukiji Fish Market", "Shibuya Crossing", "Meiji Shrine"
    - Paris: "Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Champs-Élysées", "Montmartre"
    
    Examples of GOOD FOOD-specific locations:
    - Kuala Lumpur: "Jalan Alor Food Street", "Central Market Food Court", "Restoran Yut Kee", "Madras Lane Curry House", "Lot 10 Hutong"
    - Tokyo: "Tsukiji Fish Market", "Ramen Nagi", "Sukiyabashi Jiro", "Harajuku Takeshita Street", "Shibuya Sky Restaurant"
    - Paris: "Le Comptoir du Relais", "L'As du Fallafel", "Du Pain et des Idées", "Marché des Enfants Rouges", "Bouillon Pigalle"
    
    Format the response as a JSON array with this structure:
    [
      {
        "title": "Specific Attraction Name",
        "description": "Detailed description of this specific place and what makes it special",
        "location": "Exact venue/location name",
        "activity_type": "activity",
        "estimated_time": "2-3 hours"
      }
    ]
    
    Return only the JSON array, no additional text.
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let recommendations;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Step 2: Enhance each recommendation with Google Places API data
    const enhancedRecommendations = await Promise.all(
      recommendations.map(async (rec: any, index: number) => {
        try {
          // Search for the place using Google Places API
          const searchQuery = `${rec.title} ${destination}`;
          const placesResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${process.env.GOOGLE_PLACES_API_KEY}`
          );

          if (placesResponse.ok) {
            const placesData = await placesResponse.json();
            
            if (placesData.results && placesData.results.length > 0) {
              const place = placesData.results[0];
              
              // Get detailed place information
              const detailsResponse = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,user_ratings_total,opening_hours,photos,website,formatted_phone_number&key=${process.env.GOOGLE_PLACES_API_KEY}`
              );

              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                const placeDetails = detailsData.result;

                // Get photo URL if available
                let photoUrl = null;
                if (placeDetails.photos && placeDetails.photos.length > 0) {
                  const photoReference = placeDetails.photos[0].photo_reference;
                  photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
                }

                return {
                  id: `rec_${Date.now()}_${index}`,
                  title: placeDetails.name || rec.title,
                  description: rec.description,
                  location: placeDetails.formatted_address || rec.location,
                  activity_type: rec.activity_type,
                  estimated_time: rec.estimated_time,
                  // Enhanced data from Google Places
                  rating: placeDetails.rating || null,
                  user_ratings_total: placeDetails.user_ratings_total || null,
                  opening_hours: placeDetails.opening_hours?.weekday_text || null,
                  website: placeDetails.website || null,
                  phone_number: placeDetails.formatted_phone_number || null,
                  image_url: photoUrl,
                  place_id: place.place_id,
                  // Generate relevant link
                  relevant_link: placeDetails.website || `https://www.google.com/search?q=${encodeURIComponent(placeDetails.name || rec.title)}`,
                  generated_at: new Date().toISOString()
                };
              }
            }
          }
        } catch (error) {
          console.error('Error enhancing recommendation with Google Places:', error);
        }

        // Fallback to original recommendation if enhancement fails
        return {
          id: `rec_${Date.now()}_${index}`,
          ...rec,
          relevant_link: `https://www.google.com/search?q=${encodeURIComponent(rec.title)}`,
          generated_at: new Date().toISOString()
        };
      })
    );

    return NextResponse.json({ recommendations: enhancedRecommendations });

  } catch (error) {
    console.error('Error generating enhanced recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
