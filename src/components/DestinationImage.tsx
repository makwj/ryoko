/**
 * DestinationImage Component
 * 
 * Displays destination-specific images with fallback gradients.
 * Automatically fetches relevant images for trip destinations.
 * Provides consistent image display across the application with error handling.
 * Includes customizable styling and fallback options for missing images.
 */

"use client";

import { useState, useEffect } from "react";

interface DestinationImageProps {
  destination: string;
  tripImageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  children?: React.ReactNode;
}

export default function DestinationImage({ 
  destination, 
  tripImageUrl,
  className = "", 
  fallbackClassName = "",
  children 
}: DestinationImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [customImageError, setCustomImageError] = useState(false);

  useEffect(() => {
    const fetchDestinationImage = async () => {
      // If custom trip image is provided, use it immediately
      if (tripImageUrl && !customImageError) {
        setImageUrl(tripImageUrl);
        setLoading(false);
        setError(false);
        return;
      }

      // If custom image failed to load, fall through to API images

      // If no custom image and no destination, show fallback
      if (!destination || destination.trim() === '') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

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

    fetchDestinationImage();
  }, [destination, tripImageUrl, customImageError]);

  // Handle image load error for uploaded images
  const handleCustomImageError = () => {
    if (tripImageUrl) {
      setCustomImageError(true);
      setImageUrl(null);
      // Trigger re-fetch with API images
      setLoading(true);
      setError(false);
    }
  };

  if (loading) {
    return (
      <div className={`${className} ${fallbackClassName} bg-gradient-to-br from-gray-300 to-gray-400 animate-pulse`}>
        {children}
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`${className} ${fallbackClassName} bg-gradient-to-br from-green-400 to-green-600`}>
        {children}
      </div>
    );
  }

  // If we have a custom image, use an img element to detect load errors
  if (tripImageUrl && !customImageError && imageUrl === tripImageUrl) {
    return (
      <div className={`${className} relative overflow-hidden`}>
        <img
          src={tripImageUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={handleCustomImageError}
          onLoad={() => {
            setLoading(false);
            setError(false);
          }}
        />
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        {children}
      </div>
    );
  }

  // For API images or fallback, use background-image
  return (
    <div 
      className={`${className} relative overflow-hidden`}
      style={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      {children}
    </div>
  );
}
