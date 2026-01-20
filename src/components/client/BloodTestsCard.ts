/**
 * BloodTestsCard Logic
 * 
 * Handles all business logic, state management, and event handlers
 */

import { useState, useRef } from 'react';
import { useBloodTests, useBloodTestsForCustomer, useUploadBloodTest, useDeleteBloodTest } from '@/hooks/useBloodTests';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export const useBloodTestsCard = (customerId: string, leads?: Array<{ id: string }>) => {
  const { toast } = useToast();
  // Fetch blood tests from all customer leads
  const { data: bloodTests = [], isLoading } = useBloodTestsForCustomer(customerId);
  const uploadMutation = useUploadBloodTest();
  const deleteMutation = useDeleteBloodTest();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    // Use the first/most recent lead for uploads (if available)
    const leadIdForUpload = leads && leads.length > 0 ? leads[0].id : null;
    if (!leadIdForUpload || !customerId) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא lead לעדכון',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      toast({
        title: 'סוג קובץ לא נתמך',
        description: 'אנא העלה קובץ PDF בלבד',
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
      await uploadMutation.mutateAsync({
        leadId: leadIdForUpload,
        file,
        customerId,
      });

      toast({
        title: 'הצלחה',
        description: 'קובץ הבדיקה הועלה בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן היה להעלות את הקובץ',
        variant: 'destructive',
      });
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

  // Handle delete
  const handleDelete = async (testId: string) => {
    try {
      await deleteMutation.mutateAsync(testId);
      toast({
        title: 'הצלחה',
        description: 'קובץ הבדיקה נמחק',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה למחוק את הקובץ',
        variant: 'destructive',
      });
    }
  };

  // Handle download/view
  const handleDownload = (url: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  return {
    bloodTests,
    isLoading,
    uploadMutation,
    deleteMutation,
    fileInputRef,
    isDragging,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDelete,
    handleDownload,
    formatDate,
  };
};
