/**
 * EditExerciseDialog Component
 * 
 * Self-contained dialog for editing an existing exercise.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExerciseForm } from '@/components/dashboard/ExerciseForm';
import type { Exercise } from '@/hooks/useExercises';

interface EditExerciseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingExercise: Exercise | null;
  onSave: (data: any) => void;
}

export const EditExerciseDialog = ({
  isOpen,
  onOpenChange,
  editingExercise,
  onSave,
}: EditExerciseDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="!max-w-2xl !w-full" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת תרגיל</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {editingExercise && (
            <ExerciseForm
              mode="edit"
              initialData={editingExercise}
              onSave={onSave}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
