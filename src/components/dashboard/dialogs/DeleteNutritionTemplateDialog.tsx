/**
 * DeleteNutritionTemplateDialog Component
 * 
 * Self-contained dialog for confirming nutrition template deletion.
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
import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';

interface DeleteNutritionTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  templateToDelete: NutritionTemplate | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteNutritionTemplateDialog = ({
  isOpen,
  onOpenChange,
  templateToDelete,
  isDeleting,
  onConfirm,
}: DeleteNutritionTemplateDialogProps) => {
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


