import { WorkoutBoard } from './WorkoutBoard';
import type { WorkoutBuilderMode } from '@/hooks/useWorkoutBuilder';

interface WorkoutBuilderFormProps {
  mode: WorkoutBuilderMode;
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  leadId?: string;
}

export const WorkoutBuilderForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  leadId,
}: WorkoutBuilderFormProps) => {
  return (
    <div className="h-full flex flex-col min-h-0" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <WorkoutBoard
        mode={mode}
        initialData={initialData}
        leadId={leadId}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
};

