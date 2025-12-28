import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCheckIns, upsertCheckIn, type DailyCheckIn } from '@/store/slices/clientSlice';
import { useToast } from '@/hooks/use-toast';

export const useDailyCheckIn = (customerId: string | null) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { checkIns, isLoadingCheckIns, activeLead } = useAppSelector((state) => state.client);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch check-ins when customerId changes
  useEffect(() => {
    if (customerId) {
      dispatch(fetchCheckIns(customerId));
    }
  }, [customerId, dispatch]);

  // Get today's check-in
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIn = checkIns.find((ci) => ci.check_in_date === today);

  const submitCheckIn = async (data: Partial<DailyCheckIn>) => {
    if (!customerId) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא לקוח',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-fill: use today's existing data for fields not provided
      const checkInData: Partial<DailyCheckIn> = {
        customer_id: customerId,
        lead_id: activeLead?.id || null,
        check_in_date: today,
        // Legacy fields
        workout_completed: data.workout_completed ?? todayCheckIn?.workout_completed ?? false,
        steps_goal_met: data.steps_goal_met ?? todayCheckIn?.steps_goal_met ?? false,
        steps_actual: data.steps_actual !== undefined ? data.steps_actual : (todayCheckIn?.steps_actual ?? null),
        nutrition_goal_met: data.nutrition_goal_met ?? todayCheckIn?.nutrition_goal_met ?? false,
        supplements_taken: data.supplements_taken ?? todayCheckIn?.supplements_taken ?? [],
        notes: data.notes !== undefined ? data.notes : (todayCheckIn?.notes ?? null),
        // Physical measurements
        weight: data.weight !== undefined ? data.weight : (todayCheckIn?.weight ?? null),
        belly_circumference: data.belly_circumference !== undefined ? data.belly_circumference : (todayCheckIn?.belly_circumference ?? null),
        waist_circumference: data.waist_circumference !== undefined ? data.waist_circumference : (todayCheckIn?.waist_circumference ?? null),
        thigh_circumference: data.thigh_circumference !== undefined ? data.thigh_circumference : (todayCheckIn?.thigh_circumference ?? null),
        arm_circumference: data.arm_circumference !== undefined ? data.arm_circumference : (todayCheckIn?.arm_circumference ?? null),
        neck_circumference: data.neck_circumference !== undefined ? data.neck_circumference : (todayCheckIn?.neck_circumference ?? null),
        // Activity metrics
        exercises_count: data.exercises_count !== undefined ? data.exercises_count : (todayCheckIn?.exercises_count ?? null),
        cardio_amount: data.cardio_amount !== undefined ? data.cardio_amount : (todayCheckIn?.cardio_amount ?? null),
        intervals_count: data.intervals_count !== undefined ? data.intervals_count : (todayCheckIn?.intervals_count ?? null),
        // Nutrition and Hydration
        calories_daily: data.calories_daily !== undefined ? data.calories_daily : (todayCheckIn?.calories_daily ?? null),
        protein_daily: data.protein_daily !== undefined ? data.protein_daily : (todayCheckIn?.protein_daily ?? null),
        fiber_daily: data.fiber_daily !== undefined ? data.fiber_daily : (todayCheckIn?.fiber_daily ?? null),
        water_amount: data.water_amount !== undefined ? data.water_amount : (todayCheckIn?.water_amount ?? null),
        // Well-being scales
        stress_level: data.stress_level !== undefined ? data.stress_level : (todayCheckIn?.stress_level ?? null),
        hunger_level: data.hunger_level !== undefined ? data.hunger_level : (todayCheckIn?.hunger_level ?? null),
        energy_level: data.energy_level !== undefined ? data.energy_level : (todayCheckIn?.energy_level ?? null),
        // Rest
        sleep_hours: data.sleep_hours !== undefined ? data.sleep_hours : (todayCheckIn?.sleep_hours ?? null),
      };

      await dispatch(upsertCheckIn(checkInData)).unwrap();

      toast({
        title: 'בוצע בהצלחה',
        description: 'הדיווח היומי נשמר',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן היה לשמור את הדיווח',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get compliance stats (last 7 days)
  const complianceStats = (() => {
    const last7Days = checkIns.slice(0, 7);
    const total = last7Days.length;
    if (total === 0) return { workout: 0, steps: 0, nutrition: 0, overall: 0 };

    const workoutCount = last7Days.filter((ci) => ci.workout_completed).length;
    const stepsCount = last7Days.filter((ci) => ci.steps_goal_met).length;
    const nutritionCount = last7Days.filter((ci) => ci.nutrition_goal_met).length;

    return {
      workout: Math.round((workoutCount / total) * 100),
      steps: Math.round((stepsCount / total) * 100),
      nutrition: Math.round((nutritionCount / total) * 100),
      overall: Math.round(((workoutCount + stepsCount + nutritionCount) / (total * 3)) * 100),
    };
  })();

  return {
    todayCheckIn,
    checkIns,
    isLoading: isLoadingCheckIns || false,
    isSubmitting,
    submitCheckIn,
    complianceStats,
  };
};

