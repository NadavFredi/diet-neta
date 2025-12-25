/**
 * FormResponseModal Component
 * 
 * Modal/Dialog to display form submission responses
 * Shows questions and answers in a clean, readable format
 */

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X, FileText } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFormSubmission, type FormType } from '@/store/slices/formsSlice';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface FormResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: FormType;
  submission: any | null;
  leadEmail: string;
}

export const FormResponseModal: React.FC<FormResponseModalProps> = ({
  isOpen,
  onClose,
  formType,
  submission,
  leadEmail,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.forms);

  const loading = isLoading[formType.key] || false;

  // Fetch submission if not already loaded
  useEffect(() => {
    if (isOpen && !submission && leadEmail) {
      dispatch(
        fetchFormSubmission({
          formType: formType.key as 'details' | 'intro' | 'characterization',
          email: leadEmail,
        })
      );
    }
  }, [isOpen, submission, leadEmail, formType.key, dispatch]);

  const formatAnswer = (value: any): string => {
    if (value === null || value === undefined) {
      return 'לא הוזן';
    }
    if (typeof value === 'boolean') {
      return value ? 'כן' : 'לא';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: he });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-purple-600" />
            {formType.label}
          </DialogTitle>
          <DialogDescription>
            תשובות שהגיש הלקוח בטופס
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
              <p className="text-sm text-slate-600">טוען תשובות...</p>
            </div>
          ) : !submission ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-base font-medium text-slate-600 mb-2">
                לא נמצאה הגשה
              </p>
              <p className="text-sm text-slate-500 text-center">
                הלקוח עדיין לא הגיש את הטופס הזה
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Submission Info */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 font-medium">תאריך הגשה:</span>
                    <p className="text-slate-900 font-semibold mt-1">
                      {formatDate(submission.submissionTime)}
                    </p>
                  </div>
                  {submission.lastUpdatedAt && submission.lastUpdatedAt !== submission.submissionTime && (
                    <div>
                      <span className="text-slate-500 font-medium">עודכן לאחרונה:</span>
                      <p className="text-slate-900 font-semibold mt-1">
                        {formatDate(submission.lastUpdatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Questions and Answers */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 mb-4">תשובות:</h3>
                {submission.questions && submission.questions.length > 0 ? (
                  <div className="space-y-4">
                    {submission.questions.map((question: any, index: number) => (
                      <div
                        key={question.id || index}
                        className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="mb-2">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {question.name || `שאלה ${index + 1}`}
                          </h4>
                          <span className="text-xs text-slate-400 mt-1 inline-block">
                            {question.type || 'לא צוין'}
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {formatAnswer(question.value)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    אין תשובות זמינות
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

