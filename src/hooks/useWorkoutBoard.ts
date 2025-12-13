import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { WorkoutPlan } from '@/components/dashboard/WorkoutPlanCard';
import type { WeeklyWorkout, DayWorkout, Exercise } from '@/components/dashboard/WeeklyWorkoutBuilder';
import { DragEndEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

export type WorkoutBuilderMode = 'user' | 'template';

export interface WorkoutBoardState {
  startDate: Date | undefined;
  description: string;
  generalGoals: string;
  weeklyWorkout: WeeklyWorkout;
  activeId: string | null;
}

export interface WorkoutBoardActions {
  setStartDate: (date: Date | undefined) => void;
  setDescription: (desc: string) => void;
  setGeneralGoals: (goals: string) => void;
  updateDay: (dayKey: keyof WeeklyWorkout['days'], updates: Partial<DayWorkout> | ((prev: DayWorkout) => Partial<DayWorkout>)) => void;
  addExercise: (dayKey: keyof WeeklyWorkout['days'], exercise: Exercise) => void;
  updateExercise: (dayKey: keyof WeeklyWorkout['days'], exerciseId: string, updates: Partial<Exercise>) => void;
  removeExercise: (dayKey: keyof WeeklyWorkout['days'], exerciseId: string) => void;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  copyFromTemplate: (dayKey: keyof WeeklyWorkout['days'], template: 'push' | 'pull' | 'legs' | 'upper' | 'lower') => void;
  duplicateDay: (sourceDay: keyof WeeklyWorkout['days'], targetDay: keyof WeeklyWorkout['days']) => void;
  getWorkoutData: () => {
    weeklyWorkout: WeeklyWorkout;
    planData?: Partial<WorkoutPlan>;
    templateData?: {
      name: string;
      description: string;
      goal_tags: string[];
      routine_data: any;
    };
  };
  reset: () => void;
  getDndContext: () => {
    sensors: ReturnType<typeof useSensors>;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    collisionDetection: typeof closestCenter;
  };
}

// Days ordered for RTL - Sunday on far right
export const DAYS = [
  { key: 'sunday', label: 'ראשון', short: 'א' },
  { key: 'monday', label: 'שני', short: 'ב' },
  { key: 'tuesday', label: 'שלישי', short: 'ג' },
  { key: 'wednesday', label: 'רביעי', short: 'ד' },
  { key: 'thursday', label: 'חמישי', short: 'ה' },
  { key: 'friday', label: 'שישי', short: 'ו' },
  { key: 'saturday', label: 'שבת', short: 'ש' },
] as const;

const initializeWeeklyWorkout = (initialData?: WorkoutPlan | { routine_data?: any }): WeeklyWorkout => {
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

export const useWorkoutBoard = (
  mode: WorkoutBuilderMode,
  initialData?: WorkoutPlan | { routine_data?: any },
  leadId?: string
): WorkoutBoardState & WorkoutBoardActions => {
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
  const [activeId, setActiveId] = useState<string | null>(null);

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

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const addExercise = useCallback((
    dayKey: keyof WeeklyWorkout['days'],
    exercise: Exercise
  ) => {
    updateDay(dayKey, (prev) => ({
      isActive: true,
      exercises: [...prev.exercises, exercise],
    }));
  }, [updateDay]);

  const updateExercise = useCallback((
    dayKey: keyof WeeklyWorkout['days'],
    exerciseId: string,
    updates: Partial<Exercise>
  ) => {
    updateDay(dayKey, (prev) => ({
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      ),
    }));
  }, [updateDay]);

  const removeExercise = useCallback((
    dayKey: keyof WeeklyWorkout['days'],
    exerciseId: string
  ) => {
    updateDay(dayKey, (prev) => {
      const newExercises = prev.exercises.filter((ex) => ex.id !== exerciseId);
      return {
        exercises: newExercises,
        isActive: newExercises.length > 0,
      };
    });
  }, [updateDay]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Parse the IDs: format is "day-exerciseId" or "day-column"
    const activeParts = activeId.split('-');
    const overParts = overId.split('-');

    // If dragging an exercise
    if (activeParts.length === 2 && activeParts[0] !== 'column') {
      const [sourceDay, exerciseId] = activeParts;
      const sourceDayKey = sourceDay as keyof WeeklyWorkout['days'];

      // If dropping on a column (empty area of a day)
      if (overParts.length === 2 && overParts[1] === 'column') {
        const targetDayKey = overParts[0] as keyof WeeklyWorkout['days'];
        
        if (sourceDayKey !== targetDayKey) {
          // Move exercise to different day
          setWeeklyWorkout((prev) => {
            const sourceDay = prev.days[sourceDayKey];
            const exercise = sourceDay.exercises.find((ex) => ex.id === exerciseId);
            
            if (!exercise) return prev;

            return {
              ...prev,
              days: {
                ...prev.days,
                [sourceDayKey]: {
                  ...sourceDay,
                  exercises: sourceDay.exercises.filter((ex) => ex.id !== exerciseId),
                  isActive: sourceDay.exercises.length > 1,
                },
                [targetDayKey]: {
                  ...prev.days[targetDayKey],
                  isActive: true,
                  exercises: [...prev.days[targetDayKey].exercises, exercise],
                },
              },
            };
          });
        }
      } else if (overParts.length === 2 && overParts[1] !== 'column') {
        // Dropping on another exercise (reordering)
        const [targetDay, targetExerciseId] = overParts;
        const targetDayKey = targetDay as keyof WeeklyWorkout['days'];

        if (sourceDayKey === targetDayKey) {
          // Reorder within same day
          setWeeklyWorkout((prev) => {
            const day = prev.days[sourceDayKey];
            const exercises = [...day.exercises];
            const sourceIndex = exercises.findIndex((ex) => ex.id === exerciseId);
            const targetIndex = exercises.findIndex((ex) => ex.id === targetExerciseId);

            if (sourceIndex === -1 || targetIndex === -1) return prev;

            const [removed] = exercises.splice(sourceIndex, 1);
            exercises.splice(targetIndex, 0, removed);

            return {
              ...prev,
              days: {
                ...prev.days,
                [sourceDayKey]: {
                  ...day,
                  exercises,
                },
              },
            };
          });
        } else {
          // Move to different day at specific position
          setWeeklyWorkout((prev) => {
            const sourceDay = prev.days[sourceDayKey];
            const targetDay = prev.days[targetDayKey];
            const exercise = sourceDay.exercises.find((ex) => ex.id === exerciseId);
            
            if (!exercise) return prev;

            const targetExercises = [...targetDay.exercises];
            const targetIndex = targetExercises.findIndex((ex) => ex.id === targetExerciseId);
            const insertIndex = targetIndex >= 0 ? targetIndex : targetExercises.length;

            targetExercises.splice(insertIndex, 0, exercise);

            return {
              ...prev,
              days: {
                ...prev.days,
                [sourceDayKey]: {
                  ...sourceDay,
                  exercises: sourceDay.exercises.filter((ex) => ex.id !== exerciseId),
                  isActive: sourceDay.exercises.length > 1,
                },
                [targetDayKey]: {
                  ...targetDay,
                  isActive: true,
                  exercises: targetExercises,
                },
              },
            };
          });
        }
      }
    }
  }, []);

  const copyFromTemplate = useCallback((
    dayKey: keyof WeeklyWorkout['days'],
    template: 'push' | 'pull' | 'legs' | 'upper' | 'lower'
  ) => {
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

    updateDay(dayKey, (prev) => ({
      isActive: true,
      exercises: [...prev.exercises, ...exercises],
    }));
  }, [updateDay]);

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
        ...(leadId && { lead_id: leadId }),
      };

      return {
        weeklyWorkout: updatedWorkout,
        planData,
      };
    } else {
      return {
        weeklyWorkout: updatedWorkout,
        templateData: {
          name: description || 'תבנית ללא שם',
          description: generalGoals || '',
          goal_tags: [],
          routine_data: {
            weeklyWorkout: updatedWorkout,
          },
        },
      };
    }
  }, [mode, startDate, description, generalGoals, weeklyWorkout, leadId]);

  const reset = useCallback(() => {
    setStartDate(new Date());
    setDescription('');
    setGeneralGoals('');
    setWeeklyWorkout(initializeWeeklyWorkout());
  }, []);

  const getDndContext = useCallback(() => ({
    sensors,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    collisionDetection: closestCenter,
  }), [sensors, handleDragStart, handleDragEnd]);

  return {
    // State
    startDate,
    description,
    generalGoals,
    weeklyWorkout,
    activeId,
    // Actions
    setStartDate,
    setDescription,
    setGeneralGoals,
    updateDay,
    addExercise,
    updateExercise,
    removeExercise,
    handleDragStart,
    handleDragEnd,
    copyFromTemplate,
    duplicateDay,
    getWorkoutData,
    reset,
    getDndContext,
  };
};

