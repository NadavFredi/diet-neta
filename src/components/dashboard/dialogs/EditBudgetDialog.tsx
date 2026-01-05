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
        <DialogHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base font-bold">עריכת תקציב: {editingBudget.name}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 px-4 py-3">
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

