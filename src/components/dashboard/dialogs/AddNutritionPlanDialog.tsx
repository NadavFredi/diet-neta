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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{initialData ? 'עריכת תוכנית תזונה' : 'יצירת תוכנית תזונה חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <NutritionTemplateForm
            mode="user"
            initialData={initialData}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};


