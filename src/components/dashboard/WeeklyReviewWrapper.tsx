/**
 * WeeklyReviewWrapper Component
 * 
 * Wraps LeadHistoryTabs and WeeklyReviewModule to coordinate the save button
 */

import { useState } from 'react';
import { LeadHistoryTabs } from './LeadHistoryTabs';
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
  const [isSavingWeeklyReview, setIsSavingWeeklyReview] = useState(false);
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(null);

  const handleSaveWeeklyReview = async () => {
    if (saveHandler) {
      await saveHandler();
    }
  };

  return (
    <LeadHistoryTabs
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
      onSaveWeeklyReview={handleSaveWeeklyReview}
      isSavingWeeklyReview={isSavingWeeklyReview}
      weeklyReviewModule={
        <WeeklyReviewModule
          leadId={leadId || undefined}
          customerId={customerId || undefined}
          customerPhone={customerPhone || undefined}
          customerName={customerName || undefined}
          onSaveRef={setSaveHandler}
          onSaveStateChange={setIsSavingWeeklyReview}
        />
      }
    />
  );
};

