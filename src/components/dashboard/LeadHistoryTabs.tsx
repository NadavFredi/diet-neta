/**
 * LeadHistoryTabs Component
 * 
 * Displays workout history and steps history for a single lead.
 * Used in ActionDashboard for the active lead interaction.
 */

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Footprints, UtensilsCrossed, Pill, Plus, Wallet, Activity, CalendarDays, Trash2, Eye, FileText, Send, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyActivityLog } from './DailyActivityLog';
import { WeeklyReviewModule } from './WeeklyReviewModule';
import { WeeklyCheckInsList } from './WeeklyCheckInsList';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDate } from '@/utils/dashboard';
import { BudgetLinkBadge } from './BudgetLinkBadge';
import { PlanDetailModal } from './dialogs/PlanDetailModal';
import { DailyCheckInDetailModal } from './dialogs/DailyCheckInDetailModal';
import { AddWorkoutPlanDialog } from './dialogs/AddWorkoutPlanDialog';
import { AddNutritionPlanDialog } from './dialogs/AddNutritionPlanDialog';
import { StepsPlanDialog } from './dialogs/StepsPlanDialog';
import { BudgetDetailsModal } from './dialogs/BudgetDetailsModal';
import { SendBudgetModal } from './SendBudgetModal';
import { EditBudgetDialog } from './dialogs/EditBudgetDialog';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteBudgetAssignment, useBudget, useUpdateBudget, useCreateBudget } from '@/hooks/useBudgets';
import type { Budget } from '@/store/slices/budgetSlice';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WorkoutHistoryItem {
  id?: string;
  name?: string;
  startDate?: string;
  validUntil?: string;
  duration?: string;
  description?: string;
  strengthCount?: number;
  split?: {
    strength?: number;
    cardio?: number;
    intervals?: number;
  };
  strength?: number;
  cardio?: number;
  intervals?: number;
  budget_id?: string;
  created_at?: string;
  is_active?: boolean;
}

interface StepsHistoryItem {
  weekNumber?: string;
  week?: string;
  startDate?: string;
  endDate?: string;
  dates?: string;
  target?: number;
}

interface NutritionHistoryItem {
  id?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  template_id?: string;
  targets?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  budget_id?: string;
  created_at?: string;
  is_active?: boolean;
}

interface SupplementsHistoryItem {
  id?: string;
  startDate?: string;
  endDate?: string;
  supplements?: string[];
  description?: string;
  budget_id?: string;
  created_at?: string;
  is_active?: boolean;
}

interface BudgetAssignmentItem {
  id: string;
  budget_id: string;
  budget_name?: string;
  assigned_at: string;
  is_active: boolean;
}

interface LeadHistoryTabsProps {
  workoutHistory?: WorkoutHistoryItem[] | null;
  stepsHistory?: StepsHistoryItem[] | null;
  nutritionHistory?: NutritionHistoryItem[] | null;
  supplementsHistory?: SupplementsHistoryItem[] | null;
  budgetAssignments?: BudgetAssignmentItem[] | null;
  leadId?: string | null;
  customerId?: string | null;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  onAddSupplementsPlan: () => void;
  onAssignBudget: () => void;
  onAddWeeklyCheckIn?: () => void;
  weeklyReviewModule?: any;
}

export const LeadHistoryTabs = ({ 
  workoutHistory, 
  stepsHistory, 
  nutritionHistory, 
  supplementsHistory,
  budgetAssignments,
  leadId,
  customerId,
  onAddWorkoutPlan,
  onAddDietPlan,
  onAddSupplementsPlan,
  onAssignBudget,
  onAddWeeklyCheckIn,
  weeklyReviewModule,
}: LeadHistoryTabsProps) => {
  const [activeTab, setActiveTab] = useState('budgets');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const deleteBudgetAssignment = useDeleteBudgetAssignment();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<BudgetAssignmentItem | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<BudgetAssignmentItem | null>(null);
  const [viewingBudgetId, setViewingBudgetId] = useState<string | null>(null);
  const [sendingBudgetId, setSendingBudgetId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  
  // Fetch budget data when sendingBudgetId or editingBudgetId is set
  const { data: sendingBudget } = useBudget(sendingBudgetId);
  const { data: editingBudget, refetch: refetchEditingBudget } = useBudget(editingBudgetId);
  
  // Refetch budget when dialog opens to ensure fresh data
  useEffect(() => {
    if (editingBudgetId) {
      refetchEditingBudget();
    }
  }, [editingBudgetId, refetchEditingBudget]);
  const updateBudget = useUpdateBudget();
  const createBudget = useCreateBudget();
  
  // Dialog states
  const [isWorkoutPlanDialogOpen, setIsWorkoutPlanDialogOpen] = useState(false);
  const [isNutritionPlanDialogOpen, setIsNutritionPlanDialogOpen] = useState(false);
  const [isStepsPlanDialogOpen, setIsStepsPlanDialogOpen] = useState(false);
  const [editingWorkoutPlan, setEditingWorkoutPlan] = useState<any>(null);
  const [editingNutritionPlan, setEditingNutritionPlan] = useState<any>(null);
  const [editingStepsPlan, setEditingStepsPlan] = useState<any>(null);
  
  // Modal states (for PlanDetailModal - keeping for backward compatibility)
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState<WorkoutHistoryItem | null>(null);
  const [selectedNutritionPlan, setSelectedNutritionPlan] = useState<NutritionHistoryItem | null>(null);
  const [selectedSupplementPlan, setSelectedSupplementPlan] = useState<SupplementsHistoryItem | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<any | null>(null);

  // Deduplicate history arrays to prevent duplicate rows
  const deduplicatedWorkoutHistory = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return [];
    
    // Deduplicate by id first, then by budget_id + startDate combination
    // Prefer active items when duplicates exist
    const seen = new Map<string, WorkoutHistoryItem>();
    
    workoutHistory.forEach((item) => {
      if (item.id) {
        // Use id as primary key
        const existing = seen.get(item.id);
        if (!existing) {
          seen.set(item.id, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(item.id, item);
        }
      } else {
        // Fallback: use budget_id + startDate as key
        const key = `${item.budget_id || 'no-budget'}-${item.startDate || 'no-date'}`;
        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(key, item);
        }
      }
    });
    
    return Array.from(seen.values());
  }, [workoutHistory]);

  const deduplicatedNutritionHistory = useMemo(() => {
    if (!nutritionHistory || nutritionHistory.length === 0) return [];
    
    // Deduplicate by id first, then by budget_id + startDate combination
    // Prefer active items when duplicates exist
    const seen = new Map<string, NutritionHistoryItem>();
    
    nutritionHistory.forEach((item) => {
      if (item.id) {
        // Use id as primary key
        const existing = seen.get(item.id);
        if (!existing) {
          seen.set(item.id, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(item.id, item);
        }
      } else {
        // Fallback: use budget_id + startDate as key
        const key = `${item.budget_id || 'no-budget'}-${item.startDate || 'no-date'}`;
        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(key, item);
        }
      }
    });
    
    return Array.from(seen.values());
  }, [nutritionHistory]);

  const deduplicatedSupplementsHistory = useMemo(() => {
    if (!supplementsHistory || supplementsHistory.length === 0) return [];
    
    // Deduplicate by id first, then by budget_id + startDate combination
    // Prefer active items when duplicates exist
    const seen = new Map<string, SupplementsHistoryItem>();
    
    supplementsHistory.forEach((item) => {
      if (item.id) {
        // Use id as primary key
        const existing = seen.get(item.id);
        if (!existing) {
          seen.set(item.id, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(item.id, item);
        }
      } else {
        // Fallback: use budget_id + startDate as key
        const key = `${item.budget_id || 'no-budget'}-${item.startDate || 'no-date'}`;
        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(key, item);
        }
      }
    });
    
    return Array.from(seen.values());
  }, [supplementsHistory]);

  const deduplicatedStepsHistory = useMemo(() => {
    if (!stepsHistory || stepsHistory.length === 0) return [];
    
    // Deduplicate by id first (if available), then by budget_id + startDate + target combination
    // Prefer active items when duplicates exist
    const seen = new Map<string, StepsHistoryItem & { id?: string; budget_id?: string; is_active?: boolean }>();
    
    stepsHistory.forEach((item: any) => {
      if (item.id) {
        // Use id as primary key
        const existing = seen.get(item.id);
        if (!existing) {
          seen.set(item.id, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(item.id, item);
        }
      } else {
        // Fallback: use budget_id + startDate + target as key
        const key = `${item.budget_id || 'no-budget'}-${item.startDate || 'no-date'}-${item.target || 0}`;
        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, item);
        } else if (item.is_active && !existing.is_active) {
          // Prefer active item over inactive
          seen.set(key, item);
        }
      }
    });
    
    return Array.from(seen.values());
  }, [stepsHistory]);

  const hasWorkoutHistory = deduplicatedWorkoutHistory && deduplicatedWorkoutHistory.length > 0;
  const hasStepsHistory = deduplicatedStepsHistory && deduplicatedStepsHistory.length > 0;
  const hasNutritionHistory = deduplicatedNutritionHistory && deduplicatedNutritionHistory.length > 0;
  const hasSupplementsHistory = deduplicatedSupplementsHistory && deduplicatedSupplementsHistory.length > 0;
  const hasBudgetAssignments = budgetAssignments && budgetAssignments.length > 0;

  // Delete budget assignment handlers
  const handleDeleteClick = (assignment: BudgetAssignmentItem) => {
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
  };

  // Handle editing budget from lead page - create lead-specific copy if budget is shared
  const handleEditBudgetFromLead = async (assignment: BudgetAssignmentItem) => {
    try {
      // Check if budget is used by multiple assignments
      const { data: otherAssignments, error: checkError } = await supabase
        .from('budget_assignments')
        .select('id')
        .eq('budget_id', assignment.budget_id)
        .neq('id', assignment.id);

      if (checkError) throw checkError;

      let budgetIdToEdit = assignment.budget_id;

      // If budget is shared, create a private copy for this lead only
      if (otherAssignments && otherAssignments.length > 0) {
        // Fetch the original budget to copy it
        const { data: originalBudget, error: fetchError } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', assignment.budget_id)
          .single();

        if (fetchError) throw fetchError;

        // Create a private copy (is_public: false) - this won't show in "all budgets" main list
        const newBudget = await createBudget.mutateAsync({
          name: `${originalBudget.name}`,
          description: originalBudget.description || null,
          nutrition_template_id: originalBudget.nutrition_template_id,
          nutrition_targets: originalBudget.nutrition_targets,
          steps_goal: originalBudget.steps_goal,
          steps_instructions: originalBudget.steps_instructions || null,
          workout_template_id: originalBudget.workout_template_id,
          supplements: originalBudget.supplements || [],
          eating_order: originalBudget.eating_order || null,
          eating_rules: originalBudget.eating_rules || null,
          is_public: false, // Private copy - won't appear in main budgets list
        });

        // Update the assignment to use the new private copy
        const { error: updateError } = await supabase
          .from('budget_assignments')
          .update({ budget_id: newBudget.id })
          .eq('id', assignment.id);

        if (updateError) throw updateError;

        budgetIdToEdit = newBudget.id;

        toast({
          title: 'הצלחה',
          description: 'נוצר עותק פרטי של התקציב. שינויים יעשו רק על הליד הזה.',
        });
      }

      // Store the assignment for later use in save handler
      setCurrentAssignment(assignment);
      // Open edit dialog for the budget (original or private copy)
      setEditingBudgetId(budgetIdToEdit);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעריכת התקציב',
        variant: 'destructive',
      });
    }
  };

  const handleSaveBudget = async (data: any) => {
    if (!editingBudget) return;

    try {
      const updateResult = await updateBudget.mutateAsync({
        budgetId: editingBudget.id,
        name: data.name,
        description: data.description ?? null,
        nutrition_template_id: data.nutrition_template_id ?? null,
        nutrition_targets: data.nutrition_targets,
        steps_goal: data.steps_goal,
        steps_instructions: data.steps_instructions ?? null,
        workout_template_id: data.workout_template_id ?? null,
        supplements: data.supplements || [],
        eating_order: data.eating_order ?? null,
        eating_rules: data.eating_rules ?? null,
      });

      toast({
        title: 'הצלחה',
        description: 'התקציב עודכן בהצלחה',
      });

      // Invalidate all relevant queries to ensure UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['budget', editingBudget.id] }),
        queryClient.invalidateQueries({ queryKey: ['budget', updateResult.id] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
      ]);

      // Refetch to ensure we have the latest data
      await queryClient.refetchQueries({ queryKey: ['budgets'] });
      await queryClient.refetchQueries({ queryKey: ['budget', editingBudget.id] });

      setEditingBudgetId(null);
      setCurrentAssignment(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון התקציב',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;

    try {
      await deleteBudgetAssignment.mutateAsync(assignmentToDelete.id);
      toast({
        title: 'הצלחה',
        description: 'התקציב והתכניות המקושרות נמחקו בהצלחה',
      });
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת התקציב',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAssignmentEdit = async () => {
    if (!editingAssignment) return;

    try {
      const { error } = await supabase
        .from('budget_assignments')
        .update({ notes: editNotes })
        .eq('id', editingAssignment.id);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הערות ההקצאה עודכנו בהצלחה',
      });

      queryClient.invalidateQueries({ queryKey: ['plans-history'] });
      setEditingAssignment(null);
      setEditNotes('');
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון הערות ההקצאה',
        variant: 'destructive',
      });
    }
  };


  // Handler functions
  const handleWorkoutClick = () => {
    onAddWorkoutPlan();
  };

  const handleDietClick = () => {
    onAddDietPlan();
  };

  const handleSupplementsClick = () => {
    // Supplements plan - placeholder for now (empty as requested)
    onAddSupplementsPlan();
  };

  // Get the appropriate button for the active tab
  // Managers can only assign budgets - all other plans are created automatically
  // When weekly-checkin tab is active, show "Add Check-in" button
  const getActionButton = () => {
    if (activeTab === 'weekly-checkin' && onAddWeeklyCheckIn) {
      return (
        <Button 
          size="sm" 
          onClick={onAddWeeklyCheckIn}
          type="button"
          className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
        >
          <Plus className="h-4 w-4" />
          הוסף דיווח שבועי
        </Button>
      );
    }
    
    // Default: show budget assignment button - all plans are created from budgets
    return (
      <Button 
        size="sm" 
        onClick={onAssignBudget}
        type="button"
        className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white"
      >
        <Plus className="h-4 w-4" />
        הקצה תקציב
      </Button>
    );
  };

  // Always show tabs, even if empty
  return (
    <Card className="p-3 border border-slate-100 rounded-lg shadow-sm bg-white mt-3">
      {/* Header Toolbar with Context-Aware Add Button */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
        {getActionButton()}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
        <div className="relative mb-4 -mx-3 px-3">
          {/* Scrollable container for mobile */}
          <div className="overflow-x-auto scrollbar-hide pb-1">
            <TabsList className="inline-flex min-w-full lg:grid lg:grid-cols-7 h-10 bg-gray-100 rounded-lg p-1 gap-1">
              <TabsTrigger 
                value="budgets" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E8EDF7] data-[state=active]:text-[#5B6FB9] data-[state=active]:shadow-sm data-[state=inactive]:text-[#5B6FB9]/70 data-[state=inactive]:hover:bg-[#E8EDF7]/50 transition-all flex-shrink-0"
              >
                תקציבים
              </TabsTrigger>
              <TabsTrigger 
                value="workouts" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E8EDF7] data-[state=active]:text-[#5B6FB9] data-[state=active]:shadow-sm data-[state=inactive]:text-[#5B6FB9]/70 data-[state=inactive]:hover:bg-[#E8EDF7]/50 transition-all flex-shrink-0"
              >
                יומן אימונים
              </TabsTrigger>
              <TabsTrigger 
                value="steps" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E8EDF7] data-[state=active]:text-[#5B6FB9] data-[state=active]:shadow-sm data-[state=inactive]:text-[#5B6FB9]/70 data-[state=inactive]:hover:bg-[#E8EDF7]/50 transition-all flex-shrink-0"
              >
                יומן צעדים
              </TabsTrigger>
              <TabsTrigger 
                value="nutrition" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E8EDF7] data-[state=active]:text-[#5B6FB9] data-[state=active]:shadow-sm data-[state=inactive]:text-[#5B6FB9]/70 data-[state=inactive]:hover:bg-[#E8EDF7]/50 transition-all flex-shrink-0"
              >
                תכניות תזונה
              </TabsTrigger>
              <TabsTrigger 
                value="supplements" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E8EDF7] data-[state=active]:text-[#5B6FB9] data-[state=active]:shadow-sm data-[state=inactive]:text-[#5B6FB9]/70 data-[state=inactive]:hover:bg-[#E8EDF7]/50 transition-all border-l-2 border-gray-300 flex-shrink-0"
              >
                תכניות תוספים
              </TabsTrigger>
              <TabsTrigger 
                value="daily-activity" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E0F2FE] data-[state=active]:text-[#0C4A6E] data-[state=active]:shadow-sm data-[state=inactive]:text-[#0C4A6E]/70 data-[state=inactive]:hover:bg-[#E0F2FE]/50 transition-all flex-shrink-0"
              >
                יומן פעילות
              </TabsTrigger>
              <TabsTrigger 
                value="weekly-checkin" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E0F2FE] data-[state=active]:text-[#0C4A6E] data-[state=active]:shadow-sm data-[state=inactive]:text-[#0C4A6E]/70 data-[state=inactive]:hover:bg-[#E0F2FE]/50 transition-all flex-shrink-0"
              >
                דיווח שבועי
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Workout History Tab */}
        <TabsContent value="workouts" className="mt-0">
          {!hasWorkoutHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#E8EDF7] flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-[#5B6FB9]" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תוכניות אימון</p>
              <p className="text-gray-400 text-xs mb-3">תכניות אימונים נוצרות אוטומטית מהתקציב</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white border-[#5B6FB9]"
              >
                <Plus className="h-4 w-4" />
                הקצה תקציב
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תיאור</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deduplicatedWorkoutHistory.map((workout, index) => {
                    // Ensure only the first active plan (by sorted order) is shown as active
                    const firstActiveIndex = deduplicatedWorkoutHistory.findIndex((w: any) => w.is_active === true);
                    const isActive = workout.is_active === true && index === firstActiveIndex;
                    
                    return (
                      <TableRow
                        key={workout.id ? `workout-${workout.id}-${index}` : `workout-${index}`}
                        onClick={async () => {
                          if (workout.id) {
                            // Fetch full plan data
                            try {
                              const { data, error } = await supabase
                                .from('workout_plans')
                                .select('*')
                                .eq('id', workout.id)
                                .single();
                              
                              if (error) throw error;
                              setEditingWorkoutPlan(data);
                              setIsWorkoutPlanDialogOpen(true);
                            } catch (error: any) {
                              toast({
                                title: 'שגיאה',
                                description: error?.message || 'נכשל בטעינת תוכנית האימונים',
                                variant: 'destructive',
                              });
                            }
                          } else {
                            setSelectedWorkoutPlan(workout);
                          }
                        }}
                      className={`transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-blue-50 hover:shadow-sm border-b border-gray-100`}
                      >
                        <TableCell className="text-xs font-semibold text-gray-900 py-3">
                          {workout.startDate ? formatDate(workout.startDate) : '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs font-semibold text-gray-900 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate">{workout.description || workout.name || '-'}</span>
                            {isActive && (
                              <Badge className="bg-blue-500 text-white border-0 text-xs px-2 py-0.5 font-semibold">
                                פעיל
                              </Badge>
                            )}
                            {workout.budget_id && (
                              <BudgetLinkBadge budgetId={workout.budget_id} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Steps History Tab */}
        <TabsContent value="steps" className="mt-0">
          {!hasStepsHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-cyan-100 flex items-center justify-center">
                <Footprints className="h-6 w-6 text-cyan-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריית צעדים</p>
              <p className="text-gray-400 text-xs mb-3">יעדי צעדים נקבעים אוטומטית מהתקציב</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white border-[#5B6FB9]"
              >
                <Plus className="h-4 w-4" />
                הקצה תקציב
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {deduplicatedStepsHistory.map((step: any, index: number) => {
                // Use is_active from the data, but ensure only the first active plan (by date) is shown as active
                // Find the first active plan's index to ensure only one is marked
                const firstActiveIndex = deduplicatedStepsHistory.findIndex((s: any) => s.is_active === true);
                const isCurrent = step.is_active === true && index === firstActiveIndex;
                return (
                  <div
                    key={step.id ? `step-${step.id}-${index}` : `step-${step.weekNumber || step.week || index}-${step.startDate || step.dates || index}-${index}`}
                    onClick={async () => {
                      if (customerId) {
                        // Fetch customer's daily_protocol for steps goal
                        try {
                          const { data, error } = await supabase
                            .from('customers')
                            .select('daily_protocol')
                            .eq('id', customerId)
                            .single();
                          
                          if (error) throw error;
                          
                          setEditingStepsPlan({
                            stepsGoal: data?.daily_protocol?.stepsGoal || step.target || 0,
                            stepsInstructions: '', // Steps instructions are stored in budget, not customer
                          });
                          setIsStepsPlanDialogOpen(true);
                        } catch (error: any) {
                          toast({
                            title: 'שגיאה',
                            description: error?.message || 'נכשל בטעינת יעד הצעדים',
                            variant: 'destructive',
                          });
                        }
                      }
                    }}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                      isCurrent
                        ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300 shadow-md hover:shadow-lg'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                        isCurrent ? 'bg-cyan-500' : 'bg-gray-300'
                      }`}>
                        <Footprints className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-900'}`}>
                            {step.weekNumber || step.week || `שבוע ${index + 1}`}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-cyan-500 text-white border-0 text-xs px-2 py-0.5 font-semibold">
                              פעיל
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {step.startDate ? formatDate(step.startDate) : step.dates || ''} 
                          {step.endDate ? ` - ${formatDate(step.endDate)}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-900'}`}>
                      {(step.target || 0).toLocaleString('he-IL')} צעדים
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Nutrition History Tab */}
        <TabsContent value="nutrition" className="mt-0">
          {!hasNutritionHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#E8EDF7] flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6 text-[#5B6FB9]" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תכניות תזונה</p>
              <p className="text-gray-400 text-xs mb-3">תכניות תזונה נוצרות אוטומטית מהתקציב</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white border-[#5B6FB9]"
              >
                <Plus className="h-4 w-4" />
                הקצה תקציב
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך סיום</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תיאור</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">קלוריות</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">חלבון</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">פחמימות</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">שומן</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deduplicatedNutritionHistory.map((nutrition, index) => {
                    // Ensure only the first active plan (by sorted order) is shown as active
                    const firstActiveIndex = deduplicatedNutritionHistory.findIndex((n: any) => n.is_active === true);
                    const isActive = nutrition.is_active === true && index === firstActiveIndex;
                    
                    return (
                    <TableRow
                      key={nutrition.id ? `nutrition-${nutrition.id}-${index}` : `nutrition-${index}`}
                      onClick={async () => {
                        if (nutrition.id) {
                          // Fetch full plan data
                          try {
                            const { data, error } = await supabase
                              .from('nutrition_plans')
                              .select('*')
                              .eq('id', nutrition.id)
                              .single();
                            
                            if (error) throw error;
                            setEditingNutritionPlan(data);
                            setIsNutritionPlanDialogOpen(true);
                          } catch (error: any) {
                            toast({
                              title: 'שגיאה',
                              description: error?.message || 'נכשל בטעינת תוכנית התזונה',
                              variant: 'destructive',
                            });
                          }
                        } else {
                          setSelectedNutritionPlan(nutrition);
                        }
                      }}
                      className={`transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-orange-50 border-l-4 border-l-orange-500'
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-orange-50 hover:shadow-sm border-b border-gray-100`}
                    >
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {nutrition.startDate ? formatDate(nutrition.startDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {nutrition.endDate ? formatDate(nutrition.endDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs font-semibold text-gray-900 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate">{nutrition.description || '-'}</span>
                          {isActive && (
                            <Badge className="bg-orange-500 text-white border-0 text-xs px-2 py-0.5 font-semibold">
                              פעיל
                            </Badge>
                          )}
                          {nutrition.budget_id && (
                            <BudgetLinkBadge budgetId={nutrition.budget_id} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.calories || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.protein ? `${nutrition.targets.protein}ג` : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.carbs ? `${nutrition.targets.carbs}ג` : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.fat ? `${nutrition.targets.fat}ג` : '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Supplements History Tab */}
        <TabsContent value="supplements" className="mt-0">
          {!hasSupplementsHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#E8EDF7] flex items-center justify-center">
                <Pill className="h-6 w-6 text-[#5B6FB9]" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תכניות תוספים</p>
              <p className="text-gray-400 text-xs mb-3">תכניות תוספים נוצרות אוטומטית מהתקציב</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white border-[#5B6FB9]"
              >
                <Plus className="h-4 w-4" />
                הקצה תקציב
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך סיום</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תיאור</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תוספים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deduplicatedSupplementsHistory.map((supplement, index) => {
                    // Ensure only the first active plan (by sorted order) is shown as active
                    const firstActiveIndex = deduplicatedSupplementsHistory.findIndex((s: any) => s.is_active === true);
                    const isActive = supplement.is_active === true && index === firstActiveIndex;
                    
                    return (
                    <TableRow
                      key={supplement.id ? `supplement-${supplement.id}-${index}` : `supplement-${index}`}
                      onClick={() => setSelectedSupplementPlan(supplement)}
                      className={`transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-green-50 border-l-4 border-l-green-500'
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-green-50 hover:shadow-sm border-b border-gray-100`}
                    >
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {supplement.startDate ? formatDate(supplement.startDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {supplement.endDate ? formatDate(supplement.endDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs font-semibold text-gray-900 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate">{supplement.description || '-'}</span>
                          {isActive && (
                            <Badge className="bg-green-500 text-white border-0 text-xs px-2 py-0.5 font-semibold">
                              פעיל
                            </Badge>
                          )}
                          {supplement.budget_id && (
                            <BudgetLinkBadge budgetId={supplement.budget_id} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {(supplement.supplements || []).map((sup: string, idx: number) => (
                            <Badge 
                              key={idx}
                              variant="outline" 
                              className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 font-semibold"
                            >
                              {sup}
                            </Badge>
                          ))}
                          {(!supplement.supplements || supplement.supplements.length === 0) && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Daily Activity Log Tab */}
        <TabsContent value="daily-activity" className="mt-0">
          <DailyActivityLog 
            leadId={leadId} 
            customerId={customerId} 
            showCardWrapper={false}
            onRowClick={(checkIn) => setSelectedCheckIn(checkIn)}
          />
        </TabsContent>

        {/* Weekly Check-in Tab */}
        <TabsContent value="weekly-checkin" className="mt-0">
          <WeeklyCheckInsList
            leadId={leadId || undefined}
            customerId={customerId || undefined}
            customerPhone={null}
            customerName={null}
          />
        </TabsContent>

        {/* Budget Assignments Tab */}
        <TabsContent value="budgets" className="mt-0">
          {!hasBudgetAssignments ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#E8EDF7] flex items-center justify-center">
                <Wallet className="h-6 w-6 text-[#5B6FB9]" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין תקציבים מוקצים</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white border-[#5B6FB9]"
              >
                <Plus className="h-4 w-4" />
                הקצה תקציב
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תקציב</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך הקצאה</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">סטטוס</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3 w-20">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetAssignments.map((assignment, index) => (
                    <TableRow
                      key={assignment.id ? `budget-${assignment.id}-${index}` : `budget-${index}`}
                      onClick={() => handleEditBudgetFromLead(assignment)}
                      className={`transition-all duration-200 cursor-pointer ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-purple-50 hover:shadow-sm border-b border-gray-100`}
                    >
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {assignment.budget_name || assignment.budget_id}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {assignment.assigned_at ? formatDate(assignment.assigned_at) : '-'}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge 
                          variant="outline" 
                          className={`${
                            assignment.is_active
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          } text-xs px-2 py-0.5 font-semibold`}
                        >
                          {assignment.is_active ? 'פעיל' : 'לא פעיל'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <TooltipProvider>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* View Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open budget details modal
                                    setViewingBudgetId(assignment.budget_id);
                                  }}
                                  disabled={deleteBudgetAssignment.isPending}
                                  className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>תצוגה מהירה</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Export PDF Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Navigate to print page for this budget
                                    navigate(`/dashboard/print/budget/${assignment.budget_id}`);
                                  }}
                                  disabled={deleteBudgetAssignment.isPending}
                                  className="h-7 w-7 p-0 hover:bg-purple-50 hover:text-purple-600"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>הדפס תקציב</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Send WhatsApp Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Fetch customer phone if we have customerId
                                    if (customerId && !customerPhone) {
                                      try {
                                        const { data: customer } = await supabase
                                          .from('customers')
                                          .select('phone')
                                          .eq('id', customerId)
                                          .single();
                                        if (customer?.phone) {
                                          setCustomerPhone(customer.phone);
                                        }
                                      } catch (error) {
                                        // Silent failure
                                      }
                                    }
                                    // Open send budget modal
                                    setSendingBudgetId(assignment.budget_id);
                                  }}
                                  disabled={deleteBudgetAssignment.isPending}
                                  className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-600"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>שלח תקציב</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Edit Button - Edit budget for this lead only */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditBudgetFromLead(assignment);
                                  }}
                                  disabled={deleteBudgetAssignment.isPending}
                                  className="h-7 w-7 p-0 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>ערוך תקציב (השפעה רק על הליד הזה)</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Delete Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(assignment);
                                  }}
                                  disabled={deleteBudgetAssignment.isPending}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>מחק הקצאה</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Budget Assignment Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת הקצאת תקציב</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הקצאת התקציב "{assignmentToDelete?.budget_name || assignmentToDelete?.budget_id}"?
              <br /><br />
              <strong>פעולה זו תמחק גם את כל התכניות המקושרות:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>תכניות אימונים</li>
                <li>תכניות תזונה</li>
                <li>תכניות תוספים</li>
                <li>תכניות צעדים</li>
              </ul>
              <br />
              פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteBudgetAssignment.isPending}
            >
              {deleteBudgetAssignment.isPending ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <PlanDetailModal
        isOpen={!!selectedWorkoutPlan}
        onClose={() => setSelectedWorkoutPlan(null)}
        planType="workout"
        planData={selectedWorkoutPlan ? {
          id: selectedWorkoutPlan.id,
          startDate: selectedWorkoutPlan.startDate,
          description: selectedWorkoutPlan.description || selectedWorkoutPlan.name,
          strength: selectedWorkoutPlan.split?.strength || selectedWorkoutPlan.strengthCount || selectedWorkoutPlan.strength || 0,
          cardio: selectedWorkoutPlan.split?.cardio || selectedWorkoutPlan.cardioCount || selectedWorkoutPlan.cardio || 0,
          intervals: selectedWorkoutPlan.split?.intervals || selectedWorkoutPlan.intervalsCount || selectedWorkoutPlan.intervals || 0,
          budget_id: selectedWorkoutPlan.budget_id,
          created_at: selectedWorkoutPlan.created_at,
        } : null}
        leadId={leadId}
        customerId={customerId}
      />

      <PlanDetailModal
        isOpen={!!selectedNutritionPlan}
        onClose={() => setSelectedNutritionPlan(null)}
        planType="nutrition"
        planData={selectedNutritionPlan ? {
          id: selectedNutritionPlan.id,
          startDate: selectedNutritionPlan.startDate,
          endDate: selectedNutritionPlan.endDate,
          description: selectedNutritionPlan.description,
          targets: selectedNutritionPlan.targets,
          budget_id: selectedNutritionPlan.budget_id,
          created_at: selectedNutritionPlan.created_at,
        } : null}
        leadId={leadId}
        customerId={customerId}
      />

      <PlanDetailModal
        isOpen={!!selectedSupplementPlan}
        onClose={() => setSelectedSupplementPlan(null)}
        planType="supplements"
        planData={selectedSupplementPlan ? {
          id: selectedSupplementPlan.id,
          startDate: selectedSupplementPlan.startDate,
          endDate: selectedSupplementPlan.endDate,
          description: selectedSupplementPlan.description,
          supplements: selectedSupplementPlan.supplements,
          budget_id: selectedSupplementPlan.budget_id,
          created_at: selectedSupplementPlan.created_at,
        } : null}
        leadId={leadId}
        customerId={customerId}
      />

      <DailyCheckInDetailModal
        isOpen={!!selectedCheckIn}
        onClose={() => setSelectedCheckIn(null)}
        checkIn={selectedCheckIn}
        customerId={customerId}
      />

      {/* Workout Plan Dialog */}
      <AddWorkoutPlanDialog
        isOpen={isWorkoutPlanDialogOpen}
        onOpenChange={(open) => {
          setIsWorkoutPlanDialogOpen(open);
          if (!open) setEditingWorkoutPlan(null);
        }}
        onSave={async (data) => {
          if (editingWorkoutPlan?.id) {
            // Update existing plan
            try {
              const { error } = await supabase
                .from('workout_plans')
                .update({
                  ...data,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', editingWorkoutPlan.id);
              
              if (error) throw error;
              
              queryClient.invalidateQueries({ queryKey: ['plans-history'] });
              queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
              
              toast({
                title: 'הצלחה',
                description: 'תוכנית האימונים עודכנה בהצלחה',
              });
              
              setIsWorkoutPlanDialogOpen(false);
              setEditingWorkoutPlan(null);
            } catch (error: any) {
              toast({
                title: 'שגיאה',
                description: error?.message || 'נכשל בעדכון תוכנית האימונים',
                variant: 'destructive',
              });
            }
          } else {
            // Create new plan
            onAddWorkoutPlan();
          }
        }}
        customerId={customerId}
        leadId={leadId}
        initialData={editingWorkoutPlan}
      />

      {/* Nutrition Plan Dialog */}
      <AddNutritionPlanDialog
        isOpen={isNutritionPlanDialogOpen}
        onOpenChange={(open) => {
          setIsNutritionPlanDialogOpen(open);
          if (!open) setEditingNutritionPlan(null);
        }}
        onSave={async (data) => {
          if (editingNutritionPlan?.id) {
            // Update existing plan
            try {
              const { error } = await supabase
                .from('nutrition_plans')
                .update({
                  targets: data,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', editingNutritionPlan.id);
              
              if (error) throw error;
              
              queryClient.invalidateQueries({ queryKey: ['plans-history'] });
              queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
              
              toast({
                title: 'הצלחה',
                description: 'תוכנית התזונה עודכנה בהצלחה',
              });
              
              setIsNutritionPlanDialogOpen(false);
              setEditingNutritionPlan(null);
            } catch (error: any) {
              toast({
                title: 'שגיאה',
                description: error?.message || 'נכשל בעדכון תוכנית התזונה',
                variant: 'destructive',
              });
            }
          } else {
            // Create new plan
            onAddDietPlan();
          }
        }}
        customerId={customerId}
        leadId={leadId}
        initialData={editingNutritionPlan}
      />

      {/* Steps Plan Dialog */}
      <StepsPlanDialog
        isOpen={isStepsPlanDialogOpen}
        onOpenChange={(open) => {
          setIsStepsPlanDialogOpen(open);
          if (!open) setEditingStepsPlan(null);
        }}
        customerId={customerId}
        leadId={leadId}
        initialData={editingStepsPlan}
      />

      {/* Budget Details Modal */}
      <BudgetDetailsModal
        isOpen={!!viewingBudgetId}
        onOpenChange={(open) => {
          if (!open) setViewingBudgetId(null);
        }}
        budgetId={viewingBudgetId}
      />

      {/* Send Budget Modal */}
      <SendBudgetModal
        isOpen={!!sendingBudgetId && !!sendingBudget}
        onOpenChange={(open) => {
          if (!open) {
            setSendingBudgetId(null);
            setCustomerPhone(null);
          }
        }}
        budget={sendingBudget}
        phoneNumber={customerPhone}
      />

      {/* Edit Budget Dialog - Opens when editing budget from lead page */}
      <EditBudgetDialog
        isOpen={!!editingBudgetId && !!editingBudget}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBudgetId(null);
            setCurrentAssignment(null);
          }
        }}
        editingBudget={editingBudget}
        onSave={handleSaveBudget}
      />
    </Card>
  );
};




