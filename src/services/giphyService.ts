/**
 * Giphy Service
 * 
 * Utility functions for fetching GIFs from Giphy API
 * To use your own API key, replace GIPHY_API_KEY below or set it via environment variable
 */

// Giphy API Key - MUST be set via environment variable
// Get your own key from https://developers.giphy.com/
// Set VITE_GIPHY_API_KEY in your .env.local file
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

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
  if (!GIPHY_API_KEY) {
    throw new Error('Giphy API key not configured. Please set VITE_GIPHY_API_KEY in your .env.local file.');
  }
  
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
  if (!GIPHY_API_KEY) {
    throw new Error('Giphy API key not configured. Please set VITE_GIPHY_API_KEY in your .env.local file.');
  }
  
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
