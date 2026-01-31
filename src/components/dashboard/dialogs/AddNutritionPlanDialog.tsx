/**
 * AddNutritionPlanDialog Component
 * 
 * Self-contained dialog for adding/editing a nutrition plan for a customer/lead.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';
import { supabase } from '@/lib/supabaseClient';

interface AddNutritionPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  customerId?: string;
  leadId?: string;
  initialData?: any; // Plan data for editing (deprecated - will fetch from DB)
}

export const AddNutritionPlanDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  customerId,
  leadId,
  initialData,
}: AddNutritionPlanDialogProps) => {
  const [fetchedPlan, setFetchedPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch nutrition plan from database when modal opens
  useEffect(() => {
    if (!isOpen) {
      setFetchedPlan(null);
      return;
    }

    const fetchNutritionPlan = async () => {
      if (!customerId && !leadId) {
        setFetchedPlan(null);
        return;
      }

      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        let query = supabase
          .from('nutrition_plans')
          .select('*, budget_id, nutrition_templates(name)')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        // Query by customer_id or lead_id
        if (customerId && leadId) {
          query = query.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
        } else if (customerId) {
          query = query.eq('customer_id', customerId);
        } else if (leadId) {
          query = query.eq('lead_id', leadId);
        }

        const { data, error } = await query.maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          // Extract _calculator_inputs from targets JSONB
          const targetsData = data.targets || {
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65,
            fiber: 30,
          };
          const { _calculator_inputs, _manual_override, ...cleanTargets } = targetsData as any;

          // If we have existing data from DB, automatically lock all fields to prevent recalculation
          // This ensures the calculator doesn't override the existing database values
          const lockedManualOverride = {
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            fiber: true,
          };

          // Store targets with locked manual_override and calculator_inputs
          const targetsWithLock = {
            ...cleanTargets,
            _manual_override: lockedManualOverride,
            ...(_calculator_inputs ? { _calculator_inputs } : {}),
          };

          setFetchedPlan({
            id: data.id,
            user_id: data.user_id,
            lead_id: data.lead_id,
            customer_id: data.customer_id,
            template_id: data.template_id,
            budget_id: data.budget_id,
            name: data.name || '',
            start_date: data.start_date,
            description: data.description || '',
            targets: targetsWithLock, // Include _manual_override and _calculator_inputs in targets
            calculator_inputs: _calculator_inputs || undefined,
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        } else {
          setFetchedPlan(null);
        }
      } catch (error: any) {
        console.error('Error fetching nutrition plan:', error);
        setFetchedPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNutritionPlan();
  }, [isOpen, customerId, leadId]);

  // Use fetched plan, fallback to initialData if provided (for backwards compatibility)
  const planData = fetchedPlan || initialData;

  // Format the data for the form
  // Note: If planData came from DB (fetchedPlan), targets already includes _manual_override to lock fields
  const formattedInitialData = planData ? {
    ...planData,
    targets: planData.targets || {},
    name: planData.name || planData.description || '',
    description: planData.description || '',
  } : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] !max-h-[95vh] sm:!max-w-[95vw] md:!max-w-[95vw] lg:!max-w-[95vw] xl:!max-w-[95vw] !rounded-none flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {planData ? 'עריכת תוכנית תזונה' : 'יצירת תוכנית תזונה חדשה'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-lg text-slate-600">טוען תוכנית תזונה...</div>
              </div>
            </div>
          ) : (
            <NutritionTemplateForm
              key={planData?.id || 'new'} // Force remount when editing different plan
              mode="user"
              initialData={formattedInitialData}
              onSave={onSave}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


