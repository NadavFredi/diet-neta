/**
 * BloodTestsGalleryCard Logic
 * 
 * Handles all business logic and data fetching for the manager view
 */

import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useRef, useState } from 'react';
import { useBloodTests, useUploadBloodTest, useDeleteBloodTest } from '@/hooks/useBloodTests';
import { useAppSelector } from '@/store/hooks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const useBloodTestsGalleryCard = (leadId: string | null, customerId: string | null) => {
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { data: bloodTests = [], isLoading } = useBloodTests(leadId);
  const uploadMutation = useUploadBloodTest();
  const deleteMutation = useDeleteBloodTest();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Check if user is a manager (admin or user role)
  const isManager = user?.role === 'admin' || user?.role === 'user';

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  // Handle file upload (for managers)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !leadId || !customerId || !isManager) return;

    uploadMutation.mutate(
      { leadId, file, customerId },
      {
        onSuccess: () => {
          toast({
            title: 'הצלחה',
            description: 'קובץ הבדיקה הועלה בהצלחה',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'שגיאה',
            description: error?.message || 'לא ניתן היה להעלות את הקובץ',
            variant: 'destructive',
          });
        },
      }
    );

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

    if (!isManager || !leadId || !customerId) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadMutation.mutate(
        { leadId, file, customerId },
        {
          onSuccess: () => {
            toast({
              title: 'הצלחה',
              description: 'קובץ הבדיקה הועלה בהצלחה',
            });
          },
          onError: (error: any) => {
            toast({
              title: 'שגיאה',
              description: error?.message || 'לא ניתן היה להעלות את הקובץ',
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  // Handle delete (for managers)
  const handleDelete = (testId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isManager) return;

    if (!confirm(`האם אתה בטוח שברצונך למחוק את הקובץ "${fileName}"?`)) return;

    deleteMutation.mutate(testId, {
      onSuccess: () => {
        toast({
          title: 'הצלחה',
          description: 'קובץ הבדיקה נמחק',
        });
      },
      onError: (error: any) => {
        toast({
          title: 'שגיאה',
          description: error?.message || 'לא ניתן היה למחוק את הקובץ',
          variant: 'destructive',
        });
      },
    });
  };

  // Handle download/view
  const handleDownload = (url: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  return {
    bloodTests,
    isLoading,
    isManager,
    isUploading: uploadMutation.isPending,
    isDragging,
    fileInputRef,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDelete,
    deleteMutation,
    formatDate,
    handleDownload,
  };
};
