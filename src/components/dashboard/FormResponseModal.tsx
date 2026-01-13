/**
 * FormResponseModal Component
 * 
 * Modal/Dialog to display form submission responses
 * Shows questions and answers in a clean, readable format
 */

import React, { useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X, FileText, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFormSubmission, type FormType } from '@/store/slices/formsSlice';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface FormResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: FormType;
  submission: any | null;
  leadId?: string; // Supabase lead row ID (priority for matching)
  leadEmail?: string;
  leadPhone?: string;
}

export const FormResponseModal: React.FC<FormResponseModalProps> = ({
  isOpen,
  onClose,
  formType,
  submission,
  leadId,
  leadEmail,
  leadPhone,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.forms);

  const loading = isLoading[formType.key] || false;
  const formError = error;

  // Fetch submission when modal opens
  const fetchData = React.useCallback(() => {
    if (leadId || leadEmail || leadPhone) {
      console.log('[FormResponseModal] Fetching submission:', {
        formType: formType.key,
        formId: formType.formId,
        leadId,
        leadEmail,
        leadPhone,
      });
      
      dispatch(
        fetchFormSubmission({
          formType: formType.key as 'details' | 'intro' | 'characterization',
          leadId: leadId, // Priority: use lead_id for matching
          email: leadEmail,
          phoneNumber: leadPhone,
        })
      ).catch((err) => {
        console.error('[FormResponseModal] Error fetching submission:', err);
      });
    }
  }, [leadId, leadEmail, leadPhone, formType.key, formType.formId, dispatch]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

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
          ) : formError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-red-300 mb-4" />
              <p className="text-base font-medium text-red-600 mb-2">
                שגיאה בטעינת הטופס
              </p>
              <p className="text-sm text-red-500 text-center mb-4">
                {formError}
              </p>
              <div className="text-xs text-slate-400 text-center space-y-1">
                <p>פרטי חיפוש:</p>
                <p>טופס: {formType.formId || 'לא הוגדר'}</p>
                {leadId && <p>מזהה ליד (Lead ID): <strong>{leadId}</strong></p>}
                {leadPhone && <p>טלפון: {leadPhone}</p>}
                {leadEmail && <p>אימייל: {leadEmail}</p>}
              </div>
            </div>
          ) : !submission ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-base font-medium text-slate-600 mb-2">
                לא נמצאה הגשה
              </p>
              <p className="text-sm text-slate-500 text-center mb-4">
                הלקוח עדיין לא הגיש את הטופס הזה
              </p>
              <div className="text-xs text-slate-400 text-center space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                <p className="font-semibold text-slate-600 mb-2">פרטי חיפוש:</p>
                <p>מזהה טופס: <code className="bg-white px-1 rounded">{formType.formId || 'לא הוגדר'}</code></p>
                {leadId && <p>מזהה ליד (Lead ID): <code className="bg-white px-1 rounded font-semibold">{leadId}</code></p>}
                {leadPhone && <p>מספר טלפון: <code className="bg-white px-1 rounded">{leadPhone}</code></p>}
                {leadEmail && <p>אימייל: <code className="bg-white px-1 rounded">{leadEmail}</code></p>}
                <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200 text-right">
                  <p className="font-semibold mb-1">משתני סביבה:</p>
                  <div className="space-y-0.5">
                    <p>VITE_FILLOUT_FORM_ID_DETAILS: <code className="bg-white px-1 rounded">{import.meta.env.VITE_FILLOUT_FORM_ID_DETAILS || 'לא הוגדר'}</code></p>
                    <p>VITE_FILLOUT_FORM_ID_INTRO: <code className="bg-white px-1 rounded">{import.meta.env.VITE_FILLOUT_FORM_ID_INTRO || 'לא הוגדר'}</code></p>
                    <p>VITE_FILLOUT_FORM_ID_CHARACTERIZATION: <code className="bg-white px-1 rounded">{import.meta.env.VITE_FILLOUT_FORM_ID_CHARACTERIZATION || 'לא הוגדר'}</code></p>
                    <p className="text-xs text-gray-500">API keys are secured via Edge Functions (not exposed to frontend)</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                  💡 בדוק את הקונסול (F12) למידע נוסף. לאחר עדכון .env.local יש לאתחל את השרת.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                  className="mt-3 h-8 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ml-1 ${loading ? 'animate-spin' : ''}`} />
                  רענון
                </Button>
              </div>
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


