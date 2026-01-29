/**
 * StorageImage component that automatically handles signed URLs for Supabase storage images
 */

import React from 'react';
import { useStorageImage } from '@/hooks/useStorageImage';
import { cn } from '@/lib/utils';

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  fallbackSrc?: string;
  alt: string;
}

/**
 * Image component that automatically ensures storage URLs are signed URLs
 * Falls back to a placeholder if the URL is invalid or cannot be signed
 */
export const StorageImage: React.FC<StorageImageProps> = ({
  src,
  fallbackSrc,
  alt,
  className,
  ...props
}) => {
  const signedUrl = useStorageImage(src);

  // If no signed URL and no fallback, show placeholder
  if (!signedUrl && !fallbackSrc) {
    return (
      <div
        className={cn(
          'bg-gray-100 flex items-center justify-center text-gray-400 text-xs',
          className
        )}
        {...(props as any)}
      >
        {alt || 'Image'}
      </div>
    );
  }

  return (
    <img
      src={signedUrl || fallbackSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        // If image fails to load, try to show fallback
        if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
          e.currentTarget.src = fallbackSrc;
        }
      }}
      {...props}
    />
  );
};
