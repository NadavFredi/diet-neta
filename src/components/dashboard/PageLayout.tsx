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
import { ClientHeroBar } from './ClientHeroBar';
import { LeadSidebarContainer } from './LeadSidebarContainer';
import { ResizableNotesPanel } from './ResizableNotesPanel';
import { ActionDashboard } from './ActionDashboard';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector } from '@/store/hooks';
import { getFormTypes } from '@/store/slices/formsSlice';
import { useLocation } from 'react-router-dom';
import { selectCustomerNotes } from '@/store/slices/leadViewSlice';

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
  onAssignBudget?: () => void;
  budgetAssignments?: any[] | null;
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
  onAssignBudget,
  budgetAssignments,
  getInitials,
  getStatusColor,
  getStatusBorderColor,
  onSaveViewClick,
  onEditViewClick,
}) => {
  const sidebarWidth = useSidebarWidth();
  const leftSidebar = useAppSelector((state) => state.leadView.leftSidebar);
  const notesOpen = useAppSelector((state) => state.leadView.notesOpen);
  const location = useLocation();

  // Modal state management
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = React.useState(false);
  const [isTraineeSettingsOpen, setIsTraineeSettingsOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Check if we're on a leads/customers route
  const isLeadOrCustomerRoute =
    location.pathname.startsWith('/leads/') ||
    location.pathname.startsWith('/dashboard/customers/') ||
    location.pathname.startsWith('/profile/');

  // Get notes count for the customer
  const notes = useAppSelector(selectCustomerNotes(customer?.id));
  const notesCount = notes?.length || 0;

  // Get form submission state for sidebar
  const formsState = useAppSelector((state) => state.forms);
  const selectedFormType = useAppSelector((state) => state.leadView.selectedFormType);
  const formTypes = getFormTypes();

  // Find the selected form based on selectedFormType from Redux
  const selectedForm = React.useMemo(() => {
    if (selectedFormType) {
      return formTypes.find((ft) => ft.key === selectedFormType) || formTypes[0];
    }
    return formTypes[0];
  }, [formTypes, selectedFormType]);

  // Prepare form submission data for sidebar
  const formSubmissionData = React.useMemo(() => {
    if (leftSidebar !== 'submission' || !selectedForm) return null;

    return {
      formType: selectedForm,
      submission: formsState.submissions[selectedForm.key] || null,
      leadId: activeLead?.id || null,
      leadEmail: customer?.email || activeLead?.email || null,
      leadPhone: activeLead?.phone || customer?.phone || null,
      isLoading: formsState.isLoading[selectedForm.key] || false,
      error: formsState.error,
    };
  }, [leftSidebar, selectedForm, formsState, activeLead, customer]);

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

  const HEADER_HEIGHT = 60;

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
          onLogout={() => { }}
          sidebarContent={
            <DashboardSidebar
              onSaveViewClick={onSaveViewClick || (() => { })}
              onEditViewClick={onEditViewClick}
            />
          }
          clientHeroContent={
            isLeadOrCustomerRoute && customer ? (
              <ClientHeroBar
                customer={customer}
                mostRecentLead={mostRecentLead}
                onBack={onBack}
                onWhatsApp={onWhatsApp}
                onUpdateCustomer={onUpdateCustomer}
                onPaymentHistoryClick={() => setIsPaymentHistoryOpen(true)}
                onTraineeSettingsClick={() => setIsTraineeSettingsOpen(true)}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                isExpanded={isExpanded}
                notesCount={notesCount}
              />
            ) : undefined
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
        {/* Page Header (ClientHero) - Full Width, Fixed at Top - Only show expandable section when main bar is in header */}
        {isLeadOrCustomerRoute && (
          <div
            className="flex-shrink-0 w-full bg-white border-b border-gray-200"
            style={{
              marginTop: isExpanded ? 'var(--expandable-height, 0px)' : '0px'
            }}
          >
            <ClientHero
              customer={customer}
              mostRecentLead={mostRecentLead}
              status={status}
              onBack={onBack}
              onWhatsApp={onWhatsApp}
              onUpdateLead={onUpdateLead}
              onUpdateCustomer={onUpdateCustomer}
              getStatusColor={getStatusColor}
              hideMainBar={true}
              isPaymentHistoryOpen={isPaymentHistoryOpen}
              onPaymentHistoryClose={() => setIsPaymentHistoryOpen(false)}
              isTraineeSettingsOpen={isTraineeSettingsOpen}
              onTraineeSettingsClose={() => setIsTraineeSettingsOpen(false)}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
            />
          </div>
        )}

        {/* Main Content Wrapper - Dual Column Layout (Body | Notes) */}
        <div
          className="flex flex-1 overflow-hidden"
          style={{
            flexDirection: 'row' // RTL row: Notes first = right, Body second = left
          }}
          dir="rtl"
        >
          {/* Notes Panel - Right Side (First in row = Right in RTL, next to nav) - Independent from left sidebar */}
          {notesOpen && (
            <ResizableNotesPanel
              customerId={customer?.id || null}
              leads={sortedLeads.map(lead => ({
                id: lead.id,
                created_at: lead.created_at,
                fitness_goal: lead.fitness_goal,
                status_main: lead.status_main,
              }))}
              activeLeadId={activeLeadId}
            />
          )}

          {/* Dashboard Body - Left Side (Second in row = Left in RTL) */}
          <main
            className="flex-1 flex flex-col bg-gray-50 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar"
            style={{
              padding: 'clamp(12px, 3vw, 20px)'
            }}
          >
            {/* Content Area - Split View for History/Submission Sidebar */}
            <div
              className="flex-1 flex gap-4"
              style={{
                direction: 'ltr',
                overflowX: 'hidden',
                minHeight: 'fit-content'
              }}
            >
              {/* Left Side: History or Submission Sidebar */}
              <LeadSidebarContainer
                leads={sortedLeads}
                activeLeadId={activeLeadId}
                onLeadSelect={onLeadSelect}
                getStatusColor={getStatusColor}
                getStatusBorderColor={getStatusBorderColor}
                formSubmission={formSubmissionData}
                onUpdateLead={onUpdateLead}
              />

              {/* Center: ActionDashboard - Scrollable Content */}
              <div
                className="flex-1 transition-all duration-200 ease-out"
                style={{
                  minWidth: 'min(100%, 400px)'
                }}
              >
                <ActionDashboard
                  activeLead={activeLead}
                  isLoading={isLoadingLead}
                  customer={customer}
                  onUpdateLead={onUpdateLead}
                  onAddWorkoutPlan={onAddWorkoutPlan}
                  onAddDietPlan={onAddDietPlan}
                  onAssignBudget={onAssignBudget}
                  budgetAssignments={budgetAssignments}
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




