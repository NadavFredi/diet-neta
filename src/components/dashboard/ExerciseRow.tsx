import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Exercise } from './WeeklyWorkoutBuilder';

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  onUpdate: (updates: Partial<Exercise>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const ExerciseRow = ({
  exercise,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ExerciseRowProps) => {
  const handleWeightChange = (value: string) => {
    if (value === '' || value === undefined) {
      onUpdate({ weight: undefined });
    } else {
      const numValue = Number(value);
      onUpdate({ weight: isNaN(numValue) ? undefined : numValue });
    }
  };

  const handleRPEChange = (value: string) => {
    if (value === '' || value === undefined) {
      onUpdate({ rpe: undefined });
    } else {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
        onUpdate({ rpe: numValue });
      }
    }
  };

  return (
    <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors" dir="rtl">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle - Right side for RTL */}
          <div className="flex flex-col gap-1 pt-2 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
              onClick={onMoveUp}
              disabled={!onMoveUp}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <div className="flex items-center justify-center h-8 w-6 text-slate-400">
              <GripVertical className="h-4 w-4" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
              onClick={onMoveDown}
              disabled={!onMoveDown}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Exercise Content */}
          <div className="flex-1 grid grid-cols-12 gap-3">
            {/* Exercise Name */}
            <div className="col-span-12 md:col-span-4">
              <Label className="text-xs font-medium text-slate-600 mb-1 block text-right">
                שם התרגיל
              </Label>
              <Input
                value={exercise.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="לדוגמה: ספסל לחיצה"
                className="font-semibold text-right"
                dir="rtl"
              />
            </div>

            {/* Sets */}
            <div className="col-span-3 md:col-span-2">
              <Label className="text-xs font-medium text-slate-600 mb-1 block text-right">
                סטים
              </Label>
              <Input
                type="number"
                min="1"
                value={exercise.sets}
                onChange={(e) => onUpdate({ sets: Number(e.target.value) })}
                className="text-center"
                dir="ltr"
              />
            </div>

            {/* Reps */}
            <div className="col-span-3 md:col-span-2">
              <Label className="text-xs font-medium text-slate-600 mb-1 block text-right">
                חזרות
              </Label>
              <Input
                type="number"
                min="1"
                value={exercise.reps}
                onChange={(e) => onUpdate({ reps: Number(e.target.value) })}
                className="text-center"
                dir="ltr"
              />
            </div>

            {/* Weight - Optional */}
            <div className="col-span-3 md:col-span-2">
              <Label className="text-xs font-medium text-slate-600 mb-1 block text-right">
                משקל (ק"ג) <span className="text-slate-400 font-normal">אופציונלי</span>
              </Label>
              {exercise.weight !== undefined && exercise.weight !== null && exercise.weight !== 0 ? (
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={exercise.weight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="text-center"
                  dir="ltr"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdate({ weight: 0 })}
                  className="w-full h-10 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <span className="text-xs text-slate-400">—</span>
                </button>
              )}
            </div>

            {/* RPE - Optional */}
            <div className="col-span-3 md:col-span-2">
              <Label className="text-xs font-medium text-slate-600 mb-1 block text-right">
                RPE <span className="text-slate-400 font-normal">אופציונלי</span>
              </Label>
              {exercise.rpe !== undefined && exercise.rpe !== null && exercise.rpe !== 0 ? (
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={exercise.rpe}
                  onChange={(e) => handleRPEChange(e.target.value)}
                  className="text-center"
                  dir="ltr"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdate({ rpe: 7 })}
                  className="w-full h-10 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <span className="text-xs text-slate-400">—</span>
                </button>
              )}
            </div>
          </div>

          {/* Remove Button - Left side for RTL */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 mt-6 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Notes (Optional) */}
        {exercise.notes !== undefined && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Input
              value={exercise.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="הערות (אופציונלי)"
              className="text-sm text-right"
              dir="rtl"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
