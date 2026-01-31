import { WorkoutBoard } from './WorkoutBoard';
import type { WorkoutBuilderMode } from '@/hooks/useWorkoutBuilder';

interface WorkoutBuilderFormProps {
  mode: WorkoutBuilderMode;
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  leadId?: string; // DEPRECATED: Use customerId instead
  customerId?: string;
}

export const WorkoutBuilderForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  leadId, // DEPRECATED
  customerId,
}: WorkoutBuilderFormProps) => {
  return (
    <div className="flex flex-col min-h-0 h-full" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <WorkoutBoard
        mode={mode}
        initialData={initialData}
        leadId={leadId} // DEPRECATED
        customerId={customerId}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
};

