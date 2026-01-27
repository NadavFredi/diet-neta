/**
 * AddExerciseDialog Component
 * 
 * Self-contained dialog for adding a new exercise.
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExerciseForm } from '@/components/dashboard/ExerciseForm';

interface AddExerciseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export const AddExerciseDialog = ({
  isOpen,
  onOpenChange,
  onSave,
}: AddExerciseDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="!max-w-2xl !w-full" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת תרגיל חדש</DialogTitle>
          <DialogDescription className="sr-only">
            טופס ליצירת תרגיל חדש עם שם, חזרות, משקל, תמונה וקישור וידאו
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ExerciseForm
            mode="create"
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
