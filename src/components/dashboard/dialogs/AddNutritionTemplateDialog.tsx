/**
 * AddNutritionTemplateDialog Component
 * 
 * Self-contained dialog for adding a new nutrition template.
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';

interface AddNutritionTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export const AddNutritionTemplateDialog = ({
  isOpen,
  onOpenChange,
  onSave,
}: AddNutritionTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] !w-[98vw] !h-[95vh] !max-h-[95vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-none" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>יצירת תבנית תזונה חדשה</DialogTitle>
          <DialogDescription className="sr-only">
            טופס ליצירת תבנית תזונה חדשה עם חישוב מאקרו-נוטריינטים ופעילות גופנית
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <NutritionTemplateForm
            mode="template"
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};


