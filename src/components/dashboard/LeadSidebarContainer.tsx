/**
 * LeadSidebarContainer Component
 * 
 * Dynamic sidebar container that switches between History and Submission sidebars.
 * Notes are handled separately in PageLayout via ResizableNotesPanel (right side).
 * 
 * Layout:
 * - History Sidebar: 350px width (LeadHistorySidebar)
 * - Submission Sidebar: 400px width (FormSubmissionSidebar)
 * - Smooth transitions between states
 */

import React from 'react';
import { LeadHistorySidebar } from './LeadHistorySidebar';
import { FormSubmissionSidebar } from './FormSubmissionSidebar';
import { useAppSelector } from '@/store/hooks';
import { selectLeftSidebar } from '@/store/slices/leadViewSlice';
import { cn } from '@/lib/utils';
import type { FormType } from '@/store/slices/formsSlice';
import type { FilloutSubmission } from '@/services/filloutService';

interface LeadSidebarContainerProps {
  // History sidebar props
  leads: any[];
  activeLeadId: string | null;
  onLeadSelect: (leadId: string) => void;
  getStatusColor: (status: string) => string;
  getStatusBorderColor: (status: string) => string;

  // Form submission sidebar props
  formSubmission?: {
    formType: FormType;
    submission: FilloutSubmission | null;
    leadId?: string;
    leadEmail?: string;
    leadPhone?: string;
    isLoading: boolean;
    error: string | null;
  } | null;
}

export const LeadSidebarContainer: React.FC<LeadSidebarContainerProps> = ({
  leads,
  activeLeadId,
  onLeadSelect,
  getStatusColor,
  getStatusBorderColor,
  formSubmission,
}) => {
  const leftSidebar = useAppSelector(selectLeftSidebar);

  const showHistory = leftSidebar === 'history';
  const showSubmission = leftSidebar === 'submission';

  // Notes are handled separately in PageLayout via ResizableNotesPanel (right side)
  // This container only handles history and submission sidebars (left side)

  return (
    <>
      {/* History Sidebar - 350px - Inline with content */}
      {showHistory && (
        <div className="relative flex-shrink-0 overflow-hidden transition-all duration-300 w-[350px]">
          <LeadHistorySidebar
            leads={leads}
            activeLeadId={activeLeadId}
            onLeadSelect={onLeadSelect}
            getStatusColor={getStatusColor}
            getStatusBorderColor={getStatusBorderColor}
          />
        </div>
      )}

      {/* Form Submission Sidebar - Resizable (350px-800px) - Replaces history when open */}
      {showSubmission && formSubmission && (
        <FormSubmissionSidebar
          formType={formSubmission.formType}
          submission={formSubmission.submission}
          leadId={formSubmission.leadId}
          leadEmail={formSubmission.leadEmail}
          leadPhone={formSubmission.leadPhone}
          isLoading={formSubmission.isLoading}
          error={formSubmission.error}
        />
      )}
    </>
  );
};


