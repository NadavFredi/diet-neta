/**
 * BloodTestsGalleryCard Component (UI)
 * 
 * Pure presentation component - all logic is in BloodTestsGalleryCard.ts
 * Displays blood test PDFs uploaded by the client.
 * For manager/CRM view - shows PDFs from blood_tests table
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Loader2, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBloodTestsGalleryCard } from './BloodTestsGalleryCard.ts';
import { cn } from '@/lib/utils';

interface BloodTestsGalleryCardProps {
  leadId: string | null;
  customerId: string | null;
}

export const BloodTestsGalleryCard: React.FC<BloodTestsGalleryCardProps> = ({
  leadId,
  customerId,
}) => {
  const {
    bloodTests,
    isLoading,
    isManager,
    isUploading,
    isDragging,
    fileInputRef,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDelete,
    formatDate,
    handleDownload,
  } = useBloodTestsGalleryCard(leadId, customerId);

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
        {/* Upload Area (for managers only) */}
        {isManager && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-colors",
              isDragging
                ? "border-red-500 bg-red-50"
                : "border-gray-300 hover:border-red-400 hover:bg-gray-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-600 mb-2">
              גרור קובץ PDF לכאן או לחץ להעלאה
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
                  העלה קובץ PDF
                </>
              )}
            </Button>
          </div>
        )}

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
              {isManager 
                ? 'העלה קבצי בדיקות דם עבור הלקוח' 
                : 'הלקוח עדיין לא העלה קבצי בדיקות דם'}
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDownload(test.signedUrl, test.file_name, e)}
                    className="h-8 w-8 text-[#5B6FB9] hover:bg-[#5B6FB9]/10"
                    title="צפייה/הורדה"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(test.id, test.file_name, e)}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="מחיקה"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
