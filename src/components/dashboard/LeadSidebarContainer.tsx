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
import { SidebarToggleButtons } from './SidebarToggleButtons';
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
    <div className="relative flex-shrink-0 overflow-visible" style={{ width: sidebarOpen ? (showNotes ? '450px' : '350px') : '60px' }}>
      {/* History Sidebar - 350px - Smooth slide animation */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          showHistory
            ? 'opacity-100 translate-x-0 w-[350px] relative'
            : 'opacity-0 translate-x-full w-0 absolute inset-0 overflow-hidden'
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
          'transition-all duration-300 ease-in-out',
          showNotes
            ? 'opacity-100 translate-x-0 w-[450px] relative'
            : 'opacity-0 translate-x-full w-0 absolute inset-0 overflow-hidden'
        )}
      >
        {showNotes && (
          <CustomerNotesSidebar customerId={customerId} />
        )}
      </div>

      {/* Floating Handle Buttons - Inside sidebar when closed, attached to edge when open */}
      <SidebarToggleButtons sidebarOpen={sidebarOpen} />
    </div>
  );
};
