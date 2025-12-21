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

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/dashboard/PageLayout';
import { useUnifiedProfileView, getStatusColor, getStatusBorderColor, getInitials } from './UnifiedProfileView';
import { useUpdateCustomer } from '@/hooks/useUpdateCustomer';
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import { AddWorkoutPlanDialog } from '@/components/dashboard/dialogs/AddWorkoutPlanDialog';
import { AddNutritionPlanDialog } from '@/components/dashboard/dialogs/AddNutritionPlanDialog';
import { useToast } from '@/hooks/use-toast';

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
    handleWhatsApp,
    handleInterestSelect,
    updateLead,
  } = useUnifiedProfileView();

  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();

  // Handle edit view click (for sidebar integration)
  const handleEditViewClick = useCallback((view: any) => {
    // This is not used in the UnifiedProfileView but required by PageLayout interface
    // Could be implemented if needed in the future
  }, []);

  // Dialog state management
  const [isWorkoutPlanDialogOpen, setIsWorkoutPlanDialogOpen] = useState(false);
  const [isNutritionPlanDialogOpen, setIsNutritionPlanDialogOpen] = useState(false);

  // Hooks for creating plans
  const { createWorkoutPlan } = useWorkoutPlan(customer?.id);
  const { createNutritionPlan } = useNutritionPlan(customer?.id);

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
      setIsWorkoutPlanDialogOpen(true);
    }
  };

  const handleAddDietPlan = () => {
    if (customer?.id) {
      setIsNutritionPlanDialogOpen(true);
    }
  };

  // Handle workout plan save
  const handleWorkoutPlanSave = async (data: any) => {
    if (!customer?.id) return;

    try {
      const leadId = activeLead?.id || mostRecentLead?.id || undefined;
      
      // WorkoutBoard passes planData with the structure when mode is 'user'
      // Add lead_id if available
      const planData = {
        ...data,
        lead_id: leadId,
      };

      await createWorkoutPlan(planData);
      
      toast({
        title: 'הצלחה',
        description: 'תוכנית האימונים נוצרה בהצלחה',
      });

      setIsWorkoutPlanDialogOpen(false);
      
      // Refresh the page data if needed
      // You might want to invalidate queries or refetch data here
    } catch (error: any) {
      console.error('Failed to create workout plan:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת תוכנית האימונים',
        variant: 'destructive',
      });
    }
  };

  // Handle nutrition plan save
  const handleNutritionPlanSave = async (data: any) => {
    if (!customer?.id) return;

    try {
      const leadId = activeLead?.id || mostRecentLead?.id || undefined;
      
      // When mode is 'user', NutritionTemplateForm passes just the targets object
      // Transform the form data to match the nutrition plan structure
      const planData = {
        lead_id: leadId,
        start_date: new Date().toISOString(),
        description: '',
        targets: data || {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65,
          fiber: 30,
        },
      };

      await createNutritionPlan(planData);
      
      toast({
        title: 'הצלחה',
        description: 'תוכנית התזונה נוצרה בהצלחה',
      });

      setIsNutritionPlanDialogOpen(false);
      
      // Refresh the page data if needed
      // You might want to invalidate queries or refetch data here
    } catch (error: any) {
      console.error('Failed to create nutrition plan:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת תוכנית התזונה',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
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
        onWhatsApp={handleWhatsApp}
        onLeadSelect={handleInterestSelect}
        onUpdateLead={handleUpdateLead}
        onUpdateCustomer={handleUpdateCustomer}
        onAddWorkoutPlan={handleAddWorkoutPlan}
        onAddDietPlan={handleAddDietPlan}
        getInitials={getInitials}
        getStatusColor={getStatusColor}
        getStatusBorderColor={getStatusBorderColor}
        onEditViewClick={handleEditViewClick}
      />

      {/* Workout Plan Dialog */}
      <AddWorkoutPlanDialog
        isOpen={isWorkoutPlanDialogOpen}
        onOpenChange={setIsWorkoutPlanDialogOpen}
        onSave={handleWorkoutPlanSave}
        customerId={customer?.id}
        leadId={activeLead?.id || mostRecentLead?.id}
      />

      {/* Nutrition Plan Dialog */}
      <AddNutritionPlanDialog
        isOpen={isNutritionPlanDialogOpen}
        onOpenChange={setIsNutritionPlanDialogOpen}
        onSave={handleNutritionPlanSave}
        customerId={customer?.id}
        leadId={activeLead?.id || mostRecentLead?.id}
      />
    </>
  );
};

export default UnifiedProfileView;




