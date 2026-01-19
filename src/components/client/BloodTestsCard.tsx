/**
 * BloodTestsCard Component (UI)
 * 
 * Pure presentation component - all logic is in BloodTestsCard.ts
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useBloodTestsCard } from './BloodTestsCard.ts';

interface BloodTestsCardProps {
  customerId: string;
  leads?: Array<{ id: string }>;
}

export const BloodTestsCard: React.FC<BloodTestsCardProps> = ({
  customerId,
  leads,
}) => {
  const {
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
  } = useBloodTestsCard(customerId, leads);

  const [testToDelete, setTestToDelete] = useState<{ id: string, fileName: string } | null>(null);

  return (
    <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#5B6FB9]" />
          בדיקות דם
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
            accept="application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">
            גרור קובץ PDF לכאן או לחץ להעלאה
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            size="sm"
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 ml-2" />
                העלה קובץ PDF
              </>
            )}
          </Button>
        </div>

        {/* Blood Tests List */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-[#5B6FB9]" />
            <p className="text-sm text-gray-500 mt-2">טוען קבצים...</p>
          </div>
        ) : bloodTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">אין קבצי בדיקות עדיין</p>
            <p className="text-xs text-gray-400 mt-1">העלה קובץ PDF ראשון למעלה</p>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTestToDelete({ id: test.id, fileName: test.file_name });
                    }}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!testToDelete} onOpenChange={(open) => !open && setTestToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת בדיקת דם</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הקובץ "{testToDelete?.fileName}"? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogAction
              onClick={() => {
                if (testToDelete) {
                  handleDelete(testToDelete.id);
                  setTestToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              מחק
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setTestToDelete(null)}>
              ביטול
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
