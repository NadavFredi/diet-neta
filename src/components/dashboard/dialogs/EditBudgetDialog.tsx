/**
 * EditBudgetDialog Component
 * 
 * Self-contained dialog for editing an existing budget.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BudgetForm } from '@/components/dashboard/BudgetForm';
import type { Budget } from '@/store/slices/budgetSlice';
import { useBudget } from '@/hooks/useBudgets';

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
  // Fetch the latest budget data to ensure we have the most up-to-date values
  const { data: latestBudget } = useBudget(editingBudget?.id || '', {
    enabled: isOpen && !!editingBudget?.id,
  });

  // Use the latest budget data if available, otherwise fall back to the prop
  const budgetToUse = latestBudget || editingBudget;

  if (!budgetToUse) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="!max-w-4xl !w-full !max-h-[90vh] flex flex-col p-0 overflow-hidden" 
        dir="rtl"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-bold">עריכת תכנית פעולה: {budgetToUse.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
          <BudgetForm
            key={`${budgetToUse?.id}-${JSON.stringify(budgetToUse?.nutrition_targets)}`} // Force re-initialization when budget or nutrition_targets changes
            mode="edit"
            initialData={budgetToUse}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
            useAccordion={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

