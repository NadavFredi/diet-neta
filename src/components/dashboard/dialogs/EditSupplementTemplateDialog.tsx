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
  if (!editingTemplate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] !w-[95vw] !h-[90vh] !max-h-[90vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%]" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>עריכת תבנית תוספים</DialogTitle>
          <DialogDescription className="sr-only">
            טופס לעריכת תבנית תוספים
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <SupplementTemplateForm
            initialData={{
              name: editingTemplate.name,
              description: editingTemplate.description,
              supplements: editingTemplate.supplements || [],
            }}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
