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
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="!max-w-[98vw] !w-[98vw] !h-[95vh] !max-h-[95vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-none" 
        dir="rtl"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside - only close via explicit action
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on escape - only close via explicit action
          e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>עריכת תבנית תזונה</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
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


