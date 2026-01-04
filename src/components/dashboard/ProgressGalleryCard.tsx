/**
 * ProgressGalleryCard Component
 * 
 * Displays a gallery of progress photos uploaded by the trainee.
 * For manager/CRM view - shows photos from client-assets/[customer_id]/progress/
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ProgressPhoto {
  url: string;
  path: string;
  uploadedAt: string;
}

interface ProgressGalleryCardProps {
  customerId: string | null;
}

export const ProgressGalleryCard: React.FC<ProgressGalleryCardProps> = ({
  customerId,
}) => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch progress photos
  useEffect(() => {
    const fetchPhotos = async () => {
      if (!customerId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase.storage
          .from('client-assets')
          .list(`${customerId}/progress`, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (error) {
          // If storage is not available, just return empty array
          if (error.message?.includes('name resolution failed') || error.message?.includes('503')) {
            console.warn('Storage service not available');
            setPhotos([]);
            setIsLoading(false);
            return;
          }
          throw error;
        }

        // Get signed URLs for each photo
        const photosWithUrls: ProgressPhoto[] = await Promise.all(
          (data || []).map(async (file) => {
            const { data: urlData } = await supabase.storage
              .from('client-assets')
              .createSignedUrl(`${customerId}/progress/${file.name}`, 3600);

            return {
              url: urlData?.signedUrl || '',
              path: `${customerId}/progress/${file.name}`,
              uploadedAt: file.created_at || file.updated_at || new Date().toISOString(),
            };
          })
        );

        setPhotos(photosWithUrls);
      } catch (error: any) {
        console.error('Error fetching progress photos:', error);
        // Don't show error toast for empty folder (expected case) or storage unavailable
        if (error?.message?.includes('not found') || error?.statusCode === '404' || 
            error?.message?.includes('name resolution failed') || error?.message?.includes('503')) {
          setPhotos([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [customerId]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  if (!customerId) {
    return null;
  }

  return (
    <>
      <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">התקדמות ויזואלית</h3>
        </div>

        <CardContent className="flex-1 p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-[#5B6FB9]" />
              <p className="text-sm text-gray-500 mt-2">טוען תמונות...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium">אין תמונות התקדמות עדיין</p>
              <p className="text-xs text-gray-400 mt-1">
                הלקוח עדיין לא העלה תמונות התקדמות
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.path}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-[#5B6FB9] transition-colors"
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <img
                    src={photo.url}
                    alt={`Progress photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white text-center">
                      {formatDate(photo.uploadedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={photos.map(p => p.url)}
        currentIndex={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
};

