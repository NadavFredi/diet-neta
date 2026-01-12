/**
 * BloodTestsGalleryCard Component (UI)
 * 
 * Pure presentation component - all logic is in BloodTestsGalleryCard.ts
 * Displays blood test PDFs uploaded by the client.
 * For manager/CRM view - shows PDFs from blood_tests table
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBloodTestsGalleryCard } from './BloodTestsGalleryCard.ts';

interface BloodTestsGalleryCardProps {
  leadId: string | null;
}

export const BloodTestsGalleryCard: React.FC<BloodTestsGalleryCardProps> = ({
  leadId,
}) => {
  const {
    bloodTests,
    isLoading,
    formatDate,
    handleDownload,
  } = useBloodTestsGalleryCard(leadId);

  if (!leadId) {
    return null;
  }

  return (
    <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <FileText className="h-4 w-4 text-red-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">בדיקות דם</h3>
      </div>

      <CardContent className="flex-1 p-0">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-[#5B6FB9]" />
            <p className="text-sm text-gray-500 mt-2">טוען קבצים...</p>
          </div>
        ) : bloodTests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium">אין קבצי בדיקות עדיין</p>
            <p className="text-xs text-gray-400 mt-1">
              הלקוח עדיין לא העלה קבצי בדיקות דם
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bloodTests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-[#5B6FB9] hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {test.file_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(test.upload_date)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDownload(test.signedUrl, test.file_name, e)}
                  className="h-8 w-8 text-[#5B6FB9] hover:bg-[#5B6FB9]/10 flex-shrink-0"
                  title="צפייה/הורדה"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
