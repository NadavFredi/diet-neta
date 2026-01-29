/**
 * Hook to ensure storage image URLs are valid signed URLs
 */

import { useState, useEffect } from 'react';
import { ensureSignedUrl } from '@/utils/storageUtils';

/**
 * Hook that ensures an image URL is a valid signed URL
 * Automatically regenerates signed URLs if needed
 * 
 * @param imageUrl - The image URL (may be signed or direct)
 * @returns The signed URL, or null if error
 */
export function useStorageImage(imageUrl: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!imageUrl) {
      setSignedUrl(null);
      setIsLoading(false);
      return;
    }

    // Check if URL is already a signed URL
    const isSignedUrl = imageUrl.includes('/sign/') && imageUrl.includes('token=');
    
    if (isSignedUrl) {
      // Already signed, use as-is
      setSignedUrl(imageUrl);
      setIsLoading(false);
    } else {
      // Need to generate signed URL
      setIsLoading(true);
      ensureSignedUrl(imageUrl)
        .then((url) => {
          setSignedUrl(url);
          setIsLoading(false);
        })
        .catch(() => {
          setSignedUrl(null);
          setIsLoading(false);
        });
    }
  }, [imageUrl]);

  return signedUrl;
}
