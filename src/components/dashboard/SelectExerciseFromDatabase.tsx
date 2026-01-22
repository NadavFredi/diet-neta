import { useState } from 'react';
import { useExercises } from '@/hooks/useExercises';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Database, Loader2 } from 'lucide-react';
import type { Exercise } from '@/hooks/useExercises';

interface SelectExerciseFromDatabaseProps {
  onSelect: (exercise: Exercise) => void;
}

export const SelectExerciseFromDatabase = ({ onSelect }: SelectExerciseFromDatabaseProps) => {
  const [value, setValue] = useState('');
  const { data: exercises = [], isLoading } = useExercises({ pageSize: 1000 });

  const handleSelect = (selectedValue: string) => {
    if (selectedValue) {
      const exercise = exercises.find((ex) => ex.id === selectedValue);
      if (exercise) {
        onSelect(exercise);
        // Reset select after a short delay to allow the selection to be visible
        setTimeout(() => setValue(''), 100);
      }
    }
  };

  return (
    <Select value={value} onValueChange={handleSelect} dir="rtl" disabled={isLoading}>
      <SelectTrigger className="w-full border-2 border-green-300 hover:border-green-400 bg-green-50 hover:bg-green-100 h-12" dir="rtl">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
          ) : (
            <Database className="h-4 w-4 text-green-600" />
          )}
          <SelectValue placeholder={isLoading ? "טוען תרגילים..." : "בחר מתרגילי המאגר..."} />
        </div>
      </SelectTrigger>
      <SelectContent dir="rtl" className="max-h-[400px]">
        {exercises.length === 0 && !isLoading && (
          <div className="px-2 py-4 text-sm text-gray-500 text-center">
            אין תרגילים במאגר
          </div>
        )}
        {exercises.map((exercise) => (
          <SelectItem key={exercise.id} value={exercise.id} dir="rtl">
            <div className="flex items-center justify-between w-full">
              <span>{exercise.name}</span>
              {(exercise.repetitions || exercise.weight) && (
                <span className="text-xs text-gray-500 mr-2">
                  {exercise.repetitions && `${exercise.repetitions} חזרות`}
                  {exercise.repetitions && exercise.weight && ' • '}
                  {exercise.weight && `${exercise.weight} ק״ג`}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
