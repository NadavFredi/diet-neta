/**
 * DeleteBudgetDialog Component
 * 
 * Confirmation dialog for deleting a budget.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Budget } from '@/store/slices/budgetSlice';

interface DeleteBudgetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budgetToDelete: Budget | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteBudgetDialog = ({
  isOpen,
  onOpenChange,
  budgetToDelete,
  isDeleting,
  onConfirm,
}: DeleteBudgetDialogProps) => {
  if (!budgetToDelete) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת תקציב</AlertDialogTitle>
          <AlertDialogDescription>
            האם אתה בטוח שברצונך למחוק את התקציב "{budgetToDelete.name}"?
            פעולה זו לא ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'מוחק...' : 'מחק'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

