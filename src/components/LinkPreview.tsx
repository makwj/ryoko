"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Globe, Loader2 } from "lucide-react";

interface LinkPreviewProps {
  url: string;
  className?: string;
}

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

export default function LinkPreview({ url, className = "" }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(false);

        // Use a simple metadata API (you can replace this with your preferred service)
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch metadata');
        }

        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.warn('Failed to fetch link metadata:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchMetadata();
    }
  }, [url]);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="truncate">{getDomain(url)}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-start gap-3 p-3"
      >
        {/* Square image on the left */}
        {metadata.image && (
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            <img 
              src={metadata.image} 
              alt={metadata.title || 'Link preview'}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Content on the right */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <Globe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {metadata.title && (
                <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                  {metadata.title}
                </h4>
              )}
              {metadata.description && (
                <p className="text-gray-600 text-xs line-clamp-2 mb-2">
                  {metadata.description}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="truncate">{metadata.domain || getDomain(url)}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
