import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { tripData } = await request.json();
    
    if (!tripData) {
      return NextResponse.json({ error: 'Trip data is required' }, { status: 400 });
    }

    const { destination, interests, numberOfDays, numberOfParticipants, startDate } = tripData;

    // Create a detailed prompt for Gemini
    const prompt = `
    Generate 5 personalized trip recommendations for a ${numberOfDays}-day trip to ${destination} for ${numberOfParticipants} people starting on ${startDate}.
    
    User interests: ${interests.join(', ')}
    
    CRITICAL REQUIREMENTS:
    - Provide SPECIFIC, NAMED locations and attractions (e.g., "KLCC Twin Towers", "Petronas Towers", "Batu Caves", "Central Market")
    - Do NOT provide generic descriptions like "walk in the city", "explore downtown", "visit local markets"
    - Each recommendation must be a specific, identifiable place with a proper name
    
    For each recommendation, provide:
    1. A short relevant title (specific attraction/venue name)
    2. A detailed description (2-3 sentences about what makes this specific place special)
    3. The exact location/venue name (must be a specific, named place)
    4. Activity type (Food, Transportation, Accommodation, Activity, Shopping, Nature, History, Culture)
    5. A relevant link (must be a complete URL starting with https:// - official website, booking site, or informational page)
    6. Estimated time needed (e.g., "2-3 hours", "Half day", "Full day")
    
    Examples of GOOD specific locations:
    - Kuala Lumpur: "KLCC Twin Towers", "Petronas Towers", "Batu Caves", "Central Market", "Jalan Alor Food Street"
    - Tokyo: "Tokyo Skytree", "Sensoji Temple", "Tsukiji Fish Market", "Shibuya Crossing", "Meiji Shrine"
    - Paris: "Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Champs-Élysées", "Montmartre"
    
    Examples of BAD generic descriptions to AVOID:
    - "Walk around the city center"
    - "Explore local markets"
    - "Visit downtown area"
    - "Experience local culture"
    - "Try street food"
    
    IMPORTANT: For the relevant_link field, always provide a complete, valid URL starting with https://. 
    Examples of good URLs:
    - https://www.tripadvisor.com/Attraction_Review-g123456-d789012-Reviews-Attraction_Name-City.html
    - https://www.booking.com/hotel/city/hotel-name.html
    - https://www.opentable.com/restaurant/profile/restaurant-name
    - https://www.getyourguide.com/activity-name-t123456/
    
    Do NOT provide incomplete URLs, phone numbers, or text like "Inquire locally". Always provide a working web link.
    
    Format the response as a JSON array with this structure:
    [
      {
        "title": "Specific Attraction Name",
        "description": "Detailed description of this specific place and what makes it special",
        "location": "Exact venue/location name",
        "activity_type": "activity",
        "relevant_link": "https://www.example.com",
        "estimated_time": "2-3 hours"
      }
    ]
    
    Return only the JSON array, no additional text.
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let recommendations;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Raw response:', text);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Add unique IDs and timestamps, and validate URLs
    const recommendationsWithIds = recommendations.map((rec: any, index: number) => {
      // Validate and fix URL if needed
      let validUrl = rec.relevant_link;
      
      // Check if URL is valid and starts with http/https
      if (!validUrl || typeof validUrl !== 'string' || (!validUrl.startsWith('http://') && !validUrl.startsWith('https://'))) {
        // If no valid URL provided, create a Google search URL
        const searchQuery = encodeURIComponent(`${rec.title} ${rec.location}`);
        validUrl = `https://www.google.com/search?q=${searchQuery}`;
      }
      
      return {
        id: `rec_${Date.now()}_${index}`,
        ...rec,
        relevant_link: validUrl,
        generated_at: new Date().toISOString()
      };
    });

    // Fetch images for each recommendation
    const recommendationsWithImages = await Promise.all(
      recommendationsWithIds.map(async (rec: any) => {
        try {
          const imageQuery = `${rec.title} ${rec.location} ${rec.activity_type}`;
          const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fetch-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: imageQuery }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            return {
              ...rec,
              image_url: imageData.image_url
            };
          }
        } catch (error) {
          console.error('Error fetching image for recommendation:', rec.title, error);
        }
        
        return rec;
      })
    );

    return NextResponse.json({ recommendations: recommendationsWithImages });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
