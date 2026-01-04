/**
 * AddWorkoutPlanDialog Component
 * 
 * Self-contained dialog for adding/editing a workout plan for a customer/lead.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';

interface AddWorkoutPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  customerId?: string;
  leadId?: string;
  initialData?: any; // Plan data for editing
}

export const AddWorkoutPlanDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  customerId,
  leadId,
  initialData,
}: AddWorkoutPlanDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{initialData ? 'עריכת תוכנית אימונים' : 'יצירת תוכנית אימונים חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <WorkoutBuilderForm
            mode="user"
            customerId={customerId}
            leadId={leadId}
            initialData={initialData}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};


