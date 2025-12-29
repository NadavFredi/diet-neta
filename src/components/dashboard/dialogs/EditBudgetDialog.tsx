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
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-5xl w-[90vw] h-[90vh] flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg font-bold">עריכת תקציב: {editingBudget.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <BudgetForm
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

