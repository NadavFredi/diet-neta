/**
 * LeadSidebarContainer Component
 * 
 * Dynamic sidebar container that switches between History and Notes sidebars.
 * Includes floating handle buttons anchored to the sidebar edge.
 * 
 * Layout:
 * - History Sidebar: 350px width (LeadHistorySidebar)
 * - Notes Sidebar: 450px width (CustomerNotesSidebar)
 * - Toggle buttons: Anchored to sidebar's right edge (left edge in RTL)
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
  const sidebarOpen = showHistory || showNotes;

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

      {/* Notes Sidebar - 450px - Fixed on the right edge */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50 transition-all duration-300 ease-in-out',
          'bg-white border-l border-gray-200',
          showNotes
            ? 'right-0 opacity-100 translate-x-0'
            : 'right-0 opacity-0 translate-x-full pointer-events-none'
        )}
        style={{ 
          width: '450px',
          top: '88px', // Below the header
        }}
        dir="rtl"
      >
        {showNotes && (
          <CustomerNotesSidebar customerId={customerId} />
        )}
      </div>
    </>
  );
};


