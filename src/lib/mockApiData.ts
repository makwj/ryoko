/**
 * Mock API Data Utilities
 * 
 * Provides simulated payloads for Google Places API and Gemini API endpoints
 * to save API usage while developing UI.
 */

// Mock data for enhanced recommendations
export function getMockEnhancedRecommendations(tripData: {
  destination: string;
  interests: string[];
  numberOfDays: number;
  numberOfParticipants: number;
}) {
  const lowerDestination = tripData.destination.toLowerCase();

  // Use detailed, real-world style mock data for Tokyo, Japan
  const mockRecommendations = lowerDestination.includes("tokyo")
    ? [
        {
          id: `rec_${Date.now()}_0`,
          title: "Sensō-ji Temple (Asakusa)",
          description:
            "Tokyo’s oldest Buddhist temple, set in the atmospheric Asakusa district. Walk through the iconic Kaminarimon gate and browse the Nakamise shopping street lined with traditional snacks and souvenirs.",
          location: "Asakusa, Taito City, Tokyo, Japan",
          activity_type: "activity" as const,
          category: "Must-Visit" as const,
          best_for: "First-time visitors, culture lovers, and photographers",
          timing_advice:
            "2–3 hours – Come early morning or after sunset to avoid peak crowds and enjoy the lanterns lit up at night",
          group_suitability: "Great for solo travelers, couples, and small groups",
          practical_tips:
            "Dress modestly when entering temple buildings and try the omikuji (fortune slips) for a fun local experience.",
          estimated_time: "2–3 hours",
          rating: 4.7,
          user_ratings_total: 52000,
          opening_hours: [
            "Monday: 6:00 AM – 5:00 PM",
            "Tuesday: 6:00 AM – 5:00 PM",
            "Wednesday: 6:00 AM – 5:00 PM",
            "Thursday: 6:00 AM – 5:00 PM",
            "Friday: 6:00 AM – 5:00 PM",
            "Saturday: 6:00 AM – 5:00 PM",
            "Sunday: 6:00 AM – 5:00 PM"
          ],
          website: "https://www.senso-ji.jp/",
          phone_number: "+81 3-3842-0181",
          price_level: 0,
          image_url:
            "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800",
          place_id: "mock_tokyo_sensoji",
          relevant_link:
            "https://www.google.com/search?q=Sens%C5%8D-ji+Temple+Tokyo",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_1`,
          title: "Shibuya Crossing & Hachikō Statue",
          description:
            "One of the busiest pedestrian crossings in the world, surrounded by neon signs, shopping, and cafes. Just nearby is the famous Hachikō dog statue, a symbol of loyalty and a popular meeting spot.",
          location: "Shibuya, Tokyo, Japan",
          activity_type: "activity" as const,
          category: "Must-Visit" as const,
          best_for: "City lovers, night owls, and photographers",
          timing_advice:
            "1–2 hours – Visit around dusk or early evening to see the lights at their best.",
          group_suitability: "Good for all group sizes, but stay close together in crowds",
          practical_tips:
            "Head up to a nearby café or viewpoint for a great overhead photo of the scramble crossing.",
          estimated_time: "1–2 hours",
          rating: 4.6,
          user_ratings_total: 45000,
          opening_hours: null,
          website: null,
          phone_number: null,
          price_level: 0,
          image_url:
            "https://images.unsplash.com/photo-1526481280695-3c687fd543c0?w=800",
          place_id: "mock_tokyo_shibuya_crossing",
          relevant_link: "https://www.google.com/search?q=Shibuya+Crossing+Tokyo",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_2`,
          title: "Tsukiji Outer Market",
          description:
            "Lively streets packed with seafood stalls, kitchenware shops, and tiny eateries. A great spot to sample fresh sushi, grilled skewers, and Japanese street food in the morning.",
          location: "Tsukiji, Chuo City, Tokyo, Japan",
          activity_type: "food" as const,
          category: "Recommended" as const,
          best_for: "Foodies and early risers",
          timing_advice:
            "2–3 hours – Best visited in the morning between 8:00 and 11:00 AM.",
          group_suitability: "Best for small groups due to narrow walkways",
          practical_tips:
            "Bring cash and be prepared to eat on the go; many shops have limited seating.",
          estimated_time: "2–3 hours",
          rating: 4.5,
          user_ratings_total: 26000,
          opening_hours: [
            "Monday: 8:00 AM – 2:00 PM",
            "Tuesday: 8:00 AM – 2:00 PM",
            "Wednesday: 8:00 AM – 2:00 PM",
            "Thursday: 8:00 AM – 2:00 PM",
            "Friday: 8:00 AM – 2:00 PM",
            "Saturday: 8:00 AM – 2:00 PM",
            "Sunday: Closed"
          ],
          website: null,
          phone_number: null,
          price_level: 2,
          image_url:
            "https://images.unsplash.com/photo-1545243424-0ce743321e11?w=800",
          place_id: "mock_tokyo_tsukiji_outer_market",
          relevant_link:
            "https://www.google.com/search?q=Tsukiji+Outer+Market+Tokyo",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_3`,
          title: "Odaiba Seaside Park & Tokyo Bay Views",
          description:
            "Futuristic waterfront area with shopping malls, a seaside park, and views of the Rainbow Bridge and Tokyo Tower. Perfect for a relaxed afternoon or evening stroll by the bay.",
          location: "Odaiba, Minato City, Tokyo, Japan",
          activity_type: "activity" as const,
          category: "Recommended" as const,
          best_for: "Families, couples, and relaxed sightseeing",
          timing_advice:
            "Half day – Come in the late afternoon and stay through sunset for night views of the city skyline.",
          group_suitability:
            "Very good for families and larger groups, with wide open spaces",
          practical_tips:
            "Combine your visit with nearby attractions like shopping centers or digital art museums in Odaiba.",
          estimated_time: "Half day",
          rating: 4.4,
          user_ratings_total: 18000,
          opening_hours: null,
          website: null,
          phone_number: null,
          price_level: 0,
          image_url:
            "https://images.unsplash.com/photo-1526481280693-3b113c01c8e0?w=800",
          place_id: "mock_tokyo_odaiba_seaside_park",
          relevant_link: "https://www.google.com/search?q=Odaiba+Tokyo",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_4`,
          title: "Shinjuku Stay – Business & Entertainment District",
          description:
            "Staying near Shinjuku Station puts you in the middle of skyscrapers, izakayas, and great transport links. It’s a convenient base with endless dining and nightlife options.",
          location: "Shinjuku, Tokyo, Japan",
          activity_type: "accommodation" as const,
          category: "Consider" as const,
          best_for: "Travelers who want a lively base with easy train connections",
          timing_advice: "Overnight stay – Ideal for the full duration of your Tokyo trip",
          group_suitability:
            "Works well for most travelers; families may prefer quieter side streets or nearby neighborhoods",
          practical_tips:
            "If you prefer quieter nights, choose a hotel slightly away from Kabukichō or on a higher floor.",
          estimated_time: "Overnight",
          rating: 4.3,
          user_ratings_total: 12000,
          opening_hours: null,
          website: null,
          phone_number: null,
          price_level: 3,
          image_url:
            "https://images.unsplash.com/photo-1542051841857-5c8326c23c06?w=800",
          place_id: "mock_tokyo_shinjuku_accommodation_area",
          relevant_link: "https://www.google.com/search?q=Shinjuku+Tokyo+hotels",
          generated_at: new Date().toISOString()
        }
      ]
    : [
        {
          id: `rec_${Date.now()}_0`,
          title: "Historic City Center",
          description:
            "A must-visit area featuring beautiful architecture and rich cultural heritage. Perfect for exploring on foot with plenty of cafes and shops.",
          location: `${tripData.destination}`,
          activity_type: "activity" as const,
          category: "Must-Visit" as const,
          best_for: "Culture enthusiasts and history lovers",
          timing_advice:
            "Half day - Best visited in the morning or late afternoon",
          group_suitability: "Great for groups of all sizes",
          practical_tips:
            "Wear comfortable walking shoes and bring a camera",
          estimated_time: "Half day",
          rating: 4.5,
          user_ratings_total: 1234,
          opening_hours: [
            "Monday: 9:00 AM – 6:00 PM",
            "Tuesday: 9:00 AM – 6:00 PM",
            "Wednesday: 9:00 AM – 6:00 PM",
            "Thursday: 9:00 AM – 6:00 PM",
            "Friday: 9:00 AM – 6:00 PM",
            "Saturday: 10:00 AM – 4:00 PM",
            "Sunday: Closed"
          ],
          website: "https://example.com",
          phone_number: "+1 234-567-8900",
          price_level: 1,
          image_url:
            "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800",
          place_id: "mock_place_1",
          relevant_link: "https://example.com",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_1`,
          title: "Local Food Market",
          description:
            "Experience authentic local cuisine at this bustling market. Sample fresh produce, street food, and traditional dishes.",
          location: `${tripData.destination}`,
          activity_type: "food" as const,
          category: "Recommended" as const,
          best_for: "Food lovers and adventurous eaters",
          timing_advice:
            "2-3 hours - Best visited during lunch hours",
          group_suitability: "Perfect for small to medium groups",
          practical_tips: "Bring cash and arrive hungry",
          estimated_time: "2-3 hours",
          rating: 4.3,
          user_ratings_total: 856,
          opening_hours: [
            "Monday: 8:00 AM – 8:00 PM",
            "Tuesday: 8:00 AM – 8:00 PM",
            "Wednesday: 8:00 AM – 8:00 PM",
            "Thursday: 8:00 AM – 8:00 PM",
            "Friday: 8:00 AM – 9:00 PM",
            "Saturday: 7:00 AM – 9:00 PM",
            "Sunday: 8:00 AM – 7:00 PM"
          ],
          website: null,
          phone_number: null,
          price_level: 2,
          image_url:
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
          place_id: "mock_place_2",
          relevant_link:
            "https://www.google.com/search?q=local+food+market",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_2`,
          title: "Scenic Viewpoint",
          description:
            "Breathtaking panoramic views of the city and surrounding landscape. Perfect for photography and sunset watching.",
          location: `${tripData.destination}`,
          activity_type: "activity" as const,
          category: "Must-Visit" as const,
          best_for: "Photographers and nature lovers",
          timing_advice: "1-2 hours - Best at sunrise or sunset",
          group_suitability: "Suitable for all group sizes",
          practical_tips: "Bring a jacket as it can be windy",
          estimated_time: "1-2 hours",
          rating: 4.7,
          user_ratings_total: 2103,
          opening_hours: null,
          website: null,
          phone_number: null,
          price_level: 0,
          image_url:
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
          place_id: "mock_place_3",
          relevant_link:
            "https://www.google.com/search?q=scenic+viewpoint",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_3`,
          title: "Art Museum",
          description:
            "Extensive collection of local and international art. Features rotating exhibitions and educational programs.",
          location: `${tripData.destination}`,
          activity_type: "activity" as const,
          category: "Recommended" as const,
          best_for: "Art enthusiasts and culture seekers",
          timing_advice:
            "Half day - Allow 3-4 hours for full experience",
          group_suitability: "Great for small groups",
          practical_tips: "Check for free admission days",
          estimated_time: "Half day",
          rating: 4.4,
          user_ratings_total: 987,
          opening_hours: [
            "Monday: Closed",
            "Tuesday: 10:00 AM – 6:00 PM",
            "Wednesday: 10:00 AM – 6:00 PM",
            "Thursday: 10:00 AM – 8:00 PM",
            "Friday: 10:00 AM – 6:00 PM",
            "Saturday: 10:00 AM – 6:00 PM",
            "Sunday: 10:00 AM – 6:00 PM"
          ],
          website: "https://example-museum.com",
          phone_number: "+1 234-567-8901",
          price_level: 2,
          image_url:
            "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
          place_id: "mock_place_4",
          relevant_link: "https://example-museum.com",
          generated_at: new Date().toISOString()
        },
        {
          id: `rec_${Date.now()}_4`,
          title: "Boutique Hotel",
          description:
            "Charming boutique hotel in the heart of the city. Features modern amenities with local character.",
          location: `${tripData.destination}`,
          activity_type: "accommodation" as const,
          category: "Consider" as const,
          best_for: "Travelers seeking unique accommodations",
          timing_advice: "Overnight stay",
          group_suitability:
            "Ideal for couples and small groups",
          practical_tips:
            "Book in advance during peak season",
          estimated_time: "Overnight",
          rating: 4.6,
          user_ratings_total: 456,
          opening_hours: null,
          website: "https://example-hotel.com",
          phone_number: "+1 234-567-8902",
          price_level: 3,
          image_url:
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
          place_id: "mock_place_5",
          relevant_link: "https://example-hotel.com",
          generated_at: new Date().toISOString()
        }
      ];

  return {
    recommendations: mockRecommendations,
    metadata: {
      total_places_found: 15,
      places_after_filtering: 12,
      curated_count: mockRecommendations.length,
      trip_context: {
        destination: tripData.destination,
        interests: tripData.interests,
        days: tripData.numberOfDays,
        participants: tripData.numberOfParticipants
      }
    }
  };
}

// Mock data for chat recommendations
export function getMockChatResponse(question: string, tripData?: {
  destination: string;
  interests: string[];
  numberOfDays: number;
  numberOfParticipants: number;
}) {
  const responses: Record<string, string> = {
    "what are the best places to visit": `Based on your trip to ${tripData?.destination || 'this destination'}, I'd recommend visiting the Historic City Center for its rich cultural heritage, the Scenic Viewpoint for breathtaking views, and the Local Food Market to experience authentic cuisine. These places are perfect for ${tripData?.numberOfParticipants || 'your'} travelers and align well with your interests.`,
    "where should i eat": `For dining in ${tripData?.destination || 'this area'}, I highly recommend checking out the Local Food Market for authentic street food and local specialties. There are also several excellent restaurants in the Historic City Center area. Make sure to try the local cuisine - it's a highlight of visiting this region!`,
    "what accommodations are available": `There are several great accommodation options in ${tripData?.destination || 'this area'}. The Boutique Hotel offers a charming stay with modern amenities, and there are also budget-friendly hostels and luxury resorts depending on your preferences. I'd suggest booking in advance, especially if you're traveling during peak season.`,
    "default": `That's a great question about ${tripData?.destination || 'your trip'}! Based on your ${tripData?.numberOfDays || 'trip'} day itinerary for ${tripData?.numberOfParticipants || 'your group'}, I'd recommend focusing on the areas that match your interests. Would you like more specific recommendations for any particular aspect of your trip?`
  };

  const lowerQuestion = question.toLowerCase();
  let response = responses["default"];
  
  for (const [key, value] of Object.entries(responses)) {
    if (lowerQuestion.includes(key)) {
      response = value;
      break;
    }
  }

  return {
    success: true,
    response,
    question,
    selectedPlace: null
  };
}

// Mock data for nearby attractions
export function getMockNearbyAttractions(destination: string, placeName: string) {
  return {
    success: true,
    attractions: [
      {
        name: "Historic Square",
        category: "Tourist Attraction",
        description: "A beautiful historic square in the heart of the city, surrounded by cafes and shops.",
        location: `${destination}`,
        rating: 4.5,
        distance: "0.5 km",
        image: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800",
        linkUrl: "https://example.com"
      },
      {
        name: "City Park",
        category: "Park",
        description: "Large urban park perfect for picnics, walks, and outdoor activities.",
        location: `${destination}`,
        rating: 4.3,
        distance: "1.2 km",
        image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
        linkUrl: null
      },
      {
        name: "Local Museum",
        category: "Museum",
        description: "Regional museum showcasing local history and culture.",
        location: `${destination}`,
        rating: 4.4,
        distance: "0.8 km",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
        linkUrl: "https://example-museum.com"
      },
      {
        name: "Shopping District",
        category: "Shopping Mall",
        description: "Vibrant shopping area with local boutiques and international brands.",
        location: `${destination}`,
        rating: 4.2,
        distance: "0.3 km",
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
        linkUrl: null
      }
    ],
    destination,
    placeName,
    anchor: {
      name: placeName,
      location: destination,
      lat: 0,
      lng: 0
    }
  };
}

// Mock data for nearby accommodations
export function getMockNearbyAccommodations(destination: string, placeName: string) {
  return {
    success: true,
    accommodations: [
      {
        name: "Grand Hotel",
        category: "accommodation",
        description: "Luxury hotel with excellent amenities and central location.",
        location: `${destination}`,
        rating: 4.6,
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        linkUrl: "https://example-hotel.com"
      },
      {
        name: "Budget Hostel",
        category: "accommodation",
        description: "Affordable accommodation perfect for budget travelers.",
        location: `${destination}`,
        rating: 4.1,
        image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        linkUrl: null
      },
      {
        name: "Boutique Inn",
        category: "accommodation",
        description: "Charming boutique inn with personalized service.",
        location: `${destination}`,
        rating: 4.5,
        image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
        linkUrl: "https://example-inn.com"
      }
    ],
    destination,
    placeName
  };
}

