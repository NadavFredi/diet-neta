/**
 * ProgressGalleryCard Component
 * 
 * Displays a gallery of progress photos uploaded by the trainee or manager.
 * For manager/CRM view - shows photos from client-assets/[customer_id]/progress/
 * Managers can upload and delete photos for clients.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2, Upload, Trash2 } from 'lucide-react';
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
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is a manager (admin or user role)
  const isManager = user?.role === 'admin' || user?.role === 'user';

  // Fetch progress photos
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
      // Don't show error toast for empty folder (expected case) or storage unavailable
      if (error?.message?.includes('not found') || error?.statusCode === '404' || 
          error?.message?.includes('name resolution failed') || error?.message?.includes('503')) {
        setPhotos([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [customerId]);

  // Handle file upload (for managers)
  const handleFileUpload = async (file: File) => {
    if (!customerId || !isManager) return;

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
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן היה להעלות את התמונה',
        variant: 'destructive',
      });
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
    if (isManager) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isManager) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle delete photo (for managers)
  const handleDeletePhoto = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isManager) return;

    setPhotoToDelete(path);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete || !isManager) return;

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
          {/* Upload Area (for managers only) */}
          {isManager && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-colors",
                isDragging
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
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
              <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-xs text-gray-600 mb-2">
                גרור תמונה לכאן או לחץ להעלאה
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 ml-1" />
                    העלה תמונה
                  </>
                )}
              </Button>
            </div>
          )}
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
                {isManager 
                  ? 'העלה תמונות התקדמות עבור הלקוח' 
                  : 'הלקוח עדיין לא העלה תמונות התקדמות'}
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
                  {/* Delete button for managers */}
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeletePhoto(photo.path, e)}
                      className="absolute top-2 left-2 h-7 w-7 bg-red-500/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="מחיקה"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
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

