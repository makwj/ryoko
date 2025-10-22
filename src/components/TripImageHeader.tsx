/**
 * TripImageHeader Component
 * 
 * Displays a header image for a trip with dynamic destination-based imagery.
 * Automatically fetches and displays relevant images for the trip destination.
 * Provides image upload functionality for custom trip headers.
 * Includes fallback gradients and placeholder images when no image is available.
 */

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface TripImageHeaderProps {
  tripId: string;
  destination: string;
  tripImageUrl?: string;
  className?: string;
  children?: React.ReactNode;
  onImageUpdate?: (imageUrl: string | null) => void;
}

export default function TripImageHeader({ 
  tripId,
  destination,
  tripImageUrl,
  className = "", 
  children,
  onImageUpdate
}: TripImageHeaderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Use tripImageUrl prop or fetch fallback image
  useEffect(() => {
    const fetchFallbackImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // If custom image is provided, use it
        if (tripImageUrl) {
          setImageUrl(tripImageUrl);
          setLoading(false);
          return;
        }

        // If no custom image, fetch from APIs as fallback
        if (!destination || destination.trim() === '') {
          setLoading(false);
          return;
        }

        // Extract city/country from destination
        const locationParts = destination.split(',').map(part => part.trim());
        const city = locationParts[0];
        const country = locationParts[locationParts.length - 1];

        // Try Unsplash API first
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)} ${encodeURIComponent(country)}&per_page=1&orientation=landscape&client_id=${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`
        );

        if (unsplashResponse.ok) {
          const unsplashData = await unsplashResponse.json();
          if (unsplashData.results && unsplashData.results.length > 0) {
            setImageUrl(unsplashData.results[0].urls.regular);
            setLoading(false);
            return;
          }
        }

        // Fallback to Pixabay API
        const pixabayResponse = await fetch(
          `https://pixabay.com/api/?key=${process.env.NEXT_PUBLIC_PIXABAY_API_KEY}&q=${encodeURIComponent(city)} ${encodeURIComponent(country)}&image_type=photo&orientation=horizontal&category=places&per_page=3&safesearch=true`
        );

        if (pixabayResponse.ok) {
          const pixabayData = await pixabayResponse.json();
          if (pixabayData.hits && pixabayData.hits.length > 0) {
            setImageUrl(pixabayData.hits[0].webformatURL);
            setLoading(false);
            return;
          }
        }

        // If both APIs fail, try a generic travel image
        const genericResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=travel destination&per_page=1&orientation=landscape&client_id=${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`
        );

        if (genericResponse.ok) {
          const genericData = await genericResponse.json();
          if (genericData.results && genericData.results.length > 0) {
            setImageUrl(genericData.results[0].urls.regular);
            setLoading(false);
            return;
          }
        }

        setError(true);
        setLoading(false);
      } catch (err) {
        console.warn('Failed to fetch destination image:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchFallbackImage();
  }, [tripId, destination, tripImageUrl]);


  if (loading) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-300 to-gray-400 animate-pulse relative`}>
        {children}
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`${className} bg-gradient-to-br from-green-400 to-green-600 relative`}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={`${className} relative`}
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      
      {children}
    </div>
  );
}
