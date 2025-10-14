import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { destination, placeName } = await request.json();
    
    // Return mock data for testing
    const mockAttractions = [
      {
        name: "Wat Pho Temple",
        category: "Temple",
        description: "Famous Buddhist temple known for its giant reclining Buddha statue.",
        location: "Bangkok, Thailand",
        rating: 4.5,
        distance: "1.2km from place"
      },
      {
        name: "Grand Palace",
        category: "Historical Site",
        description: "Former royal residence with stunning architecture and historical significance.",
        location: "Bangkok, Thailand",
        rating: 4.7,
        distance: "800m from place"
      },
      {
        name: "Chatuchak Weekend Market",
        category: "Market",
        description: "One of the world's largest weekend markets with thousands of vendors.",
        location: "Bangkok, Thailand",
        rating: 4.3,
        distance: "3.5km from place"
      }
    ];

    return NextResponse.json({
      success: true,
      attractions: mockAttractions,
      destination,
      placeName
    });

  } catch (error) {
    console.error('Test attractions error:', error);
    return NextResponse.json(
      { error: 'Failed to get test attractions' },
      { status: 500 }
    );
  }
}
