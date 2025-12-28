import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { WorkoutPlan } from '@/components/dashboard/WorkoutPlanCard';
import type { WeeklyWorkout, DayWorkout, Exercise } from '@/components/dashboard/WeeklyWorkoutBuilder';

export type WorkoutBuilderMode = 'user' | 'template';

export interface WorkoutBuilderState {
  activeTab: string;
  startDate: Date | undefined;
  description: string;
  generalGoals: string;
  weeklyWorkout: WeeklyWorkout;
}

export interface WorkoutBuilderActions {
  setActiveTab: (tab: string) => void;
  setStartDate: (date: Date | undefined) => void;
  setDescription: (desc: string) => void;
  setGeneralGoals: (goals: string) => void;
  updateDay: (dayKey: keyof WeeklyWorkout['days'], updates: Partial<DayWorkout> | ((prev: DayWorkout) => Partial<DayWorkout>)) => void;
  duplicateDay: (sourceDay: keyof WeeklyWorkout['days'], targetDay: keyof WeeklyWorkout['days']) => void;
  copyFromTemplate: (template: 'push' | 'pull' | 'legs' | 'upper' | 'lower') => void;
  getWorkoutData: () => {
    weeklyWorkout: WeeklyWorkout;
    planData: Partial<WorkoutPlan>;
    templateData?: {
      name: string;
      description: string;
      goal_tags: string[];
      routine_data: any;
    };
  };
  reset: () => void;
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

const initializeWeeklyWorkout = (initialData?: WorkoutPlan | { routine_data?: any }): WeeklyWorkout => {
  // Check if data comes from template (routine_data) or user plan (custom_attributes)
  const weeklyWorkoutData = 
    (initialData as any)?.routine_data?.weeklyWorkout ||
    (initialData as WorkoutPlan)?.custom_attributes?.data?.weeklyWorkout;

  if (weeklyWorkoutData) {
    return weeklyWorkoutData as WeeklyWorkout;
  }

  return {
    startDate: (initialData as WorkoutPlan)?.start_date || format(new Date(), 'yyyy-MM-dd'),
    description: (initialData as WorkoutPlan)?.description || '',
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

export const useWorkoutBuilder = (
  mode: WorkoutBuilderMode,
  initialData?: WorkoutPlan | { routine_data?: any },
  customerId?: string // Changed from leadId to customerId
): WorkoutBuilderState & WorkoutBuilderActions => {
  const [activeTab, setActiveTab] = useState('sunday');
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData && 'start_date' in initialData && initialData.start_date
      ? new Date(initialData.start_date)
      : new Date()
  );
  const [description, setDescription] = useState(
    initialData && 'description' in initialData ? initialData.description || '' : ''
  );
  const [generalGoals, setGeneralGoals] = useState('');
  const [weeklyWorkout, setWeeklyWorkout] = useState<WeeklyWorkout>(() => initializeWeeklyWorkout(initialData));

  // Initialize from data
  useEffect(() => {
    if (initialData) {
      const initialized = initializeWeeklyWorkout(initialData);
      setWeeklyWorkout(initialized);
      setGeneralGoals(initialized.generalGoals || '');
      
      if ('start_date' in initialData && initialData.start_date) {
        setStartDate(new Date(initialData.start_date));
      }
      if ('description' in initialData && initialData.description) {
        setDescription(initialData.description);
      }
    }
  }, [initialData]);

  const updateDay = useCallback((
    dayKey: keyof WeeklyWorkout['days'],
    updates: Partial<DayWorkout> | ((prev: DayWorkout) => Partial<DayWorkout>)
  ) => {
    setWeeklyWorkout((prev) => {
      const currentDay = prev.days[dayKey] || { day: dayKey, isActive: false, exercises: [] };
      const newUpdates = typeof updates === 'function' ? updates(currentDay) : updates;
      return {
        ...prev,
        days: {
          ...prev.days,
          [dayKey]: {
            ...currentDay,
            ...newUpdates,
            exercises: newUpdates.exercises !== undefined ? newUpdates.exercises : (currentDay.exercises || []),
          },
        },
      };
    });
  }, []);

  const duplicateDay = useCallback((
    sourceDay: keyof WeeklyWorkout['days'],
    targetDay: keyof WeeklyWorkout['days']
  ) => {
    setWeeklyWorkout((prev) => {
      const source = prev.days[sourceDay];
      return {
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
      };
    });
  }, []);

  const copyFromTemplate = useCallback((template: 'push' | 'pull' | 'legs' | 'upper' | 'lower') => {
    const templates = {
      push: [
        { name: 'ספסל לחיצה', sets: 4, reps: 8 },
        { name: 'לחיצת כתפיים', sets: 3, reps: 10 },
        { name: 'דיפים', sets: 3, reps: 12 },
        { name: 'טריצפס', sets: 3, reps: 12 },
      ],
      pull: [
        { name: 'משיכה עליונה', sets: 4, reps: 8 },
        { name: 'משיכה אופקית', sets: 3, reps: 10 },
        { name: 'ביצפס', sets: 3, reps: 12 },
        { name: 'פארמר', sets: 2, reps: 15 },
      ],
      legs: [
        { name: 'סקוואט', sets: 4, reps: 8 },
        { name: 'דדליפט', sets: 3, reps: 6 },
        { name: 'לחיצת רגליים', sets: 3, reps: 12 },
        { name: 'לנג\'ס', sets: 3, reps: 10 },
      ],
      upper: [
        { name: 'ספסל לחיצה', sets: 3, reps: 8 },
        { name: 'משיכה עליונה', sets: 3, reps: 8 },
        { name: 'לחיצת כתפיים', sets: 2, reps: 10 },
        { name: 'ביצפס', sets: 2, reps: 12 },
      ],
      lower: [
        { name: 'סקוואט', sets: 4, reps: 8 },
        { name: 'דדליפט', sets: 3, reps: 6 },
        { name: 'לחיצת רגליים', sets: 3, reps: 12 },
      ],
    };

    const exercises: Exercise[] = templates[template].map((ex) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
    }));

    const currentDay = activeTab as keyof WeeklyWorkout['days'];
    updateDay(currentDay, {
      isActive: true,
      exercises,
    });
  }, [activeTab, updateDay]);

  const getWorkoutData = useCallback(() => {
    if (mode === 'user' && !startDate) {
      throw new Error('נא לבחור תאריך התחלה');
    }

    const activeDays = Object.values(weeklyWorkout.days).filter((d) => d.isActive).length;
    const updatedWorkout: WeeklyWorkout = {
      ...weeklyWorkout,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      description,
      generalGoals,
    };

    if (mode === 'user') {
      const planData: Partial<WorkoutPlan> = {
        start_date: format(startDate!, 'yyyy-MM-dd'),
        description,
        strength: activeDays,
        cardio: 0,
        intervals: 0,
        custom_attributes: {
          schema: [],
          data: {
            weeklyWorkout: updatedWorkout,
          },
        },
        ...(customerId && { customer_id: customerId }),
      };

      return {
        weeklyWorkout: updatedWorkout,
        planData,
      };
    } else {
      // Template mode - description is the template name, generalGoals is the description
      return {
        weeklyWorkout: updatedWorkout,
        templateData: {
          name: description || 'תבנית ללא שם',
          description: generalGoals || '',
          goal_tags: [], // Can be extended later
          routine_data: {
            weeklyWorkout: updatedWorkout,
          },
        },
      };
    }
  }, [mode, startDate, description, generalGoals, weeklyWorkout, customerId]);

  const reset = useCallback(() => {
    setActiveTab('sunday');
    setStartDate(new Date());
    setDescription('');
    setGeneralGoals('');
    setWeeklyWorkout(initializeWeeklyWorkout());
  }, []);

  return {
    // State
    activeTab,
    startDate,
    description,
    generalGoals,
    weeklyWorkout,
    // Actions
    setActiveTab,
    setStartDate,
    setDescription,
    setGeneralGoals,
    updateDay,
    duplicateDay,
    copyFromTemplate,
    getWorkoutData,
    reset,
  };
};

