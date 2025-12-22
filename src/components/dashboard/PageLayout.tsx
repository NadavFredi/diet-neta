/**
 * PageLayout Component
 * 
 * Main wrapper for the Lead Profile Page.
 * Implements zero-scroll architecture with proper flex layout.
 */

import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { ClientHero } from './ClientHero';
import { LeadHistorySidebar } from './LeadHistorySidebar';
import { ResizableNotesPanel } from './ResizableNotesPanel';
import { ActionDashboard } from './ActionDashboard';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector } from '@/store/hooks';
import { selectActiveSidebar } from '@/store/slices/leadViewSlice';

interface PageLayoutProps {
  userEmail?: string;
  customer: any;
  mostRecentLead: any;
  sortedLeads: any[];
  activeLead: any;
  activeLeadId: string | null;
  status: string;
  isLoadingLead: boolean;
  onBack: () => void;
  onWhatsApp: () => void;
  onLeadSelect: (leadId: string) => void;
  onUpdateLead: (updates: any) => Promise<void>;
  onUpdateCustomer?: (updates: any) => Promise<void>;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  getInitials: (name: string) => string;
  getStatusColor: (status: string) => string;
  getStatusBorderColor: (status: string) => string;
  onSaveViewClick?: (resourceKey: string) => void;
  onEditViewClick?: (view: any) => void;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  userEmail,
  customer,
  mostRecentLead,
  sortedLeads,
  activeLead,
  activeLeadId,
  status,
  isLoadingLead,
  onBack,
  onWhatsApp,
  onLeadSelect,
  onUpdateLead,
  onUpdateCustomer,
  onAddWorkoutPlan,
  onAddDietPlan,
  getInitials,
  getStatusColor,
  getStatusBorderColor,
  onSaveViewClick,
  onEditViewClick,
}) => {
  const sidebarWidth = useSidebarWidth();
  const activeSidebar = useAppSelector(selectActiveSidebar);
  const isNotesOpen = activeSidebar === 'notes';
  
  // Get Notes panel width from localStorage (same key as ResizableNotesPanel)
  const [notesPanelWidth, setNotesPanelWidth] = React.useState(450);
  React.useEffect(() => {
    const savedWidth = localStorage.getItem('notesPanelWidth');
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (!isNaN(parsedWidth) && parsedWidth >= 250) {
        setNotesPanelWidth(parsedWidth);
      }
    }
    // Listen for custom event from ResizableNotesPanel when it resizes
    const handleNotesPanelResize = () => {
      const savedWidth = localStorage.getItem('notesPanelWidth');
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (!isNaN(parsedWidth) && parsedWidth >= 250) {
          setNotesPanelWidth(parsedWidth);
        }
      }
    };
    window.addEventListener('notesPanelResize', handleNotesPanelResize);
    // Also poll localStorage periodically for changes (in case event doesn't fire)
    const interval = setInterval(handleNotesPanelResize, 100);
    return () => {
      window.removeEventListener('notesPanelResize', handleNotesPanelResize);
      clearInterval(interval);
    };
  }, []);
  
  const HEADER_HEIGHT = 88;

  return (
    <div 
      className="flex flex-col overflow-hidden bg-gray-50/50" 
      style={{ 
        height: '100vh',
        overflow: 'hidden'
      }}
      dir="rtl"
    >
      {/* Top Navigation Header - Fixed (spans full width) */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 flex-shrink-0"
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <DashboardHeader
          userEmail={userEmail}
          onLogout={() => {}}
          sidebarContent={
            <DashboardSidebar 
              onSaveViewClick={onSaveViewClick || (() => {})} 
              onEditViewClick={onEditViewClick}
            />
          }
        />
      </div>

      {/* Main Content Area - Below Navigation Header */}
      <div 
        className="flex flex-col flex-1 overflow-hidden"
        style={{ 
          marginTop: `${HEADER_HEIGHT}px`,
          marginRight: `${sidebarWidth.width}px`, // Account for navigation sidebar
          height: `calc(100vh - ${HEADER_HEIGHT}px)`
        }}
      >
        {/* Page Header (ClientHero) - Full Width, Fixed at Top */}
        <div className="flex-shrink-0 w-full bg-white border-b border-gray-200">
          <ClientHero
            customer={customer}
            mostRecentLead={mostRecentLead}
            status={status}
            onBack={onBack}
            onWhatsApp={onWhatsApp}
            onUpdateLead={onUpdateLead}
            onUpdateCustomer={onUpdateCustomer}
            getStatusColor={getStatusColor}
          />
        </div>

        {/* Main Content Wrapper - Dual Column Layout (Body | Notes) */}
        <div 
          className="flex flex-1 overflow-hidden"
          style={{ 
            flexDirection: 'row' // RTL row: Notes first = right, Body second = left
          }}
          dir="rtl"
        >
          {/* Notes Panel - Right Side (First in row = Right in RTL, next to nav) */}
          {activeSidebar === 'notes' && (
            <ResizableNotesPanel customerId={customer?.id || null} />
          )}

          {/* Dashboard Body - Left Side (Second in row = Left in RTL) */}
          <main 
            className="flex-1 flex flex-col bg-gray-50 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar"
            style={{ 
              padding: '20px'
            }}
          >
            {/* Content Area - Split View for History Sidebar */}
            <div 
              className="flex-1 flex gap-4" 
              style={{ 
                direction: 'ltr', 
                overflowX: 'hidden',
                minHeight: 'fit-content'
              }}
            >
              {/* Left Side: Lead History Sidebar */}
              {activeSidebar === 'history' && (
                <div className="relative flex-shrink-0 overflow-hidden transition-all duration-300 w-[350px]">
                  <LeadHistorySidebar
                    leads={sortedLeads}
                    activeLeadId={activeLeadId}
                    onLeadSelect={onLeadSelect}
                    getStatusColor={getStatusColor}
                    getStatusBorderColor={getStatusBorderColor}
                  />
                </div>
              )}

              {/* Center: ActionDashboard - Scrollable Content */}
              <div 
                className="flex-1 transition-all duration-200 ease-out"
                style={{ 
                  minWidth: '400px'
                }}
              >
                <ActionDashboard
                  activeLead={activeLead}
                  isLoading={isLoadingLead}
                  onUpdateLead={onUpdateLead}
                  onAddWorkoutPlan={onAddWorkoutPlan}
                  onAddDietPlan={onAddDietPlan}
                  getStatusColor={getStatusColor}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};




