import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCheckIns, upsertCheckIn, type DailyCheckIn } from '@/store/slices/clientSlice';
import { useToast } from '@/hooks/use-toast';

export const useDailyCheckIn = (customerId: string | null) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { checkIns, isLoading } = useAppSelector((state) => state.client);
  const { activeLead } = useAppSelector((state) => state.client);

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

  const submitCheckIn = async (data: {
    workout_completed?: boolean;
    steps_goal_met?: boolean;
    steps_actual?: number | null;
    nutrition_goal_met?: boolean;
    supplements_taken?: string[];
    notes?: string | null;
  }) => {
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
      await dispatch(
        upsertCheckIn({
          customer_id: customerId,
          lead_id: activeLead?.id || null,
          check_in_date: today,
          workout_completed: data.workout_completed ?? todayCheckIn?.workout_completed ?? false,
          steps_goal_met: data.steps_goal_met ?? todayCheckIn?.steps_goal_met ?? false,
          steps_actual: data.steps_actual ?? todayCheckIn?.steps_actual ?? null,
          nutrition_goal_met: data.nutrition_goal_met ?? todayCheckIn?.nutrition_goal_met ?? false,
          supplements_taken: data.supplements_taken ?? todayCheckIn?.supplements_taken ?? [],
          notes: data.notes ?? todayCheckIn?.notes ?? null,
        })
      ).unwrap();

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
    isLoading: isLoadingCheckIns,
    isSubmitting,
    submitCheckIn,
    complianceStats,
  };
};

