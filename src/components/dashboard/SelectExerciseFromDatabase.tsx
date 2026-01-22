import { useState } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Database, Loader2, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/hooks/useExercises';

interface SelectExerciseFromDatabaseProps {
  onSelect: (exercise: Exercise) => void;
}

export const SelectExerciseFromDatabase = ({ onSelect }: SelectExerciseFromDatabaseProps) => {
  const [open, setOpen] = useState(false);
  const { data: exercisesData, isLoading } = useExercises({ pageSize: 1000 });
  const exercises = exercisesData?.data || [];

  const handleSelect = (selectedValue: string) => {
    const exercise = exercises.find((ex) => ex.id === selectedValue || ex.name === selectedValue);
    if (exercise) {
      onSelect(exercise);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} dir="rtl">
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-2 border-green-300 hover:border-green-400 bg-green-50 hover:bg-green-100 h-12"
          dir="rtl"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
            ) : (
              <Database className="h-4 w-4 text-green-600" />
            )}
            <span className="text-sm text-gray-700">
              {isLoading ? "טוען תרגילים..." : "בחר מתרגילי המאגר..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" dir="rtl" align="start">
        <Command dir="rtl">
          <CommandInput
            placeholder="חפש תרגיל..."
            dir="rtl"
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  טוען תרגילים...
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  לא נמצאו תרגילים
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {exercises.map((exercise) => (
                <CommandItem
                  key={exercise.id}
                  value={`${exercise.name} ${exercise.id}`}
                  onSelect={() => handleSelect(exercise.id)}
                  dir="rtl"
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex-1 text-right">{exercise.name}</span>
                    {(exercise.repetitions || exercise.weight) && (
                      <span className="text-xs text-gray-500 mr-2">
                        {exercise.repetitions && `${exercise.repetitions} חזרות`}
                        {exercise.repetitions && exercise.weight && ' • '}
                        {exercise.weight && `${exercise.weight} ק״ג`}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
