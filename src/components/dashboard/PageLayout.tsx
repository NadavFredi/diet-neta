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
import { ActionDashboard } from './ActionDashboard';

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
  onCall: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onLeadSelect: (leadId: string) => void;
  onUpdateLead: (updates: any) => Promise<void>;
  onUpdateCustomer?: (updates: any) => Promise<void>;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  getInitials: (name: string) => string;
  getStatusColor: (status: string) => string;
  getStatusBorderColor: (status: string) => string;
  onSaveViewClick?: (resourceKey: string) => void;
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
  onCall,
  onWhatsApp,
  onEmail,
  onLeadSelect,
  onUpdateLead,
  onUpdateCustomer,
  onAddWorkoutPlan,
  onAddDietPlan,
  getInitials,
  getStatusColor,
  getStatusBorderColor,
  onSaveViewClick,
}) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50/50" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex-shrink-0" style={{ gridColumn: '1 / -1' }}>
        <DashboardHeader
          userEmail={userEmail}
          onLogout={() => {}}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative" style={{ marginTop: '88px' }}>
        {/* Left Sidebar Navigation */}
        <DashboardSidebar onSaveViewClick={onSaveViewClick || (() => {})} />

        {/* Main Content - Zero Scroll Layout */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50" style={{ marginRight: '256px' }}>
          {/* Top Zone: ClientHero - Full Width */}
          <ClientHero
            customer={customer}
            mostRecentLead={mostRecentLead}
            status={status}
            onBack={onBack}
            onCall={onCall}
            onWhatsApp={onWhatsApp}
            onEmail={onEmail}
            onUpdateLead={onUpdateLead}
            onUpdateCustomer={onUpdateCustomer}
            getInitials={getInitials}
            getStatusColor={getStatusColor}
          />

          {/* Bottom Zone: Split View - Flex Row */}
          <div className="flex-1 flex overflow-hidden gap-4 px-4 pb-4">
            {/* Left Side: ActionDashboard (Flex-1, scrollable internally) */}
            <ActionDashboard
              activeLead={activeLead}
              isLoading={isLoadingLead}
              onUpdateLead={onUpdateLead}
              onAddWorkoutPlan={onAddWorkoutPlan}
              onAddDietPlan={onAddDietPlan}
              getStatusColor={getStatusColor}
            />

            {/* Right Side: LeadHistorySidebar (Fixed Width, scrollable internally) */}
            <LeadHistorySidebar
              leads={sortedLeads}
              activeLeadId={activeLeadId}
              onLeadSelect={onLeadSelect}
              getStatusColor={getStatusColor}
              getStatusBorderColor={getStatusBorderColor}
            />
          </div>
        </main>
      </div>
    </div>
  );
};


