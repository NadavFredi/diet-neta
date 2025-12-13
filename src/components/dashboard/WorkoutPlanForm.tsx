import type { WorkoutPlan } from './WorkoutPlanCard';
import { WorkoutBuilderForm } from './WorkoutBuilderForm';

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
      <WorkoutBuilderForm
        mode="user"
        initialData={initialData}
        onSave={onSave}
        onCancel={onCancel}
        leadId={leadId}
      />
    </div>
  );
};
