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
        className="!max-w-[800px] !w-[800px] !h-[90vh] !max-h-[90vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-lg !m-0" 
        dir="rtl"
        onInteractOutside={(e) => {
          // Allow drag operations to work - check if this is a drag by examining the event
          const nativeEvent = e.nativeEvent;
          
          // If this is a pointer event with buttons pressed, it's an active drag operation
          // Prevent closing during drag operations
          if (nativeEvent instanceof PointerEvent) {
            if (nativeEvent.buttons !== 0) {
              // Mouse buttons are pressed, this is a drag - prevent closing
              e.preventDefault();
              return;
            }
            // For pointermove events during drag, also prevent closing
            if (nativeEvent.type === 'pointermove') {
              e.preventDefault();
              return;
            }
          }
          
          // Check if the event originated from or is related to a draggable element
          const target = e.target as HTMLElement;
          const isDraggableElement = 
            target.closest('.cursor-grab') !== null ||
            target.closest('.cursor-grabbing') !== null ||
            target.classList.contains('cursor-grab') ||
            target.classList.contains('cursor-grabbing');
          
          if (isDraggableElement) {
            // This is related to drag and drop, prevent closing
            e.preventDefault();
            return;
          }
          
          // Allow closing on regular clicks outside (not during drags)
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>עריכת תוכנית אימונים</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 pb-6 min-h-0">
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


