import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon,
  Copy,
  FileCopy,
  GripVertical,
  Plus,
  Trash2,
  Target,
  Dumbbell,
  Save,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { WorkoutPlan } from './WorkoutPlanCard';
import { SessionBuilder } from './SessionBuilder';
import { WorkoutBuilderHeader } from './WorkoutBuilderHeader';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number; // Optional for bodyweight exercises
  rpe?: number; // Optional
  notes?: string;
}

export interface DayWorkout {
  day: string;
  isActive: boolean;
  exercises: Exercise[];
}

export interface WeeklyWorkout {
  startDate: string;
  description: string;
  generalGoals: string;
  days: {
    sunday: DayWorkout;
    monday: DayWorkout;
    tuesday: DayWorkout;
    wednesday: DayWorkout;
    thursday: DayWorkout;
    friday: DayWorkout;
    saturday: DayWorkout;
  };
}

const DAYS = [
  { key: 'sunday', label: 'ראשון', short: 'א' },
  { key: 'monday', label: 'שני', short: 'ב' },
  { key: 'tuesday', label: 'שלישי', short: 'ג' },
  { key: 'wednesday', label: 'רביעי', short: 'ד' },
  { key: 'thursday', label: 'חמישי', short: 'ה' },
  { key: 'friday', label: 'שישי', short: 'ו' },
  { key: 'saturday', label: 'שבת', short: 'ש' },
] as const;

interface WeeklyWorkoutBuilderProps {
  initialData?: WorkoutPlan;
  onSave: (plan: Partial<WorkoutPlan>) => void;
  onCancel: () => void;
  leadId?: string;
}

export const WeeklyWorkoutBuilder = ({
  initialData,
  onSave,
  onCancel,
  leadId,
}: WeeklyWorkoutBuilderProps) => {
  const [activeTab, setActiveTab] = useState('sunday');
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.start_date ? new Date(initialData.start_date) : new Date()
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [generalGoals, setGeneralGoals] = useState('');

  // Initialize weekly workout structure
  const initializeWeeklyWorkout = (): WeeklyWorkout => {
    if (initialData?.custom_attributes?.data?.weeklyWorkout) {
      return initialData.custom_attributes.data.weeklyWorkout as WeeklyWorkout;
    }

    return {
      startDate: initialData?.start_date || format(new Date(), 'yyyy-MM-dd'),
      description: initialData?.description || '',
      generalGoals: '',
      days: {
        sunday: { day: 'sunday', isActive: false, exercises: [] },
        monday: { day: 'monday', isActive: false, exercises: [] },
        tuesday: { day: 'tuesday', isActive: false, exercises: [] },
        wednesday: { day: 'wednesday', isActive: false, exercises: [] },
        thursday: { day: 'thursday', isActive: false, exercises: [] },
        friday: { day: 'friday', isActive: false, exercises: [] },
        saturday: { day: 'saturday', isActive: false, exercises: [] },
      },
    };
  };

  const [weeklyWorkout, setWeeklyWorkout] = useState<WeeklyWorkout>(initializeWeeklyWorkout());

  useEffect(() => {
    if (initialData?.custom_attributes?.data?.weeklyWorkout) {
      const saved = initialData.custom_attributes.data.weeklyWorkout as WeeklyWorkout;
      setWeeklyWorkout(saved);
      setGeneralGoals(saved.generalGoals || '');
    }
  }, [initialData]);

  const updateDay = (dayKey: keyof WeeklyWorkout['days'], updates: Partial<DayWorkout>) => {
    setWeeklyWorkout((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          ...updates,
        },
      },
    }));
  };

  const duplicateDay = (sourceDay: keyof WeeklyWorkout['days'], targetDay: keyof WeeklyWorkout['days']) => {
    const source = weeklyWorkout.days[sourceDay];
    setWeeklyWorkout((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [targetDay]: {
          ...source,
          day: targetDay,
          exercises: source.exercises.map((ex) => ({
            ...ex,
            id: `${Date.now()}-${Math.random()}`,
          })),
        },
      },
    }));
    setActiveTab(targetDay);
  };

  const copyFromTemplate = (template: 'push' | 'pull' | 'legs' | 'upper' | 'lower') => {
    const templates = {
      push: [
        { name: 'ספסל לחיצה', sets: 4, reps: 8, weight: undefined, rpe: undefined },
        { name: 'לחיצת כתפיים', sets: 3, reps: 10, weight: undefined, rpe: undefined },
        { name: 'דיפים', sets: 3, reps: 12, weight: undefined, rpe: undefined },
        { name: 'טריצפס', sets: 3, reps: 12, weight: undefined, rpe: undefined },
      ],
      pull: [
        { name: 'משיכה עליונה', sets: 4, reps: 8, weight: undefined, rpe: undefined },
        { name: 'משיכה אופקית', sets: 3, reps: 10, weight: undefined, rpe: undefined },
        { name: 'ביצפס', sets: 3, reps: 12, weight: undefined, rpe: undefined },
        { name: 'פארמר', sets: 2, reps: 15, weight: undefined, rpe: undefined },
      ],
      legs: [
        { name: 'סקוואט', sets: 4, reps: 8, weight: undefined, rpe: undefined },
        { name: 'דדליפט', sets: 3, reps: 6, weight: undefined, rpe: undefined },
        { name: 'לחיצת רגליים', sets: 3, reps: 12, weight: undefined, rpe: undefined },
        { name: 'לנג\'ס', sets: 3, reps: 10, weight: undefined, rpe: undefined },
      ],
      upper: [
        { name: 'ספסל לחיצה', sets: 3, reps: 8, weight: undefined, rpe: undefined },
        { name: 'משיכה עליונה', sets: 3, reps: 8, weight: undefined, rpe: undefined },
        { name: 'לחיצת כתפיים', sets: 2, reps: 10, weight: undefined, rpe: undefined },
        { name: 'ביצפס', sets: 2, reps: 12, weight: undefined, rpe: undefined },
      ],
      lower: [
        { name: 'סקוואט', sets: 4, reps: 8, weight: undefined, rpe: undefined },
        { name: 'דדליפט', sets: 3, reps: 6, weight: undefined, rpe: undefined },
        { name: 'לחיצת רגליים', sets: 3, reps: 12, weight: undefined, rpe: undefined },
      ],
    };

    const currentDay = activeTab as keyof WeeklyWorkout['days'];
    const exercises: Exercise[] = templates[template].map((ex) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      rpe: ex.rpe,
    }));

    updateDay(currentDay, {
      isActive: true,
      exercises,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      alert('נא לבחור תאריך התחלה');
      return;
    }

    // Calculate metrics from weekly workout
    const activeDays = Object.values(weeklyWorkout.days).filter((d) => d.isActive).length;
    const totalExercises = Object.values(weeklyWorkout.days).reduce(
      (sum, day) => sum + day.exercises.length,
      0
    );

    const planData: Partial<WorkoutPlan> = {
      start_date: format(startDate, 'yyyy-MM-dd'),
      description,
      strength: activeDays, // Approximate
      cardio: 0,
      intervals: 0,
      custom_attributes: {
        schema: [],
        data: {
          weeklyWorkout: {
            ...weeklyWorkout,
            startDate: format(startDate, 'yyyy-MM-dd'),
            description,
            generalGoals,
          },
        },
      },
      ...(leadId && { lead_id: leadId }),
    };

    onSave(planData);
  };

  const activeDaysCount = Object.values(weeklyWorkout.days).filter((d) => d.isActive).length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full" dir="rtl">
      {/* Sticky Header */}
      <WorkoutBuilderHeader
        startDate={startDate}
        setStartDate={setStartDate}
        description={description}
        setDescription={setDescription}
        generalGoals={generalGoals}
        setGeneralGoals={setGeneralGoals}
        activeDaysCount={activeDaysCount}
      />

      {/* Day Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
            <TabsList className="w-full justify-start h-auto p-2 bg-transparent">
              {DAYS.map((day) => {
                const dayData = weeklyWorkout.days[day.key as keyof WeeklyWorkout['days']];
                const exerciseCount = dayData.exercises.length;
                return (
                  <TabsTrigger
                    key={day.key}
                    value={day.key}
                    className="flex flex-col items-center gap-1 px-4 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                  >
                    <span className="text-xs font-medium">{day.short}</span>
                    <span className="text-sm font-semibold">{day.label}</span>
                    {dayData.isActive && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                        {exerciseCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Quick Actions Bar */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap" dir="rtl">
              <span className="text-xs font-medium text-slate-600">תבניות מהירות:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('push')}
                className="h-7 text-xs"
              >
                Push
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('pull')}
                className="h-7 text-xs"
              >
                Pull
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('legs')}
                className="h-7 text-xs"
              >
                Legs
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('upper')}
                className="h-7 text-xs"
              >
                Upper
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('lower')}
                className="h-7 text-xs"
              >
                Lower
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentDay = activeTab as keyof WeeklyWorkout['days'];
                  const nextDayIndex = DAYS.findIndex((d) => d.key === currentDay) + 1;
                  if (nextDayIndex < DAYS.length) {
                    duplicateDay(currentDay, DAYS[nextDayIndex].key as keyof WeeklyWorkout['days']);
                  }
                }}
                className="h-7 text-xs"
                dir="rtl"
              >
                <Copy className="h-3 w-3 ml-1" />
                העתק ליום הבא
              </Button>
            </div>
          </div>

          {/* Day Content */}
          <div className="flex-1 overflow-hidden">
            {DAYS.map((day) => {
              const dayData = weeklyWorkout.days[day.key as keyof WeeklyWorkout['days']];
              return (
                <TabsContent
                  key={day.key}
                  value={day.key}
                  className="mt-0 p-6 h-full flex flex-col"
                  dir="rtl"
                >
                  <SessionBuilder
                    day={dayData}
                    onUpdate={(updates) => updateDay(day.key as keyof WeeklyWorkout['days'], updates)}
                  />
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-200 bg-white p-4 flex gap-3 sticky bottom-0 z-10 flex-shrink-0" dir="rtl">
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 ml-2" />
          שמור תוכנית
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          <X className="h-4 w-4 ml-2" />
          ביטול
        </Button>
      </div>
    </form>
  );
};

