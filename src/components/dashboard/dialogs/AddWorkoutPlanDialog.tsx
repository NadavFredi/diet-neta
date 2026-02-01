/**
 * AddWorkoutPlanDialog Component
 * 
 * Self-contained dialog for adding/editing a workout plan for a customer/lead.
 */

import { useRef, useEffect } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      // Ensure the scrollable container can receive focus for wheel events
      scrollContainerRef.current.focus();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1400px] !w-[1400px] !max-h-[90vh] !overflow-hidden flex flex-col p-0" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{initialData ? 'עריכת תוכנית אימונים' : 'יצירת תוכנית אימונים חדשה'}</DialogTitle>
        </DialogHeader>
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6" 
          style={{ minHeight: 0 }}
          tabIndex={0}
        >
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


