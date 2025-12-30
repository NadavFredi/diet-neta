/**
 * DeleteBudgetDialog Component
 * 
 * Confirmation dialog for deleting a budget with option to delete associated plans.
 */

import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getAssociatedPlans } from '@/services/budgetPlanSync';
import type { Budget } from '@/store/slices/budgetSlice';

interface DeleteBudgetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budgetToDelete: Budget | null;
  isDeleting: boolean;
  onConfirm: (deletePlans: boolean) => void;
}

export const DeleteBudgetDialog = ({
  isOpen,
  onOpenChange,
  budgetToDelete,
  isDeleting,
  onConfirm,
}: DeleteBudgetDialogProps) => {
  const [deletePlans, setDeletePlans] = useState(false);
  const [associatedPlans, setAssociatedPlans] = useState<{
    workoutPlans: any[];
    nutritionPlans: any[];
    supplementPlans: any[];
  } | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    if (isOpen && budgetToDelete) {
      setLoadingPlans(true);
      getAssociatedPlans(budgetToDelete.id)
        .then(setAssociatedPlans)
        .catch(console.error)
        .finally(() => setLoadingPlans(false));
      setDeletePlans(false);
    }
  }, [isOpen, budgetToDelete]);

  if (!budgetToDelete) return null;

  const hasAssociatedPlans = associatedPlans && (
    associatedPlans.workoutPlans.length > 0 ||
    associatedPlans.nutritionPlans.length > 0 ||
    associatedPlans.supplementPlans.length > 0
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <AlertDialogContent dir="rtl" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת תקציב</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              האם אתה בטוח שברצונך למחוק את התקציב "{budgetToDelete.name}"?
              פעולה זו לא ניתנת לביטול.
            </p>
            
            {loadingPlans ? (
              <p className="text-sm text-gray-500">בודק תכניות מקושרות...</p>
            ) : hasAssociatedPlans ? (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-semibold text-gray-700">
                  נמצאו תכניות מקושרות לתקציב זה:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  {associatedPlans.workoutPlans.length > 0 && (
                    <li>{associatedPlans.workoutPlans.length} תכנית אימונים</li>
                  )}
                  {associatedPlans.nutritionPlans.length > 0 && (
                    <li>{associatedPlans.nutritionPlans.length} תכנית תזונה</li>
                  )}
                  {associatedPlans.supplementPlans.length > 0 && (
                    <li>{associatedPlans.supplementPlans.length} תכנית תוספים</li>
                  )}
                </ul>
                <div className="flex items-center space-x-2 space-x-reverse pt-2">
                  <Checkbox
                    id="delete-plans"
                    checked={deletePlans}
                    onCheckedChange={(checked) => setDeletePlans(checked === true)}
                  />
                  <Label
                    htmlFor="delete-plans"
                    className="text-sm font-normal cursor-pointer"
                  >
                    מחק גם את כל התכניות המקושרות
                  </Label>
                </div>
                {!deletePlans && (
                  <p className="text-xs text-gray-500">
                    אם לא תבחר באפשרות זו, התכניות יישארו אך הקישור לתקציב יוסר.
                  </p>
                )}
              </div>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(deletePlans)}
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

