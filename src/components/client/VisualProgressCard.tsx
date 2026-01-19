/**
 * VisualProgressCard Component
 * 
 * Allows clients to upload, view, and delete progress photos.
 * Files are stored in Supabase Storage: [client_id]/progress/[file_name]
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProgressPhoto {
  url: string;
  path: string;
  uploadedAt: string;
}

interface VisualProgressCardProps {
  customerId: string;
}

export const VisualProgressCard: React.FC<VisualProgressCardProps> = ({
  customerId,
}) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch progress photos
  const fetchPhotos = async () => {
    if (!customerId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.storage
        .from('client-assets')
        .list(`${customerId}/progress`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        // If storage is not available (503 or connection error), show user-friendly message
        if (error.message?.includes('name resolution failed') || error.message?.includes('503')) {
          console.warn('Storage service not available. This is expected in local development if storage is disabled.');
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
      console.error('Error fetching photos:', error);
      // Don't show error toast if storage is simply not available
      if (error.message?.includes('name resolution failed') || error.message?.includes('503')) {
        console.warn('Storage service not available');
        setPhotos([]);
      } else {
        toast({
          title: 'שגיאה',
          description: 'לא ניתן היה לטעון את התמונות',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [customerId]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!customerId) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'סוג קובץ לא נתמך',
        description: 'אנא העלה תמונה בפורמט JPG, PNG, GIF או WebP',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'קובץ גדול מדי',
        description: 'גודל הקובץ לא יכול לעלות על 10MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${customerId}/progress/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      toast({
        title: 'הצלחה',
        description: 'התמונה הועלתה בהצלחה',
      });

      // Refresh photos list
      await fetchPhotos();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      // Check if storage is not available
      if (error.message?.includes('name resolution failed') || error.message?.includes('503')) {
        toast({
          title: 'שירות האחסון לא זמין',
          description: 'אנא הפעל את שירות האחסון ב-Supabase או השתמש בסביבת ייצור',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'שגיאה',
          description: error?.message || 'לא ניתן היה להעלות את התמונה',
          variant: 'destructive',
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle delete photo
  const handleDeletePhoto = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoToDelete(path);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      const { error } = await supabase.storage
        .from('client-assets')
        .remove([photoToDelete]);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'התמונה נמחקה',
      });

      // Refresh photos list
      await fetchPhotos();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה למחוק את התמונה',
        variant: 'destructive',
      });
    } finally {
      setPhotoToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-[#5B6FB9]" />
            התקדמות ויזואלית
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              isDragging
                ? "border-[#5B6FB9] bg-[#5B6FB9]/5"
                : "border-gray-300 hover:border-[#5B6FB9] hover:bg-gray-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">
              גרור תמונה לכאן או לחץ להעלאה
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  מעלה...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 ml-2" />
                  העלה תמונה
                </>
              )}
            </Button>
          </div>

          {/* Photos Gallery */}
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-[#5B6FB9]" />
              <p className="text-sm text-gray-500 mt-2">טוען תמונות...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">אין תמונות עדיין</p>
              <p className="text-xs text-gray-400 mt-1">העלה תמונה ראשונה למעלה</p>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeletePhoto(photo.path, e)}
                    className="absolute top-2 right-2 h-7 w-7 bg-red-500/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תמונה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התמונה? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogAction
              onClick={confirmDeletePhoto}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              מחק
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setPhotoToDelete(null);
            }}>
              ביטול
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

