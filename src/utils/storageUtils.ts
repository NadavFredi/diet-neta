/**
 * Storage utility functions for handling Supabase storage URLs
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Extracts the file path from a Supabase storage URL
 * Handles both signed URLs and direct URLs
 * 
 * Examples:
 * - http://127.0.0.1:54321/storage/v1/object/sign/client-assets/workout-exercises/.../image.png?token=...
 * - http://127.0.0.1:54321/storage/v1/object/client-assets/workout-exercises/.../image.png
 * - https://uklxejsaenqoxujcjkba.supabase.co/storage/v1/object/sign/client-assets/workout-exercises/.../image.png?token=...
 * 
 * Returns: workout-exercises/.../image.png (without bucket name)
 */
export function extractStoragePath(url: string): string | null {
  if (!url) return null;

  try {
    // Remove query parameters (token, etc.)
    const urlWithoutQuery = url.split('?')[0];
    
    // Match patterns like:
    // /storage/v1/object/sign/client-assets/path/to/file
    // /storage/v1/object/client-assets/path/to/file
    const match = urlWithoutQuery.match(/\/storage\/v1\/object\/(?:sign\/)?client-assets\/(.+)$/);
    
    if (match && match[1]) {
      return match[1];
    }

    // If no match, try to extract from full URL
    const urlObj = new URL(urlWithoutQuery);
    const pathParts = urlObj.pathname.split('/');
    const clientAssetsIndex = pathParts.indexOf('client-assets');
    
    if (clientAssetsIndex !== -1 && clientAssetsIndex < pathParts.length - 1) {
      return pathParts.slice(clientAssetsIndex + 1).join('/');
    }

    return null;
  } catch (error) {
    console.error('Error extracting storage path:', error);
    return null;
  }
}

/**
 * Generates a signed URL for a storage file path
 * @param filePath - The file path in storage (e.g., "workout-exercises/exercise-id/images/file.png")
 * @param expiresIn - Expiration time in seconds (default: 1 year)
 * @returns Signed URL or null if error
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 31536000 // 1 year
): Promise<string | null> {
  if (!filePath) return null;

  try {
    const { data, error } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * Ensures a storage URL is a valid signed URL
 * If the URL is already a signed URL, returns it as-is
 * If it's a direct URL or expired, generates a new signed URL
 * 
 * @param url - The storage URL (signed or direct)
 * @param expiresIn - Expiration time in seconds for new signed URLs (default: 1 year)
 * @returns Valid signed URL or null if error
 */
export async function ensureSignedUrl(
  url: string | null | undefined,
  expiresIn: number = 31536000
): Promise<string | null> {
  if (!url) return null;

  // Check if URL is already a signed URL (contains /sign/ and token parameter)
  const isSignedUrl = url.includes('/sign/') && url.includes('token=');
  
  if (isSignedUrl) {
    // URL is already signed, return as-is
    return url;
  }

  // Extract file path and generate new signed URL
  const filePath = extractStoragePath(url);
  if (!filePath) {
    console.warn('Could not extract storage path from URL:', url);
    return null;
  }

  return getSignedUrl(filePath, expiresIn);
}
