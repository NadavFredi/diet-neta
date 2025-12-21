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
      <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-3 pt-3 pb-2 border-b flex-shrink-0">
          <DialogTitle className="text-base">יצירת תבנית תזונה חדשה</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
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


