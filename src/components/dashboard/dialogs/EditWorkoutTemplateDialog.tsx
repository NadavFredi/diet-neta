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
        className="!max-w-[98vw] !w-[98vw] !h-[95vh] !max-h-[95vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-none" 
        dir="rtl"
        onInteractOutside={(e) => {
          // Allow drag operations to work - check if this is a drag by examining the event
          const nativeEvent = e.nativeEvent;
          
          // If this is a pointer event with buttons pressed, it's an active drag operation
          // Allow drag operations to continue even when pointer moves over the overlay
          if (nativeEvent instanceof PointerEvent) {
            if (nativeEvent.buttons !== 0) {
              // Mouse buttons are pressed, this is a drag - allow it
              return;
            }
            // For pointermove events during drag, also allow
            if (nativeEvent.type === 'pointermove') {
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
            // This is related to drag and drop, allow it
            return;
          }
          
          // Only prevent closing on actual click/tap events (not drags)
          // This prevents the dialog from closing when clicking outside
          if (nativeEvent.type === 'mousedown' || 
              nativeEvent.type === 'pointerdown' ||
              nativeEvent.type === 'touchstart') {
            // This is a click/tap, prevent closing
            e.preventDefault();
          }
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


