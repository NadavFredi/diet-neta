/**
 * EditWorkoutTemplateDialog Component
 * 
 * Self-contained dialog for editing an existing workout template.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';
import type { WorkoutTemplate } from '@/hooks/useWorkoutTemplates';

interface EditWorkoutTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: WorkoutTemplate | null;
  onSave: (data: any) => void;
}

export const EditWorkoutTemplateDialog = ({
  isOpen,
  onOpenChange,
  editingTemplate,
  onSave,
}: EditWorkoutTemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden" 
        dir="rtl"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside - only close via explicit action
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on escape - only close via explicit action
          e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>עריכת תוכנית אימונים</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          {editingTemplate && (
            <WorkoutBuilderForm
              mode="template"
              initialData={{
                routine_data: editingTemplate.routine_data,
                description: editingTemplate.name,
                generalGoals: editingTemplate.description || '',
                goal_tags: editingTemplate.goal_tags || [],
              } as any}
              onSave={onSave}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


