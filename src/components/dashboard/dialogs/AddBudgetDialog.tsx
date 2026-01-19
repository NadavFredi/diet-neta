/**
 * AddBudgetDialog Component
 * 
 * Self-contained dialog for adding a new budget.
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent 
        className="!max-w-[98vw] !w-[98vw] !h-[95vh] !max-h-[95vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-none" 
        dir="rtl"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-bold">יצירת תקציב חדש</DialogTitle>
          <DialogDescription className="sr-only">
            יצירת תקציב חדש עם אפשרות להקצאה ללקוחות
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
          <BudgetForm
            mode="create"
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
            enableAssignment={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

