import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Dumbbell,
  X,
} from 'lucide-react';
import type { DayWorkout, Exercise } from './WeeklyWorkoutBuilder';
import { ExerciseRow } from './ExerciseRow';
import { QuickAddExercise } from './QuickAddExercise';

interface SessionBuilderProps {
  day: DayWorkout;
  onUpdate: (updates: Partial<DayWorkout> | ((prev: DayWorkout) => Partial<DayWorkout>)) => void;
}

export const SessionBuilder = ({ day, onUpdate }: SessionBuilderProps) => {
  const [isActive, setIsActive] = useState(day.isActive);

  // Sync local state with prop changes
  useEffect(() => {
    setIsActive(day.isActive);
  }, [day.isActive]);

  const handleToggleActive = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    onUpdate({ isActive: newActive });
  };

  const handleAddExercise = (exerciseName?: string) => {
    const newExercise: Exercise = {
      id: `${Date.now()}-${Math.random()}`,
      name: exerciseName || '',
      sets: 3,
      reps: 10,
    };
    
    // Use functional update to ensure we get the latest exercises array
    onUpdate((prev) => ({
      exercises: [...(prev.exercises || []), newExercise],
      isActive: true,
    }));
    setIsActive(true);
  };

  const handleUpdateExercise = (exerciseId: string, updates: Partial<Exercise>) => {
    onUpdate((prev) => ({
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      ),
    }));
  };

  const handleRemoveExercise = (exerciseId: string) => {
    onUpdate((prev) => {
      const newExercises = prev.exercises.filter((ex) => ex.id !== exerciseId);
      return {
        exercises: newExercises,
        isActive: newExercises.length > 0,
      };
    });
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    onUpdate((prev) => {
      const newExercises = [...prev.exercises];
      const [moved] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, moved);
      return { exercises: newExercises };
    });
  };

  const currentExercises = day.exercises || [];

  if (!isActive && currentExercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-300" dir="rtl">
        <Dumbbell className="h-16 w-16 text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">יום מנוחה</h3>
        <p className="text-sm text-slate-500 mb-6">אין אימון מתוכנן ליום זה</p>
        <Button
          onClick={handleToggleActive}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף אימון
        </Button>
      </div>
    );
  }

  const totalSets = currentExercises.reduce((sum, ex) => sum + ex.sets, 0);

  return (
    <div className="flex flex-col h-full min-h-0" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }} dir="rtl">
      {/* Session Header - Fixed, Never Shrinks */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg border border-blue-200" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-sm px-3 py-1">
            {currentExercises.length} תרגילים
          </Badge>
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-sm px-3 py-1">
            {totalSets} סטים
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToggleActive}
          className="text-slate-600 hover:text-slate-900"
        >
          <X className="h-4 w-4 ml-1" />
          יום מנוחה
        </Button>
      </div>

      {/* Scrollable Exercises List - Flex Grow with overflow-y-auto */}
      <div 
        className="flex-1 overflow-y-auto min-h-0 py-4" 
        style={{ 
          flexGrow: 1, 
          minHeight: 0, 
          overflowY: 'auto',
          scrollbarGutter: 'stable'
        }}
      >
        <div className="space-y-3">
          {currentExercises.map((exercise, index) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              index={index}
              onUpdate={(updates) => handleUpdateExercise(exercise.id, updates)}
              onRemove={() => handleRemoveExercise(exercise.id)}
              onMoveUp={index > 0 ? () => handleMoveExercise(index, index - 1) : undefined}
              onMoveDown={
                index < currentExercises.length - 1
                  ? () => handleMoveExercise(index, index + 1)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Footer - Add Exercise Section - Fixed, Never Shrinks */}
      <div className="flex-shrink-0 pt-4 border-t border-slate-200 space-y-3 bg-white" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <QuickAddExercise onSelect={handleAddExercise} />
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-500 px-2">או</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>
        <Button
          type="button"
          onClick={() => handleAddExercise()}
          variant="outline"
          className="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 h-12"
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף תרגיל ידני
        </Button>
      </div>
    </div>
  );
};
