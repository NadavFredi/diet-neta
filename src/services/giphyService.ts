/**
 * Giphy Service
 * 
 * Utility functions for fetching GIFs from Giphy API
 * To use your own API key, replace GIPHY_API_KEY below or set it via environment variable
 */

// Giphy Public Beta Key (for development/testing)
// For production, get your own key from https://developers.giphy.com/
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || '3gIdMl6kw5qOwjkq6m6vNVgqTZ5HNL5N';

const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    fixed_height_small: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
      width: string;
      height: string;
    };
  };
}

export interface GiphyResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
  };
}

/**
 * Fetch trending GIFs
 */
export async function fetchTrendingGifs(limit: number = 20, offset: number = 0): Promise<GiphyGif[]> {
  try {
    const url = `${GIPHY_API_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=g`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }
    
    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[GiphyService] Error fetching trending GIFs:', error);
    throw error;
  }
}

/**
 * Search GIFs by query
 */
export async function searchGifs(query: string, limit: number = 20, offset: number = 0): Promise<GiphyGif[]> {
  if (!query.trim()) {
    return fetchTrendingGifs(limit, offset);
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodedQuery}&limit=${limit}&offset=${offset}&rating=g&lang=en`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }
    
    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[GiphyService] Error searching GIFs:', error);
    throw error;
  }
}

/**
 * Get high-quality URL for a GIF (prefers original, falls back to fixed_height)
 */
export function getGifUrl(gif: GiphyGif): string {
  return gif.images.original.url || gif.images.fixed_height.url;
}

/**
 * Get thumbnail URL for a GIF (for grid display)
 */
export function getGifThumbnailUrl(gif: GiphyGif): string {
  return gif.images.fixed_height_small.url || gif.images.fixed_height.url;
}
