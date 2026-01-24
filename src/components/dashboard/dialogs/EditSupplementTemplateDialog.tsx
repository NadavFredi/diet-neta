import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupplementTemplateForm } from '@/components/dashboard/SupplementTemplateForm';
import type { SupplementTemplate } from '@/hooks/useSupplementTemplates';

interface EditSupplementTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: SupplementTemplate | null;
  onSave: (data: any) => void;
}

export const EditSupplementTemplateDialog = ({
  isOpen,
  onOpenChange,
  editingTemplate,
  onSave,
}: EditSupplementTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>ערוך תוסף</DialogTitle>
          <DialogDescription className="sr-only">
            טופס לעריכת תוסף קיים
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          {editingTemplate && (
            <SupplementTemplateForm
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
