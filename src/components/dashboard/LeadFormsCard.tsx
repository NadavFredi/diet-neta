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
    <div className="flex flex-col gap-4 h-full">
      {/* Fillout Forms Card */}
      <Card className="p-4 sm:p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shadow-sm">
            <FileCheck className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">טופסי מילוי</h3>
            <p className="text-xs text-gray-500 mt-0.5">שאלונים שהוגשו על ידי הלקוח</p>
          </div>
        </div>
        <CardContent className="p-0 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 py-4">{error}</div>
          ) : formTypesWithSubmissions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {formTypesWithSubmissions.map((formType) => {
                const submission = submissionsByType[formType.key];
                const hasSubmission = !!submission;

                return (
                  <Button
                    key={formType.key}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3.5 px-4 hover:bg-purple-50/50 border border-slate-200 rounded-lg transition-all duration-200 hover:border-purple-200 hover:shadow-sm"
                    onClick={() => handleFormClick(formType)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {formType.label}
                        </span>
                      </div>
                      {hasSubmission && (
                        <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md">
                          נמצא
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <span className="text-sm text-slate-500">אין טפסים שהוגשו</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prospero Proposals Card */}
      <Card className="p-4 sm:p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">הצעות Prospero</h3>
            <p className="text-xs text-gray-500 mt-0.5">יצירת והפצת הצעות מקצועיות</p>
          </div>
        </div>
        <CardContent className="p-0 flex-1">
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-4 px-4 hover:bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-lg transition-all duration-200 hover:border-blue-300 hover:shadow-sm bg-blue-50/30"
            onClick={handleProsperoClick}
            disabled={isCreatingProspero}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900 block">
                    יצירת הצעה חדשה
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    לחץ ליצירת הצעה ולשליחתה ללקוח
                  </span>
                </div>
              </div>
              {isCreatingProspero ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-md">
                  חדש
                </span>
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


