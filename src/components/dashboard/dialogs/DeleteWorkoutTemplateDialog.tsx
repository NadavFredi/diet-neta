/**
 * DeleteWorkoutTemplateDialog Component
 * 
 * Self-contained dialog for confirming workout template deletion.
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
import type { WorkoutTemplate } from '@/hooks/useWorkoutTemplates';

interface DeleteWorkoutTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  templateToDelete: WorkoutTemplate | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteWorkoutTemplateDialog = ({
  isOpen,
  onOpenChange,
  templateToDelete,
  isDeleting,
  onConfirm,
}: DeleteWorkoutTemplateDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת תבנית</AlertDialogTitle>
          <AlertDialogDescription>
            האם אתה בטוח שברצונך למחוק את התבנית "{templateToDelete?.name}"? פעולה זו לא ניתנת לביטול.
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


