import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap } from 'lucide-react';

const EXERCISE_CATEGORIES = {
  chest: {
    label: 'חזה',
    exercises: [
      'ספסל לחיצה',
      'ספסל לחיצה בשיפוע',
      'דיפים',
      'פלייס',
      'פלייס מכונה',
      'פרפר',
    ],
  },
  back: {
    label: 'גב',
    exercises: [
      'משיכה עליונה',
      'משיכה אופקית',
      'דדליפט',
      'חתירה',
      'פולאובר',
      'טי-בר',
    ],
  },
  shoulders: {
    label: 'כתפיים',
    exercises: [
      'לחיצת כתפיים',
      'הרמת צדדים',
      'הרמה קדמית',
      'פרפר אחורי',
      'לחיצה ארנולד',
    ],
  },
  legs: {
    label: 'רגליים',
    exercises: [
      'סקוואט',
      'דדליפט',
      'לחיצת רגליים',
      'לנג\'ס',
      'הרמת עגלים',
      'סקוואט בולגרי',
    ],
  },
  arms: {
    label: 'זרועות',
    exercises: [
      'ביצפס',
      'טריצפס',
      'פטישים',
      'טריצפס כבל',
      'ביצפס כבל',
      'פטישים',
    ],
  },
  core: {
    label: 'בטן',
    exercises: [
      'פלאנק',
      'כפיפות בטן',
      'רוסית',
      'מגנט',
      'כפיפות בטן עליונה',
    ],
  },
  cardio: {
    label: 'קרדיו',
    exercises: [
      'ריצה',
      'אופניים',
      'מכשיר אליפטי',
      'חתירה',
      'קפיצות',
      'HIIT',
    ],
  },
} as const;

interface QuickAddExerciseProps {
  onSelect: (exerciseName: string) => void;
}

export const QuickAddExercise = ({ onSelect }: QuickAddExerciseProps) => {
  const [value, setValue] = useState('');

  const handleSelect = (selectedValue: string) => {
    if (selectedValue) {
      onSelect(selectedValue);
      // Reset select after a short delay to allow the selection to be visible
      setTimeout(() => setValue(''), 100);
    }
  };

  return (
    <Select value={value} onValueChange={handleSelect} dir="rtl">
      <SelectTrigger className="w-full border-2 border-blue-300 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 h-12" dir="rtl">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <SelectValue placeholder="הוסף תרגיל מהיר..." />
        </div>
      </SelectTrigger>
      <SelectContent dir="rtl" className="max-h-[400px]">
        {Object.entries(EXERCISE_CATEGORIES).map(([categoryKey, category]) => (
          <div key={categoryKey}>
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 sticky top-0 text-right">
              {category.label}
            </div>
            {category.exercises.map((exercise) => (
              <SelectItem key={exercise} value={exercise} dir="rtl">
                {exercise}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};

