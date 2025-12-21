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
import { LeadSidebarContainer } from './LeadSidebarContainer';
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
  const notesPanelWidth = 450;
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50/50" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex-shrink-0" style={{ gridColumn: '1 / -1' }}>
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative" style={{ marginTop: '88px' }}>

        {/* Main Content - Zero Scroll Layout */}
        <main 
          className="flex-1 flex flex-col overflow-hidden bg-gray-50" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            paddingRight: isNotesOpen ? `${notesPanelWidth}px` : '0px',
          }}
        >
          {/* Top Zone: ClientHero - Full Width */}
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

          {/* Bottom Zone: Split View - Flex Row */}
          <div className="flex-1 flex overflow-hidden gap-4 px-4 pb-4 relative">
            {/* Left Side: ActionDashboard (Flex-1, scrollable internally) */}
            <ActionDashboard
              activeLead={activeLead}
              isLoading={isLoadingLead}
              onUpdateLead={onUpdateLead}
              onAddWorkoutPlan={onAddWorkoutPlan}
              onAddDietPlan={onAddDietPlan}
              getStatusColor={getStatusColor}
            />

            {/* Right Side: Dynamic Sidebar Container (History or Notes) with Floating Handle */}
            <LeadSidebarContainer
              leads={sortedLeads}
              activeLeadId={activeLeadId}
              onLeadSelect={onLeadSelect}
              getStatusColor={getStatusColor}
              getStatusBorderColor={getStatusBorderColor}
              customerId={customer?.id || null}
            />
          </div>
        </main>
      </div>
    </div>
  );
};




