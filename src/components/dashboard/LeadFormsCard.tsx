/**
 * LeadFormsCard Component
 * 
 * Displays Fillout form submissions for a lead
 * Only shows forms that have been filled and are related to the lead
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, FileCheck, Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { fetchFormSubmission, getFormTypes, type FormType } from '@/store/slices/formsSlice';
import { setSelectedFormType } from '@/store/slices/leadViewSlice';
import { getFormSubmissionsByTypeForLead, type FilloutSubmission } from '@/services/filloutService';
import { createProsperoProposal } from '@/services/prosperoService';
import { useToast } from '@/hooks/use-toast';
import { SendProsperoLinkDialog } from './dialogs/SendProsperoLinkDialog';

interface LeadFormsCardProps {
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadId?: string | null; // Supabase lead row ID (for matching form submissions)
  leadName?: string | null; // Lead/customer name
}

export const LeadFormsCard: React.FC<LeadFormsCardProps> = ({ leadEmail, leadPhone, leadId, leadName }) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [submissionsByType, setSubmissionsByType] = useState<Record<string, FilloutSubmission>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prosperoLink, setProsperoLink] = useState<string | null>(null);
  const [isProsperoDialogOpen, setIsProsperoDialogOpen] = useState(false);
  const [isCreatingProspero, setIsCreatingProspero] = useState(false);

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

  const handleFormClick = async (formType: FormType) => {
    // Handle Prospero form separately
    if (formType.key === 'prospero') {
      await handleProsperoClick();
      return;
    }

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

  const handleProsperoClick = async () => {
    if (!leadId || !leadPhone) {
      toast({
        title: 'שגיאה',
        description: 'נדרש מזהה לקוח ומספר טלפון ליצירת הצעה',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingProspero(true);
    try {
      const link = await createProsperoProposal({
        leadId,
        leadPhone,
        leadEmail: leadEmail || undefined,
      });

      if (link) {
        setProsperoLink(link);
        setIsProsperoDialogOpen(true);
      } else {
        toast({
          title: 'שגיאה',
          description: 'לא התקבל קישור מהשרת',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת הצעה',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingProspero(false);
    }
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

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Fillout Forms Card */}
      <Card className="p-3 border border-slate-100 rounded-lg shadow-sm bg-white flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center">
            <FileCheck className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">טופסי מילוי</h3>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="text-xs text-red-600 py-2">{error}</div>
          ) : formTypesWithSubmissions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {formTypesWithSubmissions.map((formType) => {
                const submission = submissionsByType[formType.key];
                const hasSubmission = !!submission;

                return (
                  <Button
                    key={formType.key}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3 hover:bg-purple-50/50 border border-slate-200 rounded-md transition-all duration-200 hover:border-purple-200"
                    onClick={() => handleFormClick(formType)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-900">
                          {formType.label}
                        </span>
                      </div>
                      {hasSubmission && (
                        <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">
                          נמצא
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-center">
              <span className="text-xs text-slate-500">אין טפסים שהוגשו</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prospero Proposals Card */}
      <Card className="p-3 border border-slate-100 rounded-lg shadow-sm bg-white flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">הצעות Prospero</h3>
        </div>
        <CardContent className="p-0">
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-2.5 px-3 hover:bg-blue-50/50 border border-dashed border-blue-200 rounded-md transition-all duration-200 hover:border-blue-300 bg-blue-50/20"
            onClick={handleProsperoClick}
            disabled={isCreatingProspero}
          >
            <div className="flex items-center gap-2 w-full">
              <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-900">
                יצירת הצעה חדשה
              </span>
              {isCreatingProspero && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 mr-auto" />
              )}
            </div>
          </Button>
        </CardContent>
      </Card>

      {prosperoLink && (
        <SendProsperoLinkDialog
          isOpen={isProsperoDialogOpen}
          onClose={() => {
            setIsProsperoDialogOpen(false);
            setProsperoLink(null);
          }}
          prosperoLink={prosperoLink}
          leadPhone={leadPhone || ''}
          leadName={leadName || leadEmail || 'לקוח/ה'}
        />
      )}
    </div>
  );
};


