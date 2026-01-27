/**
 * EditBudgetDialog Component
 * 
 * Self-contained dialog for editing an existing budget.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BudgetForm } from '@/components/dashboard/BudgetForm';
import type { Budget } from '@/store/slices/budgetSlice';

interface EditBudgetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingBudget: Budget | null;
  onSave: (data: any) => void;
}

export const EditBudgetDialog = ({
  isOpen,
  onOpenChange,
  editingBudget,
  onSave,
}: EditBudgetDialogProps) => {
  if (!editingBudget) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="!max-w-[98vw] !w-[98vw] !h-[95vh] !max-h-[95vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-none" 
        dir="rtl"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-bold">עריכת תכנית פעולה: {editingBudget.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
          <BudgetForm
            key={editingBudget?.id} // Force re-initialization when budget changes
            mode="edit"
            initialData={editingBudget}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

