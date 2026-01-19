/**
 * LeadFormsCard Component
 * 
 * Displays Fillout form submissions for a lead
 * Only shows forms that have been filled and are related to the lead
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { fetchFormSubmission, getFormTypes, type FormType } from '@/store/slices/formsSlice';
import { setSelectedFormType } from '@/store/slices/leadViewSlice';
import { getFormSubmissionsByTypeForLead, type FilloutSubmission } from '@/services/filloutService';

interface LeadFormsCardProps {
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadId?: string | null; // Supabase lead row ID (for matching form submissions)
}

export const LeadFormsCard: React.FC<LeadFormsCardProps> = ({ leadEmail, leadPhone, leadId }) => {
  const dispatch = useAppDispatch();
  const [submissionsByType, setSubmissionsByType] = useState<Record<string, FilloutSubmission>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch form submissions from database when leadId changes
  useEffect(() => {
    if (!leadId) {
      setSubmissionsByType({});
      return;
    }

    const fetchSubmissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const submissions = await getFormSubmissionsByTypeForLead(leadId);
        setSubmissionsByType(submissions);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch form submissions');
        setSubmissionsByType({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [leadId]);

  const handleFormClick = (formType: FormType) => {
    // Ensure the submission is loaded into Redux for the sidebar to access
    if (leadId) {
      dispatch(
        fetchFormSubmission({
          formType: formType.key as 'details' | 'intro' | 'characterization',
          leadId: leadId,
          email: leadEmail || undefined,
          phoneNumber: leadPhone || undefined,
        })
      );
    }
    // Open submission sidebar with this form type (this will close history sidebar automatically)
    dispatch(setSelectedFormType(formType.key as 'details' | 'intro' | 'characterization'));
  };

  if (!leadId && !leadEmail && !leadPhone) {
    return null;
  }

  // Get all form types and filter to only show those with submissions
  const allFormTypes = getFormTypes();
  const formTypesWithSubmissions = allFormTypes.filter((formType) => {
    // Skip details form (first row)
    if (formType.key === 'details') {
      return false;
    }
    // Only show forms that have submissions
    return !!submissionsByType[formType.key];
  });

  const hasSubmissions = formTypesWithSubmissions.length > 0;

  return (
    <>
      <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">טופסי מילוי</h3>
        </div>
        <CardContent className="p-0 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 py-4">{error}</div>
          ) : hasSubmissions ? (
            <div className="space-y-3">
              {formTypesWithSubmissions.map((formType) => {
                const submission = submissionsByType[formType.key];
                const hasSubmission = !!submission;

                return (
                  <Button
                    key={formType.key}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-4 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                    onClick={() => handleFormClick(formType)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900">
                          {formType.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasSubmission && (
                          <span className="text-xs text-green-600 font-medium">נמצא</span>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-slate-500">אין טפסים שהוגשו</span>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
};


