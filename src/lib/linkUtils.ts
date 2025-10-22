/**
 * Link Utilities
 * 
 * Utility functions for detecting, extracting, and processing URLs in text content.
 * Used for link preview generation and URL detection in chat messages and trip content.
 * Includes functions for URL detection, extraction, and validation.
 */

// Utility functions for link detection and processing

// Detect URLs in a text string
export function detectUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Extract the first URL from a text string
export function extractFirstUrl(text: string): string | null {
  const urls = detectUrls(text);
  return urls.length > 0 ? urls[0] : null;
}

// Check if a text string contains any URLs
export function hasUrls(text: string): boolean {
  return detectUrls(text).length > 0;
}

// Remove URLs from a text string
export function removeUrlsFromText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '').trim();
}

// Format a URL by removing the www. prefix
export function formatUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}



