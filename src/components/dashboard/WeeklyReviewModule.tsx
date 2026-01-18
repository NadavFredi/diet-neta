/**
 * Weekly Review Module Component
 * 
 * Trainer interface for creating weekly strategy reviews.
 * Aggregates daily check-in data and allows trainer to provide feedback.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useActiveBudgetForLead, useActiveBudgetForCustomer } from '@/hooks/useBudgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppMessage, formatPhoneNumber } from '@/services/greenApiService';
import { Calendar as CalendarIcon, Target, TrendingUp, MessageSquare, Save, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface WeeklyReviewModuleProps {
  leadId?: string | null;
  customerId?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  initialWeekStart?: string; // ISO date string for the week to load/edit
  onSave?: () => void; // Callback when save is successful
  onSaveRef?: (handler: () => Promise<void>) => void; // Expose save handler to parent
  onSaveStateChange?: (isSaving: boolean) => void; // Notify parent of save state
}

interface WeeklyReviewData {
  id?: string;
  week_start_date: string;
  week_end_date: string;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  target_fiber: number | null;
  target_steps: number | null;
  actual_calories_avg: number | null;
  actual_protein_avg: number | null;
  actual_carbs_avg: number | null;
  actual_fat_avg: number | null;
  actual_fiber_avg: number | null;
  actual_calories_weekly_avg: number | null;
  weekly_avg_weight: number | null;
  waist_measurement: number | null;
  trainer_summary: string;
  action_plan: string;
  updated_steps_goal: number | null;
  updated_calories_target: number | null;
}

export const WeeklyReviewModule: React.FC<WeeklyReviewModuleProps> = ({
  leadId,
  customerId,
  customerPhone,
  customerName,
  initialWeekStart,
  onSave,
  onSaveRef,
  onSaveStateChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    // Use initialWeekStart if provided, otherwise default to start of current week (Sunday)
    if (initialWeekStart) {
      return new Date(initialWeekStart);
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });

  const weekStart = useMemo(() => startOfWeek(selectedWeekStart, { weekStartsOn: 0 }), [selectedWeekStart]);
  const weekEnd = useMemo(() => endOfWeek(selectedWeekStart, { weekStartsOn: 0 }), [selectedWeekStart]);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch active budget for targets
  const { data: budgetAssignment } = useActiveBudgetForLead(leadId || null);
  const { data: customerBudgetAssignment } = useActiveBudgetForCustomer(customerId || null);
  const activeBudget = budgetAssignment?.budget || customerBudgetAssignment?.budget;

  // Fetch last check-in for reference
  const { data: lastCheckIn, isLoading: isLoadingLastCheckIn } = useQuery({
    queryKey: ['last-check-in', customerId, leadId],
    queryFn: async () => {
      let finalCustomerId = customerId;
      
      if (!finalCustomerId && leadId) {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('customer_id')
          .eq('id', leadId)
          .single();
        
        if (leadError) throw leadError;
        if (!leadData?.customer_id) return null;
        finalCustomerId = leadData.customer_id;
      }

      if (!finalCustomerId) return null;

      // Get the most recent check-in for this customer
      let query = supabase
        .from('daily_check_ins')
        .select('*')
        .eq('customer_id', finalCustomerId)
        .order('check_in_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (leadId) {
        query = query.or(`lead_id.eq.${leadId},lead_id.is.null`);
      }

      const { data, error } = await query;
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    enabled: !!(leadId || customerId),
  });

  // Fetch daily check-ins for the selected week
  const { data: weekCheckIns, isLoading: isLoadingCheckIns } = useQuery({
    queryKey: ['weekly-check-ins', leadId, customerId, weekStartStr, weekEndStr],
    queryFn: async () => {
      // Always query by customer_id (required field)
      // If we only have leadId, fetch the lead first to get customer_id
      let finalCustomerId = customerId;
      
      if (!finalCustomerId && leadId) {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('customer_id')
          .eq('id', leadId)
          .single();
        
        if (leadError) throw leadError;
        if (!leadData?.customer_id) return [];
        finalCustomerId = leadData.customer_id;
      }

      if (!finalCustomerId) return [];

      // Always query by customer_id (required field)
      // Show all check-ins for this customer, including those with lead_id = null
      // If leadId is provided, also include check-ins specifically for that lead
      let query = supabase
        .from('daily_check_ins')
        .select('*')
        .eq('customer_id', finalCustomerId)
        .gte('check_in_date', weekStartStr)
        .lte('check_in_date', weekEndStr)
        .order('check_in_date', { ascending: true });

      // If leadId is provided, show check-ins for that lead OR check-ins with null lead_id
      // This ensures we see all check-ins for the customer, including those saved without a lead
      if (leadId) {
        query = query.or(`lead_id.eq.${leadId},lead_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(leadId || customerId),
  });

  // Calculate averages from check-ins
  const calculatedAverages = useMemo(() => {
    if (!weekCheckIns || weekCheckIns.length === 0) {
      return {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
        weight: null,
        waist: null,
      };
    }

    const validCheckIns = weekCheckIns.filter(ci => ci.check_in_date);
    if (validCheckIns.length === 0) {
      return {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
        weight: null,
        waist: null,
      };
    }

    // Calculate averages
    const calories = validCheckIns
      .map(ci => ci.calories_daily)
      .filter(v => v !== null && v !== undefined)
      .reduce((sum, v, _, arr) => sum + (v as number) / arr.length, 0) || null;

    const protein = validCheckIns
      .map(ci => ci.protein_daily)
      .filter(v => v !== null && v !== undefined)
      .reduce((sum, v, _, arr) => sum + (v as number) / arr.length, 0) || null;

    const carbs = null; // Not tracked in daily_check_ins
    const fat = null; // Not tracked in daily_check_ins

    const fiber = validCheckIns
      .map(ci => ci.fiber_daily)
      .filter(v => v !== null && v !== undefined)
      .reduce((sum, v, _, arr) => sum + (v as number) / arr.length, 0) || null;

    const weights = validCheckIns
      .map(ci => ci.weight)
      .filter(v => v !== null && v !== undefined);
    const weight = weights.length > 0
      ? weights.reduce((sum, w) => sum + (w as number), 0) / weights.length
      : null;

    // Get latest waist measurement
    const waistMeasurements = validCheckIns
      .map(ci => ci.waist_circumference)
      .filter(v => v !== null && v !== undefined)
      .sort((a, b) => (b as number) - (a as number)); // Latest first
    const waist = waistMeasurements.length > 0 ? (waistMeasurements[0] as number) : null;

    return {
      calories: calories ? Math.round(calories * 10) / 10 : null,
      protein: protein ? Math.round(protein * 10) / 10 : null,
      carbs,
      fat,
      fiber: fiber ? Math.round(fiber * 10) / 10 : null,
      weight: weight ? Math.round(weight * 100) / 100 : null,
      waist,
    };
  }, [weekCheckIns]);

  // Get targets from active budget
  const targets = useMemo(() => {
    if (!activeBudget?.nutrition_targets) {
      return {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
        steps: activeBudget?.steps_goal || null,
      };
    }

    const nutrition = activeBudget.nutrition_targets as any;
    return {
      calories: nutrition.calories || null,
      protein: nutrition.protein || null,
      carbs: nutrition.carbs || null,
      fat: nutrition.fat || null,
      fiber: nutrition.fiber_min || null,
      steps: activeBudget.steps_goal || null,
    };
  }, [activeBudget]);

  // Fetch existing review for this week
  const { data: existingReview } = useQuery({
    queryKey: ['weekly-review', leadId, customerId, weekStartStr],
    queryFn: async () => {
      let query = supabase
        .from('weekly_reviews')
        .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, actual_calories_weekly_avg, weekly_avg_weight, waist_measurement, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, lead_id, customer_id, created_by, created_at, updated_at')
        .eq('week_start_date', weekStartStr)
        .maybeSingle();

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (customerId) {
        query = query.eq('customer_id', customerId);
      } else {
        return null;
      }

      const { data, error } = await query;
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as WeeklyReviewData | null;
    },
    enabled: !!(leadId || customerId),
  });

  // Form state - All fields editable
  const [trainerSummary, setTrainerSummary] = useState(existingReview?.trainer_summary || '');
  const [actionPlan, setActionPlan] = useState(existingReview?.action_plan || '');
  const [updatedStepsGoal, setUpdatedStepsGoal] = useState<string>(
    existingReview?.updated_steps_goal?.toString() || targets.steps?.toString() || ''
  );
  const [updatedCaloriesTarget, setUpdatedCaloriesTarget] = useState<string>(
    existingReview?.updated_calories_target?.toString() || targets.calories?.toString() || ''
  );
  
  // Editable target values
  const [targetCalories, setTargetCalories] = useState<string>(
    existingReview?.target_calories?.toString() || targets.calories?.toString() || ''
  );
  const [targetProtein, setTargetProtein] = useState<string>(
    existingReview?.target_protein?.toString() || targets.protein?.toString() || ''
  );
  const [targetCarbs, setTargetCarbs] = useState<string>(
    existingReview?.target_carbs?.toString() || targets.carbs?.toString() || ''
  );
  const [targetFat, setTargetFat] = useState<string>(
    existingReview?.target_fat?.toString() || targets.fat?.toString() || ''
  );
  const [targetFiber, setTargetFiber] = useState<string>(
    existingReview?.target_fiber?.toString() || targets.fiber?.toString() || ''
  );
  const [targetSteps, setTargetSteps] = useState<string>(
    existingReview?.target_steps?.toString() || targets.steps?.toString() || ''
  );
  
  // Editable actual values
  const [actualCalories, setActualCalories] = useState<string>(
    existingReview?.actual_calories_avg?.toString() || calculatedAverages.calories?.toString() || ''
  );
  const [actualProtein, setActualProtein] = useState<string>(
    existingReview?.actual_protein_avg?.toString() || calculatedAverages.protein?.toString() || ''
  );
  const [actualCarbs, setActualCarbs] = useState<string>(
    existingReview?.actual_carbs_avg?.toString() || calculatedAverages.carbs?.toString() || ''
  );
  const [actualFat, setActualFat] = useState<string>(
    existingReview?.actual_fat_avg?.toString() || calculatedAverages.fat?.toString() || ''
  );
  const [actualFiber, setActualFiber] = useState<string>(
    existingReview?.actual_fiber_avg?.toString() || calculatedAverages.fiber?.toString() || ''
  );
  const [actualWeight, setActualWeight] = useState<string>(
    existingReview?.weekly_avg_weight?.toString() || calculatedAverages.weight?.toString() || ''
  );
  const [actualWaist, setActualWaist] = useState<string>(
    existingReview?.waist_measurement?.toString() || calculatedAverages.waist?.toString() || ''
  );

  // Update form when existing review or calculated averages change
  React.useEffect(() => {
    if (existingReview) {
      setTrainerSummary(existingReview.trainer_summary || '');
      setActionPlan(existingReview.action_plan || '');
      setUpdatedStepsGoal(existingReview.updated_steps_goal?.toString() || targets.steps?.toString() || '');
      setUpdatedCaloriesTarget(existingReview.updated_calories_target?.toString() || targets.calories?.toString() || '');
      
      // Update editable targets
      setTargetCalories(existingReview.target_calories?.toString() || targets.calories?.toString() || '');
      setTargetProtein(existingReview.target_protein?.toString() || targets.protein?.toString() || '');
      setTargetCarbs(existingReview.target_carbs?.toString() || targets.carbs?.toString() || '');
      setTargetFat(existingReview.target_fat?.toString() || targets.fat?.toString() || '');
      setTargetFiber(existingReview.target_fiber?.toString() || targets.fiber?.toString() || '');
      setTargetSteps(existingReview.target_steps?.toString() || targets.steps?.toString() || '');
      
      // Update editable actuals
      setActualCalories(existingReview.actual_calories_avg?.toString() || calculatedAverages.calories?.toString() || '');
      setActualProtein(existingReview.actual_protein_avg?.toString() || calculatedAverages.protein?.toString() || '');
      setActualCarbs(existingReview.actual_carbs_avg?.toString() || calculatedAverages.carbs?.toString() || '');
      setActualFat(existingReview.actual_fat_avg?.toString() || calculatedAverages.fat?.toString() || '');
      setActualFiber(existingReview.actual_fiber_avg?.toString() || calculatedAverages.fiber?.toString() || '');
      setActualWeight(existingReview.weekly_avg_weight?.toString() || calculatedAverages.weight?.toString() || '');
      setActualWaist(existingReview.waist_measurement?.toString() || calculatedAverages.waist?.toString() || '');
    } else {
      setTrainerSummary('');
      setActionPlan('');
      setUpdatedStepsGoal(targets.steps?.toString() || '');
      setUpdatedCaloriesTarget(targets.calories?.toString() || '');
      
      // Initialize editable targets from budget
      setTargetCalories(targets.calories?.toString() || '');
      setTargetProtein(targets.protein?.toString() || '');
      setTargetCarbs(targets.carbs?.toString() || '');
      setTargetFat(targets.fat?.toString() || '');
      setTargetFiber(targets.fiber?.toString() || '');
      setTargetSteps(targets.steps?.toString() || '');
      
      // Initialize editable actuals from calculated averages
      setActualCalories(calculatedAverages.calories?.toString() || '');
      setActualProtein(calculatedAverages.protein?.toString() || '');
      setActualCarbs(calculatedAverages.carbs?.toString() || '');
      setActualFat(calculatedAverages.fat?.toString() || '');
      setActualFiber(calculatedAverages.fiber?.toString() || '');
      setActualWeight(calculatedAverages.weight?.toString() || '');
      setActualWaist(calculatedAverages.waist?.toString() || '');
    }
  }, [existingReview, targets, calculatedAverages]);

  // Reset saved week ref when week changes
  React.useEffect(() => {
    lastSavedWeekRef.current = null;
    hasShownSuccessToast.current = false;
  }, [weekStartStr, leadId, customerId]);

  // Track if we've already shown a success toast to prevent duplicates
  const hasShownSuccessToast = useRef(false);
  const lastSavedWeekRef = useRef<string | null>(null);

  // Save review mutation
  const saveReviewMutation = useMutation({
    mutationFn: async (data: WeeklyReviewData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const reviewData = {
        ...data,
        created_by: user?.id || null,
      };

      // Check if we're trying to save the same week again
      const currentWeekKey = `${reviewData.week_start_date}-${leadId || customerId}`;
      if (lastSavedWeekRef.current === currentWeekKey && existingReview?.id) {
        // Already saved this week, just update
        const { data: updated, error } = await supabase
          .from('weekly_reviews')
          .update(reviewData)
          .eq('id', existingReview.id)
          .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, actual_calories_weekly_avg, weekly_avg_weight, waist_measurement, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, lead_id, customer_id, created_by, created_at, updated_at')
          .maybeSingle();
        if (error) throw error;
        // If update returned null (record doesn't exist), fall through to create new
        if (updated) return updated;
      }

      if (existingReview?.id) {
        // Update existing review
        const { data: updated, error } = await supabase
          .from('weekly_reviews')
          .update(reviewData)
          .eq('id', existingReview.id)
          .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, actual_calories_weekly_avg, weekly_avg_weight, waist_measurement, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, lead_id, customer_id, created_by, created_at, updated_at')
          .maybeSingle();
        if (error) throw error;
        // If update returned null (record doesn't exist), fall through to create new
        if (updated) {
          lastSavedWeekRef.current = currentWeekKey;
          return updated;
        }
      } else {
        // Check if a review already exists for this week (to handle race conditions)
        let existingCheckQuery = supabase
          .from('weekly_reviews')
          .select('id')
          .eq('week_start_date', reviewData.week_start_date);
        
        if (leadId) {
          existingCheckQuery = existingCheckQuery.eq('lead_id', leadId);
        } else if (customerId) {
          existingCheckQuery = existingCheckQuery.eq('customer_id', customerId);
        }
        
        const { data: existingCheck, error: checkError } = await existingCheckQuery.maybeSingle();
        if (checkError && checkError.code !== 'PGRST116') throw checkError;
        
        if (existingCheck) {
          // Update existing review
          const { data: updated, error: updateError } = await supabase
            .from('weekly_reviews')
            .update(reviewData)
            .eq('id', existingCheck.id)
            .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, actual_calories_weekly_avg, weekly_avg_weight, waist_measurement, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, lead_id, customer_id, created_by, created_at, updated_at')
            .maybeSingle();
          if (updateError) throw updateError;
          // If update returned null (record doesn't exist), fall through to create new
          if (updated) {
            lastSavedWeekRef.current = currentWeekKey;
            return updated;
          }
        } else {
          // Insert new review
          const { data: created, error: insertError } = await supabase
            .from('weekly_reviews')
            .insert(reviewData)
            .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, actual_calories_weekly_avg, weekly_avg_weight, waist_measurement, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, lead_id, customer_id, created_by, created_at, updated_at')
            .single();
          if (insertError) {
            // If unique constraint violation, try to fetch and update
            if (insertError.code === '23505') {
              let conflictQuery = supabase
                .from('weekly_reviews')
                .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, actual_calories_weekly_avg, weekly_avg_weight, waist_measurement, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, lead_id, customer_id, created_by, created_at, updated_at')
                .eq('week_start_date', reviewData.week_start_date);
              
              if (leadId) {
                conflictQuery = conflictQuery.eq('lead_id', leadId);
              } else if (customerId) {
                conflictQuery = conflictQuery.eq('customer_id', customerId);
              }
              
              const { data: conflictReview } = await conflictQuery.maybeSingle();
              if (conflictReview) {
                // Update the existing review instead
                const { data: updated, error: updateError } = await supabase
                  .from('weekly_reviews')
                  .update(reviewData)
                  .eq('id', conflictReview.id)
                  .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, actual_calories_weekly_avg, weekly_avg_weight, waist_measurement, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, lead_id, customer_id, created_by, created_at, updated_at')
                  .maybeSingle();
                if (updateError) throw updateError;
                // If update returned null, fall through to insert
                if (updated) {
                  lastSavedWeekRef.current = currentWeekKey;
                  return updated;
                }
              }
            }
            throw insertError;
          }
          lastSavedWeekRef.current = currentWeekKey;
          return created;
        }
      }
    },
    onSuccess: () => {
      // Invalidate all weekly review related queries to ensure lists update immediately
      // This ensures any component displaying weekly reviews will refresh automatically
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key === 'weekly-review' ||
            key === 'weekly-reviews' ||
            key === 'weekly-reviews-list' ||
            key === 'weekly-reviews-client'
          );
        }
      });
      
      // Only show toast if we haven't shown one for this save operation
      if (!hasShownSuccessToast.current) {
        hasShownSuccessToast.current = true;
        toast({
          title: 'הצלחה',
          description: 'הסיכום השבועי נשמר בהצלחה',
        });
        // Reset after a delay to allow for future saves
        setTimeout(() => {
          hasShownSuccessToast.current = false;
        }, 2000);
      }
      
      if (onSave) onSave();
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת הסיכום השבועי',
        variant: 'destructive',
      });
    },
  });

  // Send WhatsApp mutation
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Helper function to parse number from string
  const parseNumber = useCallback((value: string | null | undefined): number | null => {
    if (!value || value.trim() === '') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }, []);

  const handleSave = useCallback(async () => {
    if (!leadId && !customerId) return;
    
    // Prevent duplicate saves
    if (saveReviewMutation.isPending) {
      return;
    }

    const reviewData: WeeklyReviewData = {
      week_start_date: weekStartStr,
      week_end_date: weekEndStr,
      target_calories: parseNumber(targetCalories),
      target_protein: parseNumber(targetProtein),
      target_carbs: parseNumber(targetCarbs),
      target_fat: parseNumber(targetFat),
      target_fiber: parseNumber(targetFiber),
      target_steps: parseNumber(targetSteps),
      actual_calories_avg: parseNumber(actualCalories),
      actual_protein_avg: parseNumber(actualProtein),
      actual_carbs_avg: parseNumber(actualCarbs),
      actual_fat_avg: parseNumber(actualFat),
      actual_fiber_avg: parseNumber(actualFiber),
      actual_calories_weekly_avg: parseNumber(actualCalories),
      weekly_avg_weight: parseNumber(actualWeight),
      waist_measurement: parseNumber(actualWaist),
      trainer_summary: trainerSummary,
      action_plan: actionPlan,
      updated_steps_goal: parseNumber(updatedStepsGoal),
      updated_calories_target: parseNumber(updatedCaloriesTarget),
    };

    if (leadId) {
      (reviewData as any).lead_id = leadId;
    }
    if (customerId) {
      (reviewData as any).customer_id = customerId;
    }

    await saveReviewMutation.mutateAsync(reviewData);
  }, [
    leadId,
    customerId,
    weekStartStr,
    weekEndStr,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    targetFiber,
    targetSteps,
    actualCalories,
    actualProtein,
    actualCarbs,
    actualFat,
    actualFiber,
    actualWeight,
    actualWaist,
    trainerSummary,
    actionPlan,
    updatedStepsGoal,
    updatedCaloriesTarget,
    saveReviewMutation,
    parseNumber,
  ]);

  // Expose save handler to parent
  React.useEffect(() => {
    if (onSaveRef) {
      onSaveRef(handleSave);
    }
  }, [onSaveRef, handleSave]);

  // Notify parent of save state changes
  React.useEffect(() => {
    if (onSaveStateChange) {
      onSaveStateChange(saveReviewMutation.isPending);
    }
  }, [saveReviewMutation.isPending, onSaveStateChange]);

  const handleSendWhatsApp = async () => {
    if (!customerPhone) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא זמין',
        variant: 'destructive',
      });
      return;
    }

    // Save review first if not saved
    if (!existingReview) {
      await handleSave();
    }

    setIsSendingWhatsApp(true);
    try {
      const weekLabel = `שבוע ${format(weekStart, 'dd/MM', { locale: he })} - ${format(weekEnd, 'dd/MM', { locale: he })}`;
      
      // Build message using editable values
      let message = `📊 *סיכום שבועי - ${weekLabel}*\n\n`;
      message += `🎯 *יעדים:*\n`;
      if (targetCalories) message += `קלוריות: ${Math.round(parseFloat(targetCalories))} קק"ל\n`;
      if (targetProtein) message += `חלבון: ${Math.round(parseFloat(targetProtein))} גרם\n`;
      if (targetFiber) message += `סיבים: ${Math.round(parseFloat(targetFiber))} גרם\n`;
      if (targetSteps) message += `צעדים: ${Math.round(parseFloat(targetSteps))}\n`;
      
      message += `\n📈 *בפועל (ממוצע):*\n`;
      if (actualCalories) message += `קלוריות: ${Math.round(parseFloat(actualCalories))} קק"ל\n`;
      if (actualProtein) message += `חלבון: ${Math.round(parseFloat(actualProtein))} גרם\n`;
      if (actualFiber) message += `סיבים: ${Math.round(parseFloat(actualFiber))} גרם\n`;
      if (actualWeight) message += `משקל ממוצע: ${parseFloat(actualWeight).toFixed(1)} ק"ג\n`;
      
      if (trainerSummary) {
        message += `\n💬 *סיכום ומסקנות:*\n${trainerSummary}\n`;
      }
      
      if (actionPlan) {
        message += `\n🎯 *דגשים לשבוע הקרוב:*\n${actionPlan}\n`;
      }

      const result = await sendWhatsAppMessage({
        phoneNumber: customerPhone,
        message,
      });

      if (result.success) {
        toast({
          title: 'הצלחה',
          description: 'הסיכום השבועי נשלח ב-WhatsApp',
        });
      } else {
        throw new Error(result.error || 'Failed to send WhatsApp message');
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשליחת הודעת WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const calculateDelta = (target: number | null, actual: number | null): string => {
    if (target === null || actual === null) return '-';
    const delta = actual - target;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${Math.round(delta)}`;
  };

  if (isLoadingCheckIns) {
    return (
      <Card className="rounded-3xl border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            סיכום אסטרטגיה שבועי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 w-full" dir="rtl">
      {/* Left Panel: Weekly Review Form */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <Card className="rounded-3xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                סיכום אסטרטגיה שבועי
              </CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(weekStart, 'dd/MM', { locale: he })} - {format(weekEnd, 'dd/MM', { locale: he })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedWeekStart}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedWeekStart(startOfWeek(date, { weekStartsOn: 0 }));
                      }
                    }}
                    initialFocus
                  />
                  <div className="flex gap-2 p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeekStart(subWeeks(selectedWeekStart, 1))}
                    >
                      שבוע קודם
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeekStart(addWeeks(selectedWeekStart, 1))}
                    >
                      שבוע הבא
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
        {/* Comparison Table - All fields editable */}
        <div className="w-full overflow-hidden">
          <table className="w-full text-sm table-auto" dir="rtl">
            <thead>
              <tr className="border-b">
                <th className="text-right p-2 font-semibold text-gray-700 w-[25%]">מדד</th>
                <th className="text-right p-2 font-semibold text-gray-700 w-[25%]">יעד</th>
                <th className="text-right p-2 font-semibold text-gray-700 w-[25%]">בפועל</th>
                <th className="text-right p-2 font-semibold text-gray-700 w-[25%]">הפרש</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 text-gray-900">קלוריות</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={targetCalories}
                      onChange={(e) => setTargetCalories(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">קק"ל</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={actualCalories}
                      onChange={(e) => setActualCalories(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">קק"ל</span>
                  </div>
                </td>
                <td className={cn(
                  "p-2 font-medium",
                  targetCalories && actualCalories
                    ? (parseFloat(actualCalories) >= parseFloat(targetCalories) ? "text-emerald-600" : "text-amber-600")
                    : "text-gray-500"
                )}>
                  {calculateDelta(parseNumber(targetCalories), parseNumber(actualCalories))}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2 text-gray-900">חלבון</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={targetProtein}
                      onChange={(e) => setTargetProtein(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">גרם</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={actualProtein}
                      onChange={(e) => setActualProtein(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">גרם</span>
                  </div>
                </td>
                <td className={cn(
                  "p-2 font-medium",
                  targetProtein && actualProtein
                    ? (parseFloat(actualProtein) >= parseFloat(targetProtein) ? "text-emerald-600" : "text-amber-600")
                    : "text-gray-500"
                )}>
                  {calculateDelta(parseNumber(targetProtein), parseNumber(actualProtein))}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2 text-gray-900">סיבים</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={targetFiber}
                      onChange={(e) => setTargetFiber(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">גרם</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={actualFiber}
                      onChange={(e) => setActualFiber(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">גרם</span>
                  </div>
                </td>
                <td className={cn(
                  "p-2 font-medium",
                  targetFiber && actualFiber
                    ? (parseFloat(actualFiber) >= parseFloat(targetFiber) ? "text-emerald-600" : "text-amber-600")
                    : "text-gray-500"
                )}>
                  {calculateDelta(parseNumber(targetFiber), parseNumber(actualFiber))}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2 text-gray-900">משקל ממוצע</td>
                <td className="p-2 text-gray-500">-</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={actualWeight}
                      onChange={(e) => setActualWeight(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">ק"ג</span>
                  </div>
                </td>
                <td className="p-2 text-gray-500">-</td>
              </tr>
              <tr>
                <td className="p-2 text-gray-900">היקף מותן</td>
                <td className="p-2 text-gray-500">-</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={actualWaist}
                      onChange={(e) => setActualWaist(e.target.value)}
                      className="h-8 w-16 text-sm"
                      placeholder="-"
                      dir="rtl"
                    />
                    <span className="text-xs text-gray-500">ס"מ</span>
                  </div>
                </td>
                <td className="p-2 text-gray-500">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Trainer Inputs - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="trainer-summary" className="text-sm font-semibold mb-2 block">
              סיכום ומסקנות
            </Label>
            <Textarea
              id="trainer-summary"
              value={trainerSummary}
              onChange={(e) => setTrainerSummary(e.target.value)}
              placeholder="כתוב סיכום ומסקנות מהשבוע..."
              className="min-h-[100px]"
              dir="rtl"
            />
          </div>

          <div>
            <Label htmlFor="action-plan" className="text-sm font-semibold mb-2 block">
              דגשים לשבוע הקרוב
            </Label>
            <Textarea
              id="action-plan"
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="כתוב דגשים לשבוע הקרוב..."
              className="min-h-[100px]"
              dir="rtl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="updated-steps" className="text-sm font-semibold mb-2 block">
                יעד צעדים לשבוע הבא
              </Label>
              <Input
                id="updated-steps"
                type="number"
                value={updatedStepsGoal}
                onChange={(e) => setUpdatedStepsGoal(e.target.value)}
                placeholder="צעדים"
                dir="rtl"
              />
            </div>
            <div>
              <Label htmlFor="updated-calories" className="text-sm font-semibold mb-2 block">
                יעד קלורי לשבוע הבא
              </Label>
              <Input
                id="updated-calories"
                type="number"
                value={updatedCaloriesTarget}
                onChange={(e) => setUpdatedCaloriesTarget(e.target.value)}
                placeholder="קק&quot;ל"
                dir="rtl"
              />
            </div>
          </div>

        {/* Action Buttons - Save button on left, WhatsApp on right */}
        <div className="flex gap-3 pt-4 border-t items-center justify-between">
          {/* Save button on the left */}
          <Button
            onClick={handleSave}
            disabled={saveReviewMutation.isPending}
            variant="default"
            className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
          >
            {saveReviewMutation.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                שמור סיכום שבועי
              </>
            )}
          </Button>

          {/* WhatsApp button on the right */}
          {customerPhone && (
            <Button
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp || saveReviewMutation.isPending}
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageSquare className="h-4 w-4" />
              {isSendingWhatsApp ? 'שולח...' : 'שלח לווטסאפ'}
            </Button>
          )}
        </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Last Check-in */}
      <div className="w-80 flex-shrink-0">
        <Card className="rounded-3xl border border-gray-200 shadow-sm h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              צ'ק-אין אחרון
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingLastCheckIn ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : lastCheckIn ? (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  <div className="font-semibold text-gray-900 mb-1">תאריך:</div>
                  {format(new Date(lastCheckIn.check_in_date), 'dd/MM/yyyy', { locale: he })}
                </div>
                
                <div className="space-y-3">
                  {/* Nutrition Section */}
                  {(lastCheckIn.calories_daily !== null || lastCheckIn.protein_daily !== null || lastCheckIn.fiber_daily !== null) && (
                    <div className="border-b pb-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">תזונה</div>
                      <div className="space-y-2 text-sm">
                        {lastCheckIn.calories_daily !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">קלוריות:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.calories_daily)} קק"ל</span>
                          </div>
                        )}
                        {lastCheckIn.protein_daily !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">חלבון:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.protein_daily)} גרם</span>
                          </div>
                        )}
                        {lastCheckIn.fiber_daily !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">סיבים:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.fiber_daily)} גרם</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Physical Measurements Section */}
                  {(lastCheckIn.weight !== null || lastCheckIn.waist_circumference !== null) && (
                    <div className="border-b pb-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">מדדי גוף</div>
                      <div className="space-y-2 text-sm">
                        {lastCheckIn.weight !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">משקל:</span>
                            <span className="font-semibold text-gray-900">{lastCheckIn.weight.toFixed(1)} ק"ג</span>
                          </div>
                        )}
                        {lastCheckIn.waist_circumference !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">היקף מותן:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.waist_circumference)} ס"מ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Activity Section */}
                  {lastCheckIn.steps_actual !== null && (
                    <div className="border-b pb-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">פעילות</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">צעדים:</span>
                          <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.steps_actual)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Additional measurements if available */}
                  {(lastCheckIn.belly_circumference !== null || lastCheckIn.thigh_circumference !== null || lastCheckIn.arm_circumference !== null || lastCheckIn.neck_circumference !== null) && (
                    <div className="border-b pb-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">מדידות נוספות</div>
                      <div className="space-y-2 text-sm">
                        {lastCheckIn.belly_circumference !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">היקף בטן:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.belly_circumference)} ס"מ</span>
                          </div>
                        )}
                        {lastCheckIn.thigh_circumference !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">היקף ירך:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.thigh_circumference)} ס"מ</span>
                          </div>
                        )}
                        {lastCheckIn.arm_circumference !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">היקף זרוע:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.arm_circumference)} ס"מ</span>
                          </div>
                        )}
                        {lastCheckIn.neck_circumference !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">היקף צוואר:</span>
                            <span className="font-semibold text-gray-900">{Math.round(lastCheckIn.neck_circumference)} ס"מ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                אין צ'ק-אין עדיין
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

