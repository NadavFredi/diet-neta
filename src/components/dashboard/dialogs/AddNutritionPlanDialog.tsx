/**
 * AddNutritionPlanDialog Component
 * 
 * Self-contained dialog for adding/editing a nutrition plan for a customer/lead.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';

interface AddNutritionPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  customerId?: string;
  leadId?: string;
  initialData?: any; // Plan data for editing
}

export const AddNutritionPlanDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  customerId,
  leadId,
  initialData,
}: AddNutritionPlanDialogProps) => {
  // Ensure initialData has the correct structure with targets
  const formattedInitialData = initialData ? {
    ...initialData,
    // Ensure targets is properly formatted
    targets: initialData.targets || {},
    // Map name if it exists
    name: initialData.name || initialData.description || '',
    description: initialData.description || '',
  } : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] !max-h-[95vh] sm:!max-w-[95vw] md:!max-w-[95vw] lg:!max-w-[95vw] xl:!max-w-[95vw] !rounded-none flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">{initialData ? 'עריכת תוכנית תזונה' : 'יצירת תוכנית תזונה חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <NutritionTemplateForm
            key={initialData?.id || 'new'} // Force remount when editing different plan
            mode="user"
            initialData={formattedInitialData}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};


