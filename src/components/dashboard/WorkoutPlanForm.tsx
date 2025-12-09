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
    <div className="h-full flex flex-col min-h-0" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <WeeklyWorkoutBuilder
        initialData={initialData}
        onSave={onSave}
        onCancel={onCancel}
        leadId={leadId}
      />
    </div>
  );
};
