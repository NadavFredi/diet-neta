import type { WorkoutPlan } from './WorkoutPlanCard';
import { WeeklyWorkoutBuilder } from './WeeklyWorkoutBuilder';

interface WorkoutPlanFormProps {
  initialData?: WorkoutPlan;
  onSave: (plan: Partial<WorkoutPlan>) => void;
  onCancel: () => void;
  leadId?: string;
}

export const WorkoutPlanForm = ({ 
  initialData, 
  onSave, 
  onCancel,
  leadId 
}: WorkoutPlanFormProps) => {
  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <WeeklyWorkoutBuilder
        initialData={initialData}
        onSave={onSave}
        onCancel={onCancel}
        leadId={leadId}
      />
    </div>
  );
};
