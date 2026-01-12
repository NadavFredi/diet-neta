/**
 * DeleteSubscriptionTypeDialog Component
 * 
 * Confirmation dialog for deleting a subscription type.
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
import type { SubscriptionType } from '@/hooks/useSubscriptionTypes';

interface DeleteSubscriptionTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionTypeToDelete: SubscriptionType | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteSubscriptionTypeDialog = ({
  isOpen,
  onOpenChange,
  subscriptionTypeToDelete,
  isDeleting,
  onConfirm,
}: DeleteSubscriptionTypeDialogProps) => {
  if (!subscriptionTypeToDelete) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <AlertDialogContent dir="rtl" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת סוג מנוי</AlertDialogTitle>
          <AlertDialogDescription>
            האם אתה בטוח שברצונך למחוק את סוג המנוי "{subscriptionTypeToDelete.name}"?
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
