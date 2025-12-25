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
import { fetchFormSubmission, FORM_TYPES, type FormType } from '@/store/slices/formsSlice';
import { FormResponseModal } from './FormResponseModal';

interface LeadFormsCardProps {
  leadEmail: string | null;
}

export const LeadFormsCard: React.FC<LeadFormsCardProps> = ({ leadEmail }) => {
  const dispatch = useAppDispatch();
  const { submissions, isLoading } = useAppSelector((state) => state.forms);
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all form submissions when component mounts or email changes
  useEffect(() => {
    if (leadEmail) {
      FORM_TYPES.forEach((formType) => {
        dispatch(
          fetchFormSubmission({
            formType: formType.key as 'details' | 'intro' | 'characterization',
            email: leadEmail,
          })
        );
      });
    }
  }, [leadEmail, dispatch]);

  const handleFormClick = (formType: FormType) => {
    setSelectedFormType(formType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFormType(null);
  };

  if (!leadEmail) {
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
            {FORM_TYPES.map((formType) => {
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

      {/* Form Response Modal */}
      {selectedFormType && (
        <FormResponseModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          formType={selectedFormType}
          submission={submissions[selectedFormType.key] || null}
          leadEmail={leadEmail}
        />
      )}
    </>
  );
};

