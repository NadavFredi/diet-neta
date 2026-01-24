import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupplementTemplateForm } from '@/components/dashboard/SupplementTemplateForm';

interface AddSupplementTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export const AddSupplementTemplateDialog = ({
  isOpen,
  onOpenChange,
  onSave,
}: AddSupplementTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] !w-[95vw] !h-[90vh] !max-h-[90vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%]" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>יצירת תבנית תוספים חדשה</DialogTitle>
          <DialogDescription className="sr-only">
            טופס ליצירת תבנית תוספים חדשה
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <SupplementTemplateForm
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
