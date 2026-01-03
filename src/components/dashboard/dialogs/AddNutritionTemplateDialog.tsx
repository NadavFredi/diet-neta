/**
 * AddNutritionTemplateDialog Component
 * 
 * Self-contained dialog for adding a new nutrition template.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden rounded-[1.5rem]" dir="rtl">
        <DialogHeader className="px-3 pt-3 pb-2 border-b flex-shrink-0">
          <DialogTitle className="text-base">יצירת תבנית תזונה חדשה</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
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


