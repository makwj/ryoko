"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

interface LocationSuggestion {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  relevance?: number;
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Where are you going?",
  className = ""
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search requests
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await searchLocations(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocations = async (query: string) => {
    if (!query || query.length < 2) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=8&types=country,region,place,locality&language=en`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }

      const data = await response.json();
      
      // Sort suggestions by relevance (countries first, then major cities)
      const sortedSuggestions = (data.features || []).sort((a: LocationSuggestion, b: LocationSuggestion) => {
        const aIsCountry = a.context?.some(ctx => ctx.id.startsWith('country'));
        const bIsCountry = b.context?.some(ctx => ctx.id.startsWith('country'));
        
        if (aIsCountry && !bIsCountry) return -1;
        if (!aIsCountry && bIsCountry) return 1;
        
        // If both are countries or both are not countries, sort by relevance score
        return (b.relevance || 0) - (a.relevance || 0);
      });
      
      setSuggestions(sortedSuggestions);
      setIsOpen(sortedSuggestions.length > 0);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.place_name);
    setIsOpen(false);
  };

  const formatLocationName = (suggestion: LocationSuggestion) => {
    // Extract the most relevant parts from place_name
    const parts = suggestion.place_name.split(", ");
    
    // If it's a country, just return the country name
    if (suggestion.context?.some(ctx => ctx.id.startsWith('country'))) {
      return parts[0];
    }
    
    // If it's a region/state, return "Region, Country"
    if (suggestion.context?.some(ctx => ctx.id.startsWith('region'))) {
      if (parts.length >= 2) {
        return `${parts[0]}, ${parts[parts.length - 1]}`;
      }
    }
    
    // For cities, return "City, Country" format
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    
    return suggestion.place_name;
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          className={`w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent text-gray-900 ${className}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5a58]"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center space-x-3"
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {formatLocationName(suggestion)}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {suggestion.place_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
