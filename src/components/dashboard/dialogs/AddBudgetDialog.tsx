/**
 * AddBudgetDialog Component
 * 
 * Self-contained dialog for adding a new budget.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BudgetForm } from '@/components/dashboard/BudgetForm';

interface AddBudgetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export const AddBudgetDialog = ({
  isOpen,
  onOpenChange,
  onSave,
}: AddBudgetDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base font-bold">יצירת תקציב חדש</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 px-4 py-3">
          <BudgetForm
            mode="create"
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

