import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCheckIns, upsertCheckIn, type DailyCheckIn } from '@/store/slices/clientSlice';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export const useDailyCheckIn = (customerId: string | null, selectedDate?: string | null) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { checkIns, isLoadingCheckIns, activeLead, selectedDate: stateSelectedDate } = useAppSelector((state) => state.client);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use provided selectedDate or state selectedDate or default to today
  const targetDate = selectedDate ?? stateSelectedDate ?? new Date().toISOString().split('T')[0];

  // Fetch check-ins when customerId changes
  useEffect(() => {
    if (customerId) {
      dispatch(fetchCheckIns(customerId));
    }
  }, [customerId, dispatch]);

  // Get check-in for selected date
  const selectedCheckIn = checkIns.find((ci) => ci.check_in_date === targetDate);
  
  // Also get today's check-in for convenience
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIn = checkIns.find((ci) => ci.check_in_date === today);

  const submitCheckIn = async (data: Partial<DailyCheckIn>, date?: string) => {
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
      const checkInDate = date || targetDate;
      // Auto-fill: use existing data for fields not provided
      const existingCheckIn = checkIns.find((ci) => ci.check_in_date === checkInDate);
      
      // Try to get lead_id from activeLead, or fetch the first lead for this customer
      let leadId = activeLead?.id || null;
      if (!leadId) {
        // Try to fetch the first lead for this customer
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (leadsData) {
          leadId = leadsData.id;
        }
      }
      
      const checkInData: Partial<DailyCheckIn> = {
        customer_id: customerId,
        lead_id: leadId,
        check_in_date: checkInDate,
        // Legacy fields
        workout_completed: data.workout_completed ?? existingCheckIn?.workout_completed ?? false,
        steps_goal_met: data.steps_goal_met ?? existingCheckIn?.steps_goal_met ?? false,
        steps_actual: data.steps_actual !== undefined ? data.steps_actual : (existingCheckIn?.steps_actual ?? null),
        nutrition_goal_met: data.nutrition_goal_met ?? existingCheckIn?.nutrition_goal_met ?? false,
        supplements_taken: data.supplements_taken ?? existingCheckIn?.supplements_taken ?? [],
        notes: data.notes !== undefined ? data.notes : (existingCheckIn?.notes ?? null),
        // Physical measurements
        weight: data.weight !== undefined ? data.weight : (existingCheckIn?.weight ?? null),
        belly_circumference: data.belly_circumference !== undefined ? data.belly_circumference : (existingCheckIn?.belly_circumference ?? null),
        waist_circumference: data.waist_circumference !== undefined ? data.waist_circumference : (existingCheckIn?.waist_circumference ?? null),
        thigh_circumference: data.thigh_circumference !== undefined ? data.thigh_circumference : (existingCheckIn?.thigh_circumference ?? null),
        arm_circumference: data.arm_circumference !== undefined ? data.arm_circumference : (existingCheckIn?.arm_circumference ?? null),
        neck_circumference: data.neck_circumference !== undefined ? data.neck_circumference : (existingCheckIn?.neck_circumference ?? null),
        // Activity metrics
        exercises_count: data.exercises_count !== undefined ? data.exercises_count : (existingCheckIn?.exercises_count ?? null),
        cardio_amount: data.cardio_amount !== undefined ? data.cardio_amount : (existingCheckIn?.cardio_amount ?? null),
        intervals_count: data.intervals_count !== undefined ? data.intervals_count : (existingCheckIn?.intervals_count ?? null),
        // Nutrition and Hydration
        calories_daily: data.calories_daily !== undefined ? data.calories_daily : (existingCheckIn?.calories_daily ?? null),
        protein_daily: data.protein_daily !== undefined ? data.protein_daily : (existingCheckIn?.protein_daily ?? null),
        fiber_daily: data.fiber_daily !== undefined ? data.fiber_daily : (existingCheckIn?.fiber_daily ?? null),
        water_amount: data.water_amount !== undefined ? data.water_amount : (existingCheckIn?.water_amount ?? null),
        // Well-being scales
        stress_level: data.stress_level !== undefined ? data.stress_level : (existingCheckIn?.stress_level ?? null),
        hunger_level: data.hunger_level !== undefined ? data.hunger_level : (existingCheckIn?.hunger_level ?? null),
        energy_level: data.energy_level !== undefined ? data.energy_level : (existingCheckIn?.energy_level ?? null),
        // Rest
        sleep_hours: data.sleep_hours !== undefined ? data.sleep_hours : (existingCheckIn?.sleep_hours ?? null),
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
    selectedCheckIn,
    checkIns,
    isLoading: isLoadingCheckIns || false,
    isSubmitting,
    submitCheckIn,
    complianceStats,
    selectedDate: targetDate,
  };
};

