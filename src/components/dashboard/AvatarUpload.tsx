import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useUpdateCustomer } from '@/hooks/useUpdateCustomer';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  customerId: string;
  currentAvatarUrl?: string | null;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onUploadComplete?: (url: string) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  customerId,
  currentAvatarUrl,
  name,
  className,
  size = 'md',
  editable = true,
  onUploadComplete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();

  // Fetch signed URL on mount if we have a currentAvatarUrl that looks like a storage path
  React.useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!currentAvatarUrl) return;

      // Check if it's a supabase storage URL
      if (currentAvatarUrl.includes('client-assets')) {
        try {
          // Extract path from URL
          // URL format: https://.../storage/v1/object/public/client-assets/path/to/file
          // We need: path/to/file
          const path = currentAvatarUrl.split('client-assets/')[1];
          if (path) {
            const { data, error } = await supabase.storage
              .from('client-assets')
              .createSignedUrl(path, 3600); // 1 hour expiry

            if (!error && data) {
              setSignedUrl(data.signedUrl);
            }
          }
        } catch (error) {
        }
      } else {
        // If it's not a storage URL (e.g. external URL), just use it
        setSignedUrl(currentAvatarUrl);
      }
    };

    fetchSignedUrl();
  }, [currentAvatarUrl]);

  const sizeClasses = {
    sm: 'h-10 w-10 text-xs',
    md: 'h-16 w-16 text-base',
    lg: 'h-24 w-24 text-xl',
    xl: 'h-32 w-32 text-2xl'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10'
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר קובץ תמונה תקין',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'שגיאה',
        description: 'גודל הקובץ חייב להיות קטן מ-5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      // Use the same folder structure as ProgressGalleryCard: {customerId}/[folder]/{filename}
      const filePath = `${customerId}/avatar/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
          throw new Error('אין הרשאה להעלות תמונות. אנא ודא שיש לך הרשאות מתאימות.');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-assets')
        .getPublicUrl(filePath);

      // Set local preview immediately
      setPreviewUrl(URL.createObjectURL(file));

      // Update customer record
      // Note: Since the bucket is private, we store the full path/URL.
      // Consumers of this URL will need to handle signing if it's a private bucket path.
      // However, for now we store the public URL format which is what we have.
      // If persistence is an issue (broken image on reload), we might need to change this 
      // to store the path and sign it on read, similar to ProgressGalleryCard.
      await updateCustomer.mutateAsync({
        customerId,
        updates: { avatar_url: publicUrl }
      });

      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }

      toast({
        title: 'הצלחה',
        description: 'תמונת הפרופיל עודכנה בהצלחה',
      });

    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message || 'נכשל בהעלאת התמונה',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (editable && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn("relative group inline-block", className)}>
      <Avatar 
        className={cn(
          sizeClasses[size], 
          "border-2 border-white shadow-sm ring-1 ring-gray-100",
          editable && "cursor-pointer"
        )}
        onClick={handleClick}
      >
        <AvatarImage 
          src={previewUrl || signedUrl || currentAvatarUrl || undefined} 
          alt={name} 
          className="object-cover h-full w-full" 
        />
        <AvatarFallback className="bg-[#5B6FB9] text-white font-semibold flex items-center justify-center w-full h-full">
          {getInitials(name)}
        </AvatarFallback>

        {/* Overlay for uploading or hover */}
        {editable && (
          <div className={cn(
            "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200",
            isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {isUploading ? (
              <Loader2 className={cn("text-white animate-spin", iconSizes[size])} />
            ) : (
              <Camera className={cn("text-white opacity-90", iconSizes[size])} />
            )}
          </div>
        )}
      </Avatar>

      {editable && (
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      )}
    </div>
  );
};
