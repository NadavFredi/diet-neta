
/**
 * WeeklyReviewWrapper Component
 * 
 * Wraps PlansCard, LeadHistoryTabs and WeeklyCheckInsList to coordinate the add button
 */

import { useState } from 'react';
import { LeadHistoryTabs } from './LeadHistoryTabs';
import { PlansCard } from './PlansCard';
import { WeeklyCheckInsList } from './WeeklyCheckInsList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WeeklyReviewModule } from './WeeklyReviewModule';

interface WeeklyReviewWrapperProps {
  leadId: string;
  customerId?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  workoutHistory?: any[] | null;
  stepsHistory?: any[] | null;
  nutritionHistory?: any[] | null;
  supplementsHistory?: any[] | null;
  budgetAssignments?: any[] | null;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  onAddSupplementsPlan: () => void;
  onAssignBudget: () => void;
}

export const WeeklyReviewWrapper: React.FC<WeeklyReviewWrapperProps> = ({
  leadId,
  customerId,
  customerPhone,
  customerName,
  workoutHistory,
  stepsHistory,
  nutritionHistory,
  supplementsHistory,
  budgetAssignments,
  onAddWorkoutPlan,
  onAddDietPlan,
  onAddSupplementsPlan,
  onAssignBudget,
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);

  const handleAddWeeklyCheckIn = () => {
    setEditingReview(null);
    setIsCreateDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingReview(null);
  };

  return (
    <>
      <PlansCard
        workoutHistory={workoutHistory}
        stepsHistory={stepsHistory}
        nutritionHistory={nutritionHistory}
        supplementsHistory={supplementsHistory}
        budgetAssignments={budgetAssignments}
        leadId={leadId}
        customerId={customerId}
        onAddWorkoutPlan={onAddWorkoutPlan}
        onAddDietPlan={onAddDietPlan}
        onAddSupplementsPlan={onAddSupplementsPlan}
        onAssignBudget={onAssignBudget}
      />

      <LeadHistoryTabs
        workoutHistory={workoutHistory}
        stepsHistory={stepsHistory}
        nutritionHistory={nutritionHistory}
        supplementsHistory={supplementsHistory}
        budgetAssignments={budgetAssignments}
        leadId={leadId}
        customerId={customerId}
        customerPhone={customerPhone}
        customerName={customerName}
        onAddWorkoutPlan={onAddWorkoutPlan}
        onAddDietPlan={onAddDietPlan}
        onAddSupplementsPlan={onAddSupplementsPlan}
        onAssignBudget={onAssignBudget}
        onAddWeeklyCheckIn={handleAddWeeklyCheckIn}
        weeklyReviewModule={
          <WeeklyCheckInsList
            leadId={leadId || undefined}
            customerId={customerId || undefined}
            customerPhone={customerPhone || undefined}
            customerName={customerName || undefined}
          />
        }
      />

      {/* Dialog for creating/editing weekly check-in */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          setEditingReview(null);
        }
      }}>
        <DialogContent className="!max-w-[98vw] sm:!max-w-[98vw] md:!max-w-[98vw] lg:!max-w-[98vw] xl:!max-w-[98vw] !w-[98vw] max-h-[90vh] overflow-y-auto overflow-x-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? 'ערוך דיווח שבועי' : 'דיווח שבועי חדש'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <WeeklyReviewModule
              leadId={leadId || undefined}
              customerId={customerId || undefined}
              customerPhone={customerPhone || undefined}
              customerName={customerName || undefined}
              initialWeekStart={editingReview?.week_start_date}
              onSave={handleCreateSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
