/**
 * EditNutritionTemplateDialog Component
 * 
 * Self-contained dialog for editing an existing nutrition template.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';
import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';

interface EditNutritionTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: NutritionTemplate | null;
  onSave: (data: any) => void;
}

export const EditNutritionTemplateDialog = ({
  isOpen,
  onOpenChange,
  editingTemplate,
  onSave,
}: EditNutritionTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden rounded-[1.5rem]" dir="rtl">
        <DialogHeader className="px-3 pt-3 pb-2 border-b flex-shrink-0">
          <DialogTitle className="text-base">עריכת תבנית תזונה</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          {editingTemplate && (
            <NutritionTemplateForm
              mode="template"
              initialData={editingTemplate}
              onSave={onSave}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


