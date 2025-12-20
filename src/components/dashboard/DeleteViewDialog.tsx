import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
import { useDeleteSavedView } from '@/hooks/useSavedViews';
import { useToast } from '@/hooks/use-toast';

interface DeleteViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  viewToDelete: { id: string; name: string } | null;
  resourceKey: string;
}

export const DeleteViewDialog = ({
  isOpen,
  onOpenChange,
  viewToDelete,
  resourceKey,
}: DeleteViewDialogProps) => {
  const deleteView = useDeleteSavedView();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleConfirmDelete = async () => {
    if (!viewToDelete) return;

    try {
      await deleteView.mutateAsync({
        viewId: viewToDelete.id,
        resourceKey,
      });

      toast({
        title: 'הצלחה',
        description: `התצוגה "${viewToDelete.name}" נמחקה בהצלחה`,
      });

      // If the deleted view was active, navigate to base resource
      if (searchParams.get('view_id') === viewToDelete.id) {
        navigate(location.pathname);
      }

      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'נכשל במחיקת התצוגה. אנא נסה שוב.';
      toast({
        title: 'שגיאה',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת תצוגה</AlertDialogTitle>
          <AlertDialogDescription>
            האם אתה בטוח שברצונך למחוק את התצוגה "{viewToDelete?.name}"? פעולה זו לא ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteView.isPending}>
            ביטול
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={deleteView.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteView.isPending ? 'מוחק...' : 'מחק'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

