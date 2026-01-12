/**
 * BloodTestsGalleryCard Logic
 * 
 * Handles all business logic and data fetching for the manager view
 */

import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useBloodTests } from '@/hooks/useBloodTests';

export const useBloodTestsGalleryCard = (leadId: string | null) => {
  const { data: bloodTests = [], isLoading } = useBloodTests(leadId);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  // Handle download/view
  const handleDownload = (url: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  return {
    bloodTests,
    isLoading,
    formatDate,
    handleDownload,
  };
};
