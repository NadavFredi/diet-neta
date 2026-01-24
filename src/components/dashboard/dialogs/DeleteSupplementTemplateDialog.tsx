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
import type { SupplementTemplate } from '@/hooks/useSupplementTemplates';

interface DeleteSupplementTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  templateToDelete: SupplementTemplate | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteSupplementTemplateDialog = ({
  isOpen,
  onOpenChange,
  templateToDelete,
  isDeleting,
  onConfirm,
}: DeleteSupplementTemplateDialogProps) => {
  if (!templateToDelete) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>האם אתה בטוח שברצונך למחוק את התבנית?</AlertDialogTitle>
          <AlertDialogDescription>
            פעולה זו תמחק את התבנית "{templateToDelete.name}" לצמיתות. לא ניתן יהיה לשחזר את המידע.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'מוחק...' : 'מחק תבנית'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
