/**
 * GifPicker Component
 * 
 * Professional GIF picker with search functionality using Giphy API
 * Displays trending GIFs initially, allows real-time search with debounce
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { fetchTrendingGifs, searchGifs, getGifUrl, getGifThumbnailUrl, type GiphyGif } from '@/services/giphyService';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose?: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch GIFs
  const fetchGifs = useCallback(async (query: string, reset: boolean = false, currentOffset: number = 0) => {
    try {
      if (reset) {
        setIsLoading(true);
        setHasMore(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);
      const fetchedGifs = query.trim() 
        ? await searchGifs(query, 20, currentOffset)
        : await fetchTrendingGifs(20, currentOffset);

      if (reset) {
        setGifs(fetchedGifs);
        setOffset(fetchedGifs.length);
      } else {
        setGifs(prev => [...prev, ...fetchedGifs]);
        setOffset(prev => prev + fetchedGifs.length);
      }

      setHasMore(fetchedGifs.length >= 20);
    } catch (err: any) {
      console.error('[GifPicker] Error fetching GIFs:', err);
      setError(err.message || 'נכשל בטעינת GIFs');
      if (reset) {
        setGifs([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load and when search query changes
  useEffect(() => {
    fetchGifs(debouncedSearchQuery, true, 0);
  }, [debouncedSearchQuery, fetchGifs]);

  // Handle GIF selection
  const handleGifSelect = useCallback((gif: GiphyGif) => {
    const gifUrl = getGifUrl(gif);
    onSelect(gifUrl);
    onClose?.();
  }, [onSelect, onClose]);

  // Handle scroll to load more
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  
  useEffect(() => {
    const container = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!container) return;

    const handleScroll = () => {
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      
      if (scrollBottom < 200 && hasMore && !isLoadingMore && !isLoading) {
        fetchGifs(debouncedSearchQuery, false, offsetRef.current);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, isLoading, debouncedSearchQuery, fetchGifs]);

  return (
    <div className="flex flex-col w-[400px] h-[500px] bg-white rounded-lg border border-slate-200 shadow-lg" dir="rtl">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={debouncedSearchQuery ? 'חיפוש GIFs...' : 'חיפוש GIFs או תצוגת טרנדים'}
            className="pr-9 text-sm bg-slate-50 border-slate-200 focus:bg-white"
            dir="rtl"
          />
        </div>
      </div>

      {/* GIF Grid */}
      <div className="flex-1 overflow-hidden" ref={scrollContainerRef}>
        <ScrollArea className="h-full p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#5B6FB9] mb-4" />
            <p className="text-sm text-slate-500">טוען GIFs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-8 w-8 text-slate-300 mb-4" />
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <p className="text-xs text-slate-400">נסה לרענן או לבדוק את החיבור לאינטרנט</p>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-8 w-8 text-slate-300 mb-4" />
            <p className="text-sm text-slate-500 mb-2">לא נמצאו תוצאות</p>
            <p className="text-xs text-slate-400">נסה לחפש משהו אחר</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => handleGifSelect(gif)}
                className={cn(
                  "relative group aspect-square rounded-lg overflow-hidden",
                  "border border-slate-200 hover:border-[#5B6FB9] hover:shadow-md",
                  "transition-all duration-200 cursor-pointer",
                  "bg-slate-100"
                )}
              >
                <img
                  src={getGifThumbnailUrl(gif)}
                  alt={gif.title || 'GIF'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#5B6FB9]" />
          </div>
        )}
        </ScrollArea>
      </div>
    </div>
  );
};
