/**
 * Chat Recommendations API Route
 * 
 * AI chat interface for trip planning assistance using Google Gemini.
 * Provides contextual responses to user questions about trip planning.
 * Validates places with Google Places API when users ask about specific locations.
 * Returns conversational AI responses with place validation and recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Chat request interface
interface ChatRequest {
  tripData: {
    destination: string;
    interests: string[];
    numberOfDays: number;
    numberOfParticipants: number;
    startDate: string;
  };
  question: string;
  selectedPlace?: {
    name: string;
    location: string;
    description: string;
  };
}

// POST - Chat recommendations
export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY is not set');
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const { tripData, question, selectedPlace }: ChatRequest = await request.json();
    console.log('Chat request received:', { tripData, question, selectedPlace });
    
    if (!tripData || !question) {
      return NextResponse.json({ error: 'Trip data and question are required' }, { status: 400 });
    }

    const { destination, interests, numberOfDays, numberOfParticipants, startDate } = tripData;

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Validate place with Google Places API if available
    let placeValidation = '';
    if (selectedPlace && process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const placesResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(selectedPlace.name)}&key=${process.env.GOOGLE_PLACES_API_KEY}`
        );
        const placesData = await placesResponse.json();
        
        if (placesData.results && placesData.results.length > 0) {
          const place = placesData.results[0];
          placeValidation = `
PLACE VALIDATION (Google Places):
- Verified Name: ${place.name}
- Address: ${place.formatted_address}
- Rating: ${place.rating || 'N/A'}
- Types: ${place.types?.join(', ') || 'N/A'}
- Place ID: ${place.place_id}`;
        }
      } catch (error) {
        console.log('Google Places validation failed:', error);
      }
    }

    // Create context-aware prompt
    let contextPrompt = '';
    if (selectedPlace) {
      contextPrompt = `
SPECIFIC PLACE CONTEXT:
- Place: ${selectedPlace.name}
- Location: ${selectedPlace.location}
- Description: ${selectedPlace.description}

${placeValidation}

USER QUESTION: ${question}

Please provide a helpful, specific response about this place and the user's question.`;
    } else {
      contextPrompt = `
TRIP CONTEXT:
- Destination: ${destination}
- Interests: ${interests.join(', ')}
- Duration: ${numberOfDays} days
- Group size: ${numberOfParticipants} people
- Travel dates: ${startDate}

USER QUESTION: ${question}

Please provide helpful recommendations and information based on the trip context and user's question.`;
    }

    const prompt = `
You are a helpful travel assistant. Answer the user's question with specific, actionable advice.

${contextPrompt}

Guidelines:
- Be conversational and friendly
- Provide specific, practical information
- Include relevant details like timing, costs, or tips when appropriate
- Keep responses concise but informative (2-3 paragraphs max)
- Focus on the user's specific question and trip context

Respond in a natural, conversational tone as if you're chatting with a friend about travel.`;

    console.log('Sending chat request to Gemini:', { question, selectedPlace: selectedPlace?.name });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini chat response received');

    return NextResponse.json({
      success: true,
      response: text,
      question: question,
      selectedPlace: selectedPlace
    });

  } catch (error) {
    console.error('Chat recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate chat response' },
      { status: 500 }
    );
  }
}
