/**
 * LeadSidebarContainer Component
 * 
 * Dynamic sidebar container that switches between History and Notes sidebars.
 * Implements the "switcher" logic: Notes sidebar overrides History sidebar when toggled.
 * 
 * Layout:
 * - History Sidebar: 350px width (LeadHistorySidebar)
 * - Notes Sidebar: 450px width (CustomerNotesSidebar)
 * - Smooth transitions between states
 */

import React from 'react';
import { LeadHistorySidebar } from './LeadHistorySidebar';
import { CustomerNotesSidebar } from './CustomerNotesSidebar';
import { useAppSelector } from '@/store/hooks';
import { selectActiveSidebar } from '@/store/slices/leadViewSlice';
import { cn } from '@/lib/utils';

interface LeadSidebarContainerProps {
  // History sidebar props
  leads: any[];
  activeLeadId: string | null;
  onLeadSelect: (leadId: string) => void;
  getStatusColor: (status: string) => string;
  getStatusBorderColor: (status: string) => string;

  // Notes sidebar props
  customerId: string | null;
}

export const LeadSidebarContainer: React.FC<LeadSidebarContainerProps> = ({
  leads,
  activeLeadId,
  onLeadSelect,
  getStatusColor,
  getStatusBorderColor,
  customerId,
}) => {
  const activeSidebar = useAppSelector(selectActiveSidebar);

  const showHistory = activeSidebar === 'history';
  const showNotes = activeSidebar === 'notes';

  return (
    <>
      {/* History Sidebar - 350px - Smooth slide animation */}
      <div
        className={cn(
          'flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
          showHistory
            ? 'opacity-100 translate-x-0 w-[350px]'
            : 'opacity-0 translate-x-full w-0'
        )}
      >
        {showHistory && (
          <LeadHistorySidebar
            leads={leads}
            activeLeadId={activeLeadId}
            onLeadSelect={onLeadSelect}
            getStatusColor={getStatusColor}
            getStatusBorderColor={getStatusBorderColor}
          />
        )}
      </div>

      {/* Notes Sidebar - 450px - Smooth slide animation */}
      <div
        className={cn(
          'flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
          showNotes
            ? 'opacity-100 translate-x-0 w-[450px]'
            : 'opacity-0 translate-x-full w-0'
        )}
      >
        {showNotes && (
          <CustomerNotesSidebar customerId={customerId} />
        )}
      </div>
    </>
  );
};
