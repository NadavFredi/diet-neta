/**
 * UnifiedProfileView UI Component
 * 
 * World-Class SaaS Dashboard - Zero Scroll Architecture
 * Refactored into clean, focused components:
 * - ClientHero: Top header with personal info
 * - LeadHistorySidebar: Right column with lead history
 * - ActionDashboard: Main content with Bento Grid
 * - PageLayout: Main wrapper
 */

import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/dashboard/PageLayout';
import { useUnifiedProfileView, getStatusColor, getStatusBorderColor, getInitials } from './UnifiedProfileView';
import { useUpdateCustomer } from '@/hooks/useUpdateCustomer';

const UnifiedProfileView = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const {
    customer,
    activeLead,
    sortedLeads,
    selectedInterestId,
    mostRecentLead,
    mostRecentLeadStatus,
    isLoadingCustomer,
    isLoadingLead,
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
    handleInterestSelect,
    updateLead,
  } = useUnifiedProfileView();

  const updateCustomer = useUpdateCustomer();

  if (isLoadingCustomer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">טוען פרטים...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">לקוח לא נמצא</h2>
          <Button onClick={handleBack} variant="outline">
            חזור לדשבורד
          </Button>
        </div>
      </div>
    );
  }

  // Handler for updating lead
  const handleUpdateLead = async (updates: any) => {
    if (!activeLead?.id && !mostRecentLead?.id) return;
    const leadId = activeLead?.id || mostRecentLead?.id;
    await updateLead.mutateAsync({
      leadId: leadId!,
      updates,
    });
  };

  // Handler for updating customer
  const handleUpdateCustomer = async (updates: any) => {
    if (!customer?.id) return;
    await updateCustomer.mutateAsync({
      customerId: customer.id,
      updates,
    });
  };

  // Handlers for quick actions
  const handleAddWorkoutPlan = () => {
    if (customer?.id) {
      navigate(`/dashboard/customers/${customer.id}`);
    }
  };

  const handleAddDietPlan = () => {
    if (customer?.id) {
      navigate(`/dashboard/customers/${customer.id}`);
    }
  };

  return (
    <PageLayout
      userEmail={user?.email}
      customer={customer}
      mostRecentLead={mostRecentLead}
      sortedLeads={sortedLeads || []}
      activeLead={activeLead}
      activeLeadId={selectedInterestId}
      status={mostRecentLeadStatus || 'ללא סטטוס'}
      isLoadingLead={isLoadingLead}
      onBack={handleBack}
      onCall={handleCall}
      onWhatsApp={handleWhatsApp}
      onEmail={handleEmail}
      onLeadSelect={handleInterestSelect}
      onUpdateLead={handleUpdateLead}
      onUpdateCustomer={handleUpdateCustomer}
      onAddWorkoutPlan={handleAddWorkoutPlan}
      onAddDietPlan={handleAddDietPlan}
      getInitials={getInitials}
      getStatusColor={getStatusColor}
      getStatusBorderColor={getStatusBorderColor}
    />
  );
};

export default UnifiedProfileView;

