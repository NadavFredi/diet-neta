/**
 * AddNutritionPlanDialog Component
 * 
 * Self-contained dialog for adding/editing a nutrition plan for a customer/lead.
 * Uses the same React Query cache as PlansCard to ensure data consistency.
 */

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';
import { useGetNutritionPlansQuery } from '@/store/api/apiSlice';

interface AddNutritionPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  customerId?: string;
  leadId?: string;
  initialData?: any; // Plan data from RTK Query cache (preferred source)
}

export const AddNutritionPlanDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  customerId,
  leadId,
  initialData,
}: AddNutritionPlanDialogProps) => {
  // Use RTK Query to get nutrition plans from the same cache as PlansCard
  const { data: nutritionPlans, isLoading } = useGetNutritionPlansQuery({ 
    customerId, 
    leadId 
  }, {
    skip: !isOpen, // Only fetch when modal is open
  });

  // Get the plan from RTK Query cache (same source as PlansCard)
  // Prefer initialData if provided (comes from PlansCard's cache), otherwise find in cache
  const planData = useMemo(() => {
    if (initialData) {
      // initialData comes from PlansCard's RTK Query cache, use it directly
      return initialData;
    }
    
    // Otherwise, find the active plan from the RTK Query cache
    if (nutritionPlans?.length) {
      return nutritionPlans.find(n => n.is_active) || nutritionPlans[0];
    }
    
    return null;
  }, [initialData, nutritionPlans]);

  // Format the data for the form
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


