/**
 * AddWorkoutTemplateDialog Component
 * 
 * Self-contained dialog for adding a new workout template.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';

interface AddWorkoutTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export const AddWorkoutTemplateDialog = ({
  isOpen,
  onOpenChange,
  onSave,
}: AddWorkoutTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1400px] !w-[1400px] !h-[90vh] !max-h-[90vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-lg !m-0" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>יצירת תוכנית אימונים חדשה</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <WorkoutBuilderForm
            mode="template"
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};


