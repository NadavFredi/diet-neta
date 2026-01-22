/**
 * DeleteExerciseDialog Component
 * 
 * Self-contained dialog for confirming exercise deletion.
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
import type { Exercise } from '@/hooks/useExercises';

interface DeleteExerciseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseToDelete: Exercise | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteExerciseDialog = ({
  isOpen,
  onOpenChange,
  exerciseToDelete,
  isDeleting,
  onConfirm,
}: DeleteExerciseDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת תרגיל</AlertDialogTitle>
          <AlertDialogDescription>
            האם אתה בטוח שברצונך למחוק את התרגיל "{exerciseToDelete?.name}"? פעולה זו לא ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'מוחק...' : 'מחק'}
          </AlertDialogAction>
          <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
