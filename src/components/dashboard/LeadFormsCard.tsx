/**
 * LeadFormsCard Component
 * 
 * Displays Fillout form submissions for a lead
 * Shows three forms: טופס פרטים, שאלון היכרות, שאלון איפיון
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFormSubmission, getFormTypes, type FormType } from '@/store/slices/formsSlice';
import { setSelectedFormType } from '@/store/slices/leadViewSlice';

interface LeadFormsCardProps {
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadId?: string | null; // Supabase lead row ID (for matching form submissions)
}

export const LeadFormsCard: React.FC<LeadFormsCardProps> = ({ leadEmail, leadPhone, leadId }) => {
  const dispatch = useAppDispatch();
  const { submissions, isLoading, error } = useAppSelector((state) => state.forms);

  // Fetch all form submissions when component mounts or leadId/email/phone changes
  useEffect(() => {
    console.log('[LeadFormsCard] useEffect triggered:', {
      leadId: leadId || 'NULL/UNDEFINED',
      leadIdType: typeof leadId,
      leadIdTruthy: !!leadId,
      leadEmail: leadEmail || 'NULL/UNDEFINED',
      leadPhone: leadPhone || 'NULL/UNDEFINED',
      hasAnyIdentifier: !!(leadId || leadEmail || leadPhone),
    });
    
    if (leadId || leadEmail || leadPhone) {
      const formTypes = getFormTypes();
      
      // Debug: Log form IDs (not sensitive - these are public form identifiers)
      console.log('[LeadFormsCard] Form IDs check:', {
        VITE_FILLOUT_FORM_ID_DETAILS: import.meta.env.VITE_FILLOUT_FORM_ID_DETAILS || '❌ Missing',
        VITE_FILLOUT_FORM_ID_INTRO: import.meta.env.VITE_FILLOUT_FORM_ID_INTRO || '❌ Missing',
        VITE_FILLOUT_FORM_ID_CHARACTERIZATION: import.meta.env.VITE_FILLOUT_FORM_ID_CHARACTERIZATION || '❌ Missing',
        note: 'API keys are secured via Edge Functions',
      });
      
      console.log('[LeadFormsCard] Fetching form submissions:', {
        leadId: leadId || 'NULL/UNDEFINED',
        leadIdType: typeof leadId,
        leadIdLength: leadId?.length,
        leadEmail: leadEmail || 'NULL/UNDEFINED',
        leadPhone: leadPhone || 'NULL/UNDEFINED',
        leadPhoneType: typeof leadPhone,
        leadPhoneLength: leadPhone?.length,
        formTypes: formTypes.map(f => ({ key: f.key, formId: f.formId, label: f.label })),
      });
      
      formTypes
        .filter((formType) => formType.key !== 'details') // Skip details form (first row)
        .forEach((formType) => {
          // Skip if form ID is not configured or is still a placeholder
          if (!formType.formId || 
              formType.formId === 'your_characterization_form_id' ||
              formType.formId.trim() === '') {
            console.warn(`[LeadFormsCard] Skipping ${formType.label} - form ID not configured or is placeholder: "${formType.formId}"`);
            return;
          }
          
          dispatch(
            fetchFormSubmission({
              formType: formType.key as 'details' | 'intro' | 'characterization',
              leadId: leadId || undefined, // Priority: use lead_id for matching
              email: leadEmail || undefined,
              phoneNumber: leadPhone || undefined,
            })
          );
        });
    } else {
      console.log('[LeadFormsCard] Skipping fetch - no leadId, email, or phone provided');
    }
  }, [leadId, leadEmail, leadPhone, dispatch]);

  const handleFormClick = (formType: FormType) => {
    // Fetch the submission if not already loaded
    const submission = submissions[formType.key];
    if (!submission && !isLoading[formType.key]) {
      dispatch(
        fetchFormSubmission({
          formType: formType.key as 'details' | 'intro' | 'characterization',
          leadId: leadId || undefined,
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
          <div className="space-y-3">
            {getFormTypes()
              .filter((formType) => formType.key !== 'details') // Remove details form (first row)
              .map((formType) => {
                const submission = submissions[formType.key];
                const loading = isLoading[formType.key] || false;
                const hasSubmission = !!submission;

                return (
                  <Button
                    key={formType.key}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-4 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                    onClick={() => handleFormClick(formType)}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900">
                          {formType.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : hasSubmission ? (
                          <span className="text-xs text-green-600 font-medium">נמצא</span>
                        ) : (
                          <span className="text-xs text-slate-400">אין הגשה</span>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
          </div>
        </CardContent>
      </Card>

    </>
  );
};


