
import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dumbbell, Footprints, UtensilsCrossed, Pill, Plus, Wallet, Edit, Trash2, FileText, Send, ChevronDown, ChevronUp, ListOrdered, ScrollText, Save, X, Check, ArrowLeft, Heart } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { BudgetLinkBadge } from './BudgetLinkBadge';
import { PlanDetailModal } from './dialogs/PlanDetailModal';
import { AddWorkoutPlanDialog } from './dialogs/AddWorkoutPlanDialog';
import { AddNutritionPlanDialog } from './dialogs/AddNutritionPlanDialog';
import { BudgetDetailsModal } from './dialogs/BudgetDetailsModal';
import { SendBudgetModal } from './SendBudgetModal';
import { InlineEditableField } from './InlineEditableField';
import { EditBudgetDialog } from './dialogs/EditBudgetDialog';
import { AerobicActivityModal } from './dialogs/AerobicActivityModal';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteBudgetAssignment, useBudget, useUpdateBudget, useCreateBudget, useAssignBudgetToLead, useAssignBudgetToCustomer, type BudgetWithTemplates } from '@/hooks/useBudgets';
import { useSaveActionPlan, createBudgetSnapshot } from '@/hooks/useSavedActionPlans';
import { useBudgetDetails } from '@/hooks/useBudgetDetails';
import { useNavigate } from 'react-router-dom';
import { syncPlansFromBudget, syncSupplementPlansFromBudgetUpdate, syncStepsPlansFromBudgetUpdate } from '@/services/budgetPlanSync';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Interfaces (copied from LeadHistoryTabs to avoid circular deps or refactoring for now)
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
  weeklyWorkout?: any;
}

interface StepsHistoryItem {
  weekNumber?: string;
  week?: string;
  startDate?: string;
  endDate?: string;
  dates?: string;
  target?: number;
  budget_id?: string;
  is_active?: boolean;
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
  supplements?: any[];
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

interface PlansCardProps {
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
}

export const PlansCard = ({
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
}: PlansCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const deleteBudgetAssignment = useDeleteBudgetAssignment();
  const createBudget = useCreateBudget();
  const assignToLead = useAssignBudgetToLead();
  const assignToCustomer = useAssignBudgetToCustomer();

  // Function to create blank plans (workout, nutrition, supplements, steps)
  const handleCreateBlankPlans = async () => {
    if (!leadId && !customerId) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא ליד או לקוח',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const today = new Date().toISOString().split('T')[0];
      const finalCustomerId = customerId || null;
      const finalLeadId = leadId || null;

      // First, create a blank budget
      const newBudget = await createBudget.mutateAsync({
        name: 'תכנית פעולה ריקה',
        description: 'תכנית פעולה ריקה שנוצרה אוטומטית',
        nutrition_template_id: null,
        nutrition_targets: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65,
          fiber_min: 30,
        },
        steps_goal: 0,
        steps_instructions: null,
        workout_template_id: null,
        supplement_template_id: null,
        supplements: [],
        eating_order: null,
        eating_rules: null,
        cardio_training: null,
        interval_training: null,
        is_public: false,
      });

      // Assign the budget to the lead or customer
      if (finalLeadId) {
        await assignToLead.mutateAsync({
          budgetId: newBudget.id,
          leadId: finalLeadId,
        });
      } else if (finalCustomerId) {
        await assignToCustomer.mutateAsync({
          budgetId: newBudget.id,
          customerId: finalCustomerId,
        });
      }

      // Now create all plans with the budget_id
      // Create workout plan
      const { data: workoutPlan, error: workoutError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          customer_id: finalCustomerId,
          lead_id: finalLeadId,
          budget_id: newBudget.id,
          name: 'תכנית אימונים חדשה',
          start_date: today,
          description: 'תכנית אימונים ריקה',
          strength: 0,
          cardio: 0,
          intervals: 0,
          custom_attributes: { schema: [], data: {} },
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (workoutError) {
        console.error('Error creating workout plan:', workoutError);
      }

      // Create nutrition plan
      const { data: nutritionPlan, error: nutritionError } = await supabase
        .from('nutrition_plans')
        .insert({
          user_id: user.id,
          customer_id: finalCustomerId,
          lead_id: finalLeadId,
          budget_id: newBudget.id,
          name: 'תכנית תזונה חדשה',
          start_date: today,
          description: 'תכנית תזונה ריקה',
          targets: {
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65,
            fiber: 30,
          },
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (nutritionError) {
        console.error('Error creating nutrition plan:', nutritionError);
      }

      // Create supplement plan
      const { data: supplementPlan, error: supplementError } = await supabase
        .from('supplement_plans')
        .insert({
          user_id: user.id,
          customer_id: finalCustomerId,
          lead_id: finalLeadId,
          budget_id: newBudget.id,
          start_date: today,
          description: 'תכנית תוספים ריקה',
          supplements: [],
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (supplementError) {
        console.error('Error creating supplement plan:', supplementError);
      }

      // Create steps plan
      const { data: stepsPlan, error: stepsError } = await supabase
        .from('steps_plans')
        .insert({
          user_id: user.id,
          customer_id: finalCustomerId,
          lead_id: finalLeadId,
          budget_id: newBudget.id,
          start_date: today,
          description: 'תכנית צעדים ריקה',
          steps_goal: 0,
          steps_instructions: null,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (stepsError) {
        console.error('Error creating steps plan:', stepsError);
      }

      // Invalidate queries to refresh the UI - invalidate all variations
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history', finalCustomerId, finalLeadId] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history', finalCustomerId] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history', null, finalLeadId] }),
        queryClient.invalidateQueries({ queryKey: ['workout-plan'] }),
        queryClient.invalidateQueries({ queryKey: ['workout-plan', finalCustomerId] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-plan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-plan', finalCustomerId] }),
        queryClient.invalidateQueries({ queryKey: ['supplement-plan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplementPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplement-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['budgetAssignment'] }),
      ]);

      // Force refetch by refetching the plans-history query
      await queryClient.refetchQueries({ queryKey: ['plans-history', finalCustomerId, finalLeadId] });

      toast({
        title: 'תכניות נוצרו בהצלחה',
        description: 'נוצרו תכנית פעולה ריקה ותכנית ריקה לאימונים, תזונה, תוספים וצעדים',
      });
    } catch (error: any) {
      console.error('Error creating blank plans:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת התכניות',
        variant: 'destructive',
      });
    }
  };

  // States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<BudgetAssignmentItem | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<BudgetAssignmentItem | null>(null);
  const [viewingBudgetId, setViewingBudgetId] = useState<string | null>(null);
  const [sendingBudgetId, setSendingBudgetId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const saveActionPlan = useSaveActionPlan();

  // Inline editing states
  const [editingField, setEditingField] = useState<'description' | 'eating_order' | 'eating_rules' | 'steps_goal' | 'steps_instructions' | null>(null);
  const [editValues, setEditValues] = useState<{
    description?: string;
    eating_order?: string;
    eating_rules?: string;
    steps_goal?: number;
    steps_instructions?: string;
  }>({});
  const [previousValues, setPreviousValues] = useState<{
    steps_goal?: number;
    steps_instructions?: string;
  }>({});

  // Dialog states
  const [isWorkoutPlanDialogOpen, setIsWorkoutPlanDialogOpen] = useState(false);
  const [isNutritionPlanDialogOpen, setIsNutritionPlanDialogOpen] = useState(false);
  const [editingWorkoutPlan, setEditingWorkoutPlan] = useState<any>(null);
  const [editingNutritionPlan, setEditingNutritionPlan] = useState<any>(null);
  const [isAerobicActivityModalOpen, setIsAerobicActivityModalOpen] = useState(false);

  // Modal states for details
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState<WorkoutHistoryItem | null>(null);
  const [selectedNutritionPlan, setSelectedNutritionPlan] = useState<NutritionHistoryItem | null>(null);
  const [selectedSupplementPlan, setSelectedSupplementPlan] = useState<SupplementsHistoryItem | null>(null);

  // Queries
  const { data: sendingBudget } = useBudget(sendingBudgetId);
  const { data: editingBudget, refetch: refetchEditingBudget } = useBudget(editingBudgetId);
  const updateBudget = useUpdateBudget();
  useEffect(() => {
    if (editingBudgetId) {
      refetchEditingBudget();
    }
  }, [editingBudgetId, refetchEditingBudget]);

  // Determine active assignment
  const activeAssignment = useMemo(() => {
    return budgetAssignments?.find(b => b.is_active) || budgetAssignments?.[0] || null;
  }, [budgetAssignments]);

  // Determine active plans
  const activeWorkout = useMemo(() => {
    if (!workoutHistory?.length) return null;
    return workoutHistory.find(w => w.is_active) || workoutHistory[0];
  }, [workoutHistory]);

  const activeNutrition = useMemo(() => {
    if (!nutritionHistory?.length) return null;
    return nutritionHistory.find(n => n.is_active) || nutritionHistory[0];
  }, [nutritionHistory]);

  const activeSteps = useMemo(() => {
    if (!stepsHistory?.length) return null;
    // Find first active, or first in list
    const active = stepsHistory.find((s: any) => s.is_active);
    return active || stepsHistory[0];
  }, [stepsHistory]);

  const activeSupplements = useMemo(() => {
    if (!supplementsHistory?.length) return null;
    return supplementsHistory.find(s => s.is_active) || supplementsHistory[0];
  }, [supplementsHistory]);

  // Determine fallback budget ID if activeAssignment is missing
  const fallbackBudgetId = useMemo(() => {
    return activeWorkout?.budget_id ||
      activeNutrition?.budget_id ||
      activeSteps?.budget_id ||
      activeSupplements?.budget_id || null;
  }, [activeWorkout, activeNutrition, activeSteps, activeSupplements]);

  // Effective budget ID (assignment wins, else fallback from plans)
  const effectiveBudgetId = activeAssignment?.budget_id || fallbackBudgetId;

  // Fetch fallback budget details if needed (for name when no assignment)
  const { data: fallbackBudget } = useBudget(fallbackBudgetId);

  // Fetch full budget for overview (all form fields: description, eating order/rules, steps instructions, template names)
  const { data: overviewBudget } = useBudget(effectiveBudgetId);

  // Effective budget name
  const effectiveBudgetName = activeAssignment?.budget_name || fallbackBudget?.name || 'תכנית פעולה פעילה';

  // Handlers
  const handleDeleteClick = (assignment: BudgetAssignmentItem) => {
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
  };

  const handleEditBudgetById = async (budgetId: string) => {
    setEditingBudgetId(budgetId);
  };

  const handleEditBudgetFromLead = async (assignment: BudgetAssignmentItem) => {
    try {
      const { data: otherAssignments, error: checkError } = await supabase
        .from('budget_assignments')
        .select('id')
        .eq('budget_id', assignment.budget_id)
        .neq('id', assignment.id);

      if (checkError) throw checkError;

      let budgetIdToEdit = assignment.budget_id;

      if (otherAssignments && otherAssignments.length > 0) {
        const { data: originalBudget, error: fetchError } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', assignment.budget_id)
          .single();

        if (fetchError) throw fetchError;

        const newBudget = await createBudget.mutateAsync({
          name: `${originalBudget.name}`,
          description: originalBudget.description || null,
          nutrition_template_id: originalBudget.nutrition_template_id,
          nutrition_targets: originalBudget.nutrition_targets,
          steps_goal: originalBudget.steps_goal,
          steps_instructions: originalBudget.steps_instructions || null,
          workout_template_id: originalBudget.workout_template_id,
          supplement_template_id: originalBudget.supplement_template_id,
          supplements: originalBudget.supplements || [],
          eating_order: originalBudget.eating_order || null,
          eating_rules: originalBudget.eating_rules || null,
          is_public: false,
        });

        const { error: updateError } = await supabase
          .from('budget_assignments')
          .update({ budget_id: newBudget.id })
          .eq('id', assignment.id);

        if (updateError) throw updateError;
        budgetIdToEdit = newBudget.id;
        toast({ title: 'הצלחה', description: 'נוצר עותק פרטי של תכנית הפעולה. שינויים יעשו רק על הליד הזה.' });
      }

      setCurrentAssignment(assignment);
      setEditingBudgetId(budgetIdToEdit);
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל בעריכת תכנית הפעולה', variant: 'destructive' });
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
        supplement_template_id: data.supplement_template_id ?? null,
        supplements: data.supplements || [],
        eating_order: data.eating_order ?? null,
        eating_rules: data.eating_rules ?? null,
        cardio_training: data.cardio_training ?? null,
        interval_training: data.interval_training ?? null,
      });

      // Get active assignments for this budget to sync plans for all assigned customers
      const { data: assignments } = await supabase
        .from('budget_assignments')
        .select('customer_id, lead_id')
        .eq('budget_id', editingBudget.id)
        .eq('is_active', true);

      if (assignments && assignments.length > 0) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // Sync all plans (workout, nutrition, steps, supplements) for each assignment
          for (const assignment of assignments) {
            try {
              await syncPlansFromBudget({
                budget: { ...data, id: editingBudget.id },
                customerId: assignment.customer_id,
                leadId: assignment.lead_id,
                userId: authUser.id,
              });
            } catch {
              // Sync failed; plans may still be updated elsewhere
            }
          }
        }
      }

      toast({ title: 'הצלחה', description: 'תכנית הפעולה עודכנה בהצלחה' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['budget', editingBudget.id] }),
        queryClient.invalidateQueries({ queryKey: ['budget', updateResult.id] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplementPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplement-plans'] }),
      ]);
      setEditingBudgetId(null);
      setCurrentAssignment(null);
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון תכנית הפעולה', variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    try {
      await deleteBudgetAssignment.mutateAsync(assignmentToDelete.id);
      toast({ title: 'הצלחה', description: 'תכנית הפעולה והתכניות המקושרות נמחקו בהצלחה' });
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל במחיקת תכנית הפעולה', variant: 'destructive' });
    }
  };

  const handleEditWorkout = async (plan: WorkoutHistoryItem) => {
    if (plan.id) {
      try {
        const { data, error } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('id', plan.id)
          .single();
        if (error) throw error;
        setEditingWorkoutPlan(data);
        setIsWorkoutPlanDialogOpen(true);
      } catch (error: any) {
        toast({ title: 'שגיאה', description: error?.message || 'נכשל בטעינת תוכנית האימונים', variant: 'destructive' });
      }
    }
  };

  const handleEditNutrition = async (plan: NutritionHistoryItem) => {
    if (plan.id) {
      try {
        const { data, error } = await supabase
          .from('nutrition_plans')
          .select('*')
          .eq('id', plan.id)
          .single();
        if (error) throw error;

        // Ensure targets are properly formatted (handle JSONB from database)
        const formattedData = data ? {
          ...data,
          targets: data.targets || plan.targets || {},
        } : null;

        setEditingNutritionPlan(formattedData);
        setIsNutritionPlanDialogOpen(true);
      } catch (error: any) {
        toast({ title: 'שגיאה', description: error?.message || 'נכשל בטעינת תוכנית התזונה', variant: 'destructive' });
      }
    } else {
      // If no ID, use the plan data directly (it already has targets from nutritionHistory)
      setEditingNutritionPlan(plan);
      setIsNutritionPlanDialogOpen(true);
    }
  };

  const handleEditSteps = async (step: any) => {
    // No longer needed - using inline editing instead
  };

  if (!activeAssignment && !effectiveBudgetId && !workoutHistory?.length && !nutritionHistory?.length && !supplementsHistory?.length && !stepsHistory?.length) {
    return (
      <Card className="p-6 border border-slate-100 rounded-lg shadow-sm bg-white mt-3 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#E8EDF7] flex items-center justify-center">
          <Wallet className="h-6 w-6 text-[#5B6FB9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">אין תכניות פעילות</h3>
        <p className="text-gray-500 text-sm mb-4">הקצה תכנית פעולה כדי ליצור תכניות אימון, תזונה וצעדים</p>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={onAssignBudget}
            className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
          >
            <Plus className="h-4 w-4" />
            הקצה תכנית פעולה
          </Button>
          <Button
            onClick={handleCreateBlankPlans}
            variant="outline"
            className="gap-2 border-slate-300 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            צור תכנית ריקה
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-100 rounded-lg shadow-sm bg-white mt-3 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8EDF7] flex items-center justify-center">
            <Wallet className="h-5 w-5 text-[#5B6FB9]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {effectiveBudgetName !== 'תכנית פעולה פעילה' ? effectiveBudgetName : 'סקירת תכניות'}
            </h3>
            <div className="text-xs text-gray-500 flex gap-2">
              {activeAssignment && (
                <span>הוקצה ב: {formatDate(activeAssignment.assigned_at)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateBlankPlans}
            className="gap-2 h-8 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>צור תכנית ריקה</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAssignBudget}
            className="gap-2 h-8 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>הקצה תכנית פעולה</span>
          </Button>
          {activeAssignment && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!activeAssignment) return;
                try {
                  // Use the same logic as useDeleteBudgetAssignment - completely delete assignment and all plans
                  const assignmentId = activeAssignment.id;
                  const assignmentBudgetId = activeAssignment.budget_id;
                  const finalCustomerId = customerId || null;
                  const finalLeadId = leadId || null;

                  // Delete the assignment completely (not just deactivate)
                  await supabase
                    .from('budget_assignments')
                    .delete()
                    .eq('id', assignmentId);

                  // Delete all associated plans (matching both budget_id and lead_id/customer_id)
                  // This matches the logic from useDeleteBudgetAssignment
                  if (finalLeadId) {
                    await Promise.all([
                      supabase
                        .from('workout_plans')
                        .delete()
                        .eq('lead_id', finalLeadId)
                        .eq('budget_id', assignmentBudgetId),
                      supabase
                        .from('nutrition_plans')
                        .delete()
                        .eq('lead_id', finalLeadId)
                        .eq('budget_id', assignmentBudgetId),
                      supabase
                        .from('supplement_plans')
                        .delete()
                        .eq('lead_id', finalLeadId)
                        .eq('budget_id', assignmentBudgetId),
                      supabase
                        .from('steps_plans')
                        .delete()
                        .eq('lead_id', finalLeadId)
                        .eq('budget_id', assignmentBudgetId),
                    ]);
                  }
                  if (finalCustomerId) {
                    await Promise.all([
                      supabase
                        .from('workout_plans')
                        .delete()
                        .eq('customer_id', finalCustomerId)
                        .eq('budget_id', assignmentBudgetId),
                      supabase
                        .from('nutrition_plans')
                        .delete()
                        .eq('customer_id', finalCustomerId)
                        .eq('budget_id', assignmentBudgetId),
                      supabase
                        .from('supplement_plans')
                        .delete()
                        .eq('customer_id', finalCustomerId)
                        .eq('budget_id', assignmentBudgetId),
                      supabase
                        .from('steps_plans')
                        .delete()
                        .eq('customer_id', finalCustomerId)
                        .eq('budget_id', assignmentBudgetId),
                    ]);
                  }

                  // Invalidate queries to refresh UI and return to empty state
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
                    queryClient.invalidateQueries({ queryKey: ['plans-history', finalCustomerId, finalLeadId] }),
                    queryClient.invalidateQueries({ queryKey: ['plans-history', finalCustomerId] }),
                    queryClient.invalidateQueries({ queryKey: ['plans-history', null, finalLeadId] }),
                    queryClient.invalidateQueries({ queryKey: ['budget-assignments'] }),
                    queryClient.invalidateQueries({ queryKey: ['budgetAssignment'] }),
                    queryClient.invalidateQueries({ queryKey: ['budgets'] }),
                    queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
                    queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
                  ]);

                  // Force refetch to ensure UI updates immediately
                  await queryClient.refetchQueries({ queryKey: ['plans-history', finalCustomerId, finalLeadId] });
                  await queryClient.refetchQueries({ queryKey: ['budgetAssignment'] });

                  toast({
                    title: 'הצלחה',
                    description: 'תכנית הפעולה והתכניות המקושרות נמחקו בהצלחה',
                  });
                } catch (error: any) {
                  toast({
                    title: 'שגיאה',
                    description: error?.message || 'נכשל בניקוי תכנית הפעולה',
                    variant: 'destructive',
                  });
                }
              }}
              className="gap-2 h-8 bg-white hover:bg-orange-50 text-orange-600 border-orange-200 hover:text-orange-700"
            >
              <X className="h-3.5 w-3.5" />
              <span>נקה תכנית</span>
            </Button>
          )}
          {effectiveBudgetId && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => activeAssignment ? handleEditBudgetFromLead(activeAssignment) : handleEditBudgetById(effectiveBudgetId)}
                className="gap-2 h-8 ml-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>ערוך תכנית פעולה</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  if (!effectiveBudgetId) return;
                  try {
                    const { data: budget } = await supabase
                      .from('budgets')
                      .select('*')
                      .eq('id', effectiveBudgetId)
                      .single();

                    if (!budget) return;

                    // Get nutrition and workout templates if they exist
                    let nutritionTemplate = null;
                    if (budget.nutrition_template_id) {
                      const { data } = await supabase.from('nutrition_templates').select('*').eq('id', budget.nutrition_template_id).single();
                      nutritionTemplate = data;
                    }

                    let workoutTemplate = null;
                    let workoutTemplateId = budget.workout_template_id;

                    // If budget doesn't have workout_template_id, try to get it from connected workout plan
                    if (!workoutTemplateId) {
                      const { data: workoutPlan } = await supabase
                        .from('workout_plans')
                        .select('template_id')
                        .eq('budget_id', budget.id)
                        .eq('is_active', true)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                      if (workoutPlan?.template_id) {
                        workoutTemplateId = workoutPlan.template_id;
                      }
                    }

                    if (workoutTemplateId) {
                      const { data } = await supabase.from('workout_templates').select('*').eq('id', workoutTemplateId).single();
                      workoutTemplate = data;
                    }

                    const snapshot = createBudgetSnapshot(budget, nutritionTemplate, workoutTemplate);

                    await saveActionPlan.mutateAsync({
                      budget_id: budget.id,
                      lead_id: leadId,
                      name: budget.name,
                      description: budget.description || null,
                      snapshot,
                    });

                    toast({
                      title: 'הצלחה',
                      description: 'תכנית הפעולה נשמרה בהצלחה',
                    });
                  } catch (error: any) {
                    toast({
                      title: 'שגיאה',
                      description: error?.message || 'נכשל בשמירת תכנית הפעולה',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={saveActionPlan.isPending}
                className="gap-2 h-8 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
              >
                {saveActionPlan.isPending ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>שומר...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>שמור תכנית פעולה</span>
                  </>
                )}
              </Button>

            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Budget overview: all form fields (description, eating order/rules) */}
          {overviewBudget && (overviewBudget.description?.trim() || overviewBudget.eating_order?.trim() || overviewBudget.eating_rules?.trim() || editingField) && (
            <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60">
                <div className="w-8 h-8 rounded-lg bg-[#E8EDF7] flex items-center justify-center">
                  <FileText className="h-4 w-4 text-[#5B6FB9]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">פרטי תכנית פעולה</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(overviewBudget.description?.trim() || editingField === 'description') && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <FileText className="h-3 w-3" />
                      תיאור
                    </div>
                    {editingField === 'description' ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editValues.description || ''}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          className="text-sm min-h-[80px]"
                          dir="rtl"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!effectiveBudgetId || !overviewBudget) return;
                              try {
                                await updateBudget.mutateAsync({
                                  budgetId: effectiveBudgetId,
                                  name: overviewBudget.name,
                                  description: editValues.description || null,
                                  nutrition_template_id: overviewBudget.nutrition_template_id,
                                  nutrition_targets: overviewBudget.nutrition_targets,
                                  steps_goal: overviewBudget.steps_goal,
                                  steps_instructions: overviewBudget.steps_instructions || null,
                                  workout_template_id: overviewBudget.workout_template_id,
                                  supplement_template_id: overviewBudget.supplement_template_id,
                                  supplements: overviewBudget.supplements || [],
                                  eating_order: overviewBudget.eating_order || null,
                                  eating_rules: overviewBudget.eating_rules || null,
                                  cardio_training: overviewBudget.cardio_training || null,
                                  interval_training: overviewBudget.interval_training || null,
                                });

                                // Get updated budget and templates for snapshot
                                const { data: updatedBudget } = await supabase
                                  .from('budgets')
                                  .select('*')
                                  .eq('id', effectiveBudgetId)
                                  .single();

                                let nutritionTemplate = null;
                                if (updatedBudget?.nutrition_template_id) {
                                  const { data } = await supabase.from('nutrition_templates').select('*').eq('id', updatedBudget.nutrition_template_id).single();
                                  nutritionTemplate = data;
                                }

                                let workoutTemplate = null;
                                if (updatedBudget?.workout_template_id) {
                                  const { data } = await supabase.from('workout_templates').select('*').eq('id', updatedBudget.workout_template_id).single();
                                  workoutTemplate = data;
                                }

                                if (updatedBudget && effectiveBudgetId) {
                                  const snapshot = createBudgetSnapshot(updatedBudget, nutritionTemplate, workoutTemplate);
                                  await saveActionPlan.mutateAsync({
                                    budget_id: effectiveBudgetId,
                                    lead_id: leadId,
                                    name: updatedBudget.name,
                                    description: updatedBudget.description || null,
                                    snapshot,
                                  });
                                }

                                toast({ title: 'הצלחה', description: 'התיאור עודכן ונשמר ביומן' });
                                setEditingField(null);
                                await queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] });
                                await queryClient.invalidateQueries({ queryKey: ['budgets'] });
                              } catch (error: any) {
                                toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון התיאור', variant: 'destructive' });
                              }
                            }}
                            className="h-7 px-2"
                          >
                            <Check className="h-3 w-3 ml-1" />
                            שמור
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingField(null);
                              setEditValues({ ...editValues, description: undefined });
                            }}
                            className="h-7 px-2"
                          >
                            <X className="h-3 w-3 ml-1" />
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-sm text-slate-800 leading-relaxed cursor-pointer hover:text-blue-600 hover:bg-blue-50/30 rounded p-2 transition-colors"
                        onClick={() => {
                          setEditingField('description');
                          setEditValues({ ...editValues, description: overviewBudget.description || '' });
                        }}
                        title="לחץ לעריכה"
                      >
                        {overviewBudget.description}
                      </p>
                    )}
                  </div>
                )}
                {(overviewBudget.eating_order?.trim() || editingField === 'eating_order') && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <ListOrdered className="h-3 w-3" />
                      סדר האכילה
                    </div>
                    {editingField === 'eating_order' ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editValues.eating_order || ''}
                          onChange={(e) => setEditValues({ ...editValues, eating_order: e.target.value })}
                          className="text-sm min-h-[80px]"
                          dir="rtl"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!effectiveBudgetId || !overviewBudget) return;
                              try {
                                await updateBudget.mutateAsync({
                                  budgetId: effectiveBudgetId,
                                  name: overviewBudget.name,
                                  description: overviewBudget.description || null,
                                  nutrition_template_id: overviewBudget.nutrition_template_id,
                                  nutrition_targets: overviewBudget.nutrition_targets,
                                  steps_goal: overviewBudget.steps_goal,
                                  steps_instructions: overviewBudget.steps_instructions || null,
                                  workout_template_id: overviewBudget.workout_template_id,
                                  supplement_template_id: overviewBudget.supplement_template_id,
                                  supplements: overviewBudget.supplements || [],
                                  eating_order: editValues.eating_order || null,
                                  eating_rules: overviewBudget.eating_rules || null,
                                  cardio_training: overviewBudget.cardio_training || null,
                                  interval_training: overviewBudget.interval_training || null,
                                });

                                // Get updated budget and templates for snapshot
                                const { data: updatedBudget } = await supabase
                                  .from('budgets')
                                  .select('*')
                                  .eq('id', effectiveBudgetId)
                                  .single();

                                let nutritionTemplate = null;
                                if (updatedBudget?.nutrition_template_id) {
                                  const { data } = await supabase.from('nutrition_templates').select('*').eq('id', updatedBudget.nutrition_template_id).single();
                                  nutritionTemplate = data;
                                }

                                let workoutTemplate = null;
                                if (updatedBudget?.workout_template_id) {
                                  const { data } = await supabase.from('workout_templates').select('*').eq('id', updatedBudget.workout_template_id).single();
                                  workoutTemplate = data;
                                }

                                if (updatedBudget && effectiveBudgetId) {
                                  const snapshot = createBudgetSnapshot(updatedBudget, nutritionTemplate, workoutTemplate);
                                  await saveActionPlan.mutateAsync({
                                    budget_id: effectiveBudgetId,
                                    lead_id: leadId,
                                    name: updatedBudget.name,
                                    description: updatedBudget.description || null,
                                    snapshot,
                                  });
                                }

                                toast({ title: 'הצלחה', description: 'סדר האכילה עודכן ונשמר ביומן' });
                                setEditingField(null);
                                await queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] });
                                await queryClient.invalidateQueries({ queryKey: ['budgets'] });
                              } catch (error: any) {
                                toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון סדר האכילה', variant: 'destructive' });
                              }
                            }}
                            className="h-7 px-2"
                          >
                            <Check className="h-3 w-3 ml-1" />
                            שמור
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingField(null);
                              setEditValues({ ...editValues, eating_order: undefined });
                            }}
                            className="h-7 px-2"
                          >
                            <X className="h-3 w-3 ml-1" />
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-blue-600 hover:bg-blue-50/30 rounded p-2 transition-colors"
                        onClick={() => {
                          setEditingField('eating_order');
                          setEditValues({ ...editValues, eating_order: overviewBudget.eating_order || '' });
                        }}
                        title="לחץ לעריכה"
                      >
                        {overviewBudget.eating_order}
                      </p>
                    )}
                  </div>
                )}
                {(overviewBudget.eating_rules?.trim() || editingField === 'eating_rules') && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <ScrollText className="h-3 w-3" />
                      כללי אכילה
                    </div>
                    {editingField === 'eating_rules' ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editValues.eating_rules || ''}
                          onChange={(e) => setEditValues({ ...editValues, eating_rules: e.target.value })}
                          className="text-sm min-h-[80px]"
                          dir="rtl"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!effectiveBudgetId || !overviewBudget) return;
                              try {
                                await updateBudget.mutateAsync({
                                  budgetId: effectiveBudgetId,
                                  name: overviewBudget.name,
                                  description: overviewBudget.description || null,
                                  nutrition_template_id: overviewBudget.nutrition_template_id,
                                  nutrition_targets: overviewBudget.nutrition_targets,
                                  steps_goal: overviewBudget.steps_goal,
                                  steps_instructions: overviewBudget.steps_instructions || null,
                                  workout_template_id: overviewBudget.workout_template_id,
                                  supplement_template_id: overviewBudget.supplement_template_id,
                                  supplements: overviewBudget.supplements || [],
                                  eating_order: overviewBudget.eating_order || null,
                                  eating_rules: editValues.eating_rules || null,
                                  cardio_training: overviewBudget.cardio_training || null,
                                  interval_training: overviewBudget.interval_training || null,
                                });

                                // Get updated budget and templates for snapshot
                                const { data: updatedBudget } = await supabase
                                  .from('budgets')
                                  .select('*')
                                  .eq('id', effectiveBudgetId)
                                  .single();

                                let nutritionTemplate = null;
                                if (updatedBudget?.nutrition_template_id) {
                                  const { data } = await supabase.from('nutrition_templates').select('*').eq('id', updatedBudget.nutrition_template_id).single();
                                  nutritionTemplate = data;
                                }

                                let workoutTemplate = null;
                                if (updatedBudget?.workout_template_id) {
                                  const { data } = await supabase.from('workout_templates').select('*').eq('id', updatedBudget.workout_template_id).single();
                                  workoutTemplate = data;
                                }

                                if (updatedBudget && effectiveBudgetId) {
                                  const snapshot = createBudgetSnapshot(updatedBudget, nutritionTemplate, workoutTemplate);
                                  await saveActionPlan.mutateAsync({
                                    budget_id: effectiveBudgetId,
                                    lead_id: leadId,
                                    name: updatedBudget.name,
                                    description: updatedBudget.description || null,
                                    snapshot,
                                  });
                                }

                                toast({ title: 'הצלחה', description: 'כללי האכילה עודכנו ונשמרו ביומן' });
                                setEditingField(null);
                                await queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] });
                                await queryClient.invalidateQueries({ queryKey: ['budgets'] });
                              } catch (error: any) {
                                toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון כללי האכילה', variant: 'destructive' });
                              }
                            }}
                            className="h-7 px-2"
                          >
                            <Check className="h-3 w-3 ml-1" />
                            שמור
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingField(null);
                              setEditValues({ ...editValues, eating_rules: undefined });
                            }}
                            className="h-7 px-2"
                          >
                            <X className="h-3 w-3 ml-1" />
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-blue-600 hover:bg-blue-50/30 rounded p-2 transition-colors"
                        onClick={() => {
                          setEditingField('eating_rules');
                          setEditValues({ ...editValues, eating_rules: overviewBudget.eating_rules || '' });
                        }}
                        title="לחץ לעריכה"
                      >
                        {overviewBudget.eating_rules}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nutrition Plan Card */}
            <div
              className={`border rounded-xl p-5 relative hover:shadow-md transition-all cursor-pointer ${activeNutrition ? 'bg-orange-50/30 border-orange-100' : 'bg-gray-50 border-gray-100 border-dashed'}`}
              onClick={() => activeNutrition ? handleEditNutrition(activeNutrition) : onAddDietPlan()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <span className={`text-base font-semibold block ${activeNutrition ? 'text-gray-900' : 'text-gray-500'}`}>תזונה</span>
                  {(overviewBudget as BudgetWithTemplates | null)?.nutrition_template?.name && (
                    <span className="text-xs text-slate-500 truncate block">תבנית: {(overviewBudget as BudgetWithTemplates).nutrition_template?.name}</span>
                  )}
                </div>
              </div>
              {activeNutrition ? (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-gray-600 font-medium truncate">{activeNutrition.description || 'ללא תיאור'}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col bg-white rounded-lg p-2.5 border border-orange-100 items-center" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        label="קלוריות"
                        value={activeNutrition.targets?.calories || 0}
                        type="number"
                        onSave={async (newValue) => {
                          const value = typeof newValue === 'number' ? newValue : parseInt(String(newValue)) || 0;
                          if (!effectiveBudgetId || !overviewBudget) return;
                          try {
                            const updatedTargets = {
                              calories: value,
                              protein: overviewBudget.nutrition_targets?.protein || 0,
                              carbs: overviewBudget.nutrition_targets?.carbs || 0,
                              fat: overviewBudget.nutrition_targets?.fat || 0,
                              fiber_min: overviewBudget.nutrition_targets?.fiber_min || 0,
                            };

                            await updateBudget.mutateAsync({
                              budgetId: effectiveBudgetId,
                              name: overviewBudget.name,
                              description: overviewBudget.description || null,
                              nutrition_template_id: overviewBudget.nutrition_template_id,
                              nutrition_targets: updatedTargets,
                              steps_goal: overviewBudget.steps_goal,
                              steps_instructions: overviewBudget.steps_instructions || null,
                              workout_template_id: overviewBudget.workout_template_id,
                              supplement_template_id: overviewBudget.supplement_template_id,
                              supplements: overviewBudget.supplements || [],
                              eating_order: overviewBudget.eating_order || null,
                              eating_rules: overviewBudget.eating_rules || null,
                              cardio_training: overviewBudget.cardio_training || null,
                              interval_training: overviewBudget.interval_training || null,
                            });

                            // Sync nutrition plans with updated targets
                            if (activeAssignment) {
                              const { data: { user: authUser } } = await supabase.auth.getUser();
                              if (authUser) {
                                await syncPlansFromBudget({
                                  budget: { ...overviewBudget, nutrition_targets: updatedTargets },
                                  customerId: customerId || null,
                                  leadId: leadId || null,
                                  userId: authUser.id,
                                });
                              }
                            }

                            // Invalidate all budget-related queries to ensure UI updates everywhere
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] }),
                              queryClient.invalidateQueries({ queryKey: ['budgets'] }),
                              queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
                            ]);
                            // Force refetch to ensure immediate update
                            await queryClient.refetchQueries({ queryKey: ['budget', effectiveBudgetId] });
                          } catch (error: any) {
                            toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון הקלוריות', variant: 'destructive' });
                          }
                        }}
                        className="w-full"
                        valueClassName="text-base font-bold text-gray-700 text-center"
                      />
                    </div>
                    <div className="flex flex-col bg-white rounded-lg p-2.5 border border-orange-100 items-center" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        label="חלבון"
                        value={activeNutrition.targets?.protein || 0}
                        type="number"
                        onSave={async (newValue) => {
                          const value = typeof newValue === 'number' ? newValue : parseInt(String(newValue)) || 0;
                          if (!effectiveBudgetId || !overviewBudget) return;
                          try {
                            const updatedTargets = {
                              calories: overviewBudget.nutrition_targets?.calories || 0,
                              protein: value,
                              carbs: overviewBudget.nutrition_targets?.carbs || 0,
                              fat: overviewBudget.nutrition_targets?.fat || 0,
                              fiber_min: overviewBudget.nutrition_targets?.fiber_min || 0,
                            };

                            await updateBudget.mutateAsync({
                              budgetId: effectiveBudgetId,
                              name: overviewBudget.name,
                              description: overviewBudget.description || null,
                              nutrition_template_id: overviewBudget.nutrition_template_id,
                              nutrition_targets: updatedTargets,
                              steps_goal: overviewBudget.steps_goal,
                              steps_instructions: overviewBudget.steps_instructions || null,
                              workout_template_id: overviewBudget.workout_template_id,
                              supplement_template_id: overviewBudget.supplement_template_id,
                              supplements: overviewBudget.supplements || [],
                              eating_order: overviewBudget.eating_order || null,
                              eating_rules: overviewBudget.eating_rules || null,
                              cardio_training: overviewBudget.cardio_training || null,
                              interval_training: overviewBudget.interval_training || null,
                            });

                            // Sync nutrition plans with updated targets
                            if (activeAssignment) {
                              const { data: { user: authUser } } = await supabase.auth.getUser();
                              if (authUser) {
                                await syncPlansFromBudget({
                                  budget: { ...overviewBudget, nutrition_targets: updatedTargets },
                                  customerId: customerId || null,
                                  leadId: leadId || null,
                                  userId: authUser.id,
                                });
                              }
                            }

                            // Invalidate all budget-related queries to ensure UI updates everywhere
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] }),
                              queryClient.invalidateQueries({ queryKey: ['budgets'] }),
                              queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
                            ]);
                            // Force refetch to ensure immediate update
                            await queryClient.refetchQueries({ queryKey: ['budget', effectiveBudgetId] });
                          } catch (error: any) {
                            toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון החלבון', variant: 'destructive' });
                          }
                        }}
                        className="w-full"
                        valueClassName="text-base font-bold text-gray-700 text-center"
                      />
                    </div>
                    <div className="flex flex-col bg-white rounded-lg p-2.5 border border-orange-100 items-center" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        label="פחמימה"
                        value={activeNutrition.targets?.carbs || 0}
                        type="number"
                        onSave={async (newValue) => {
                          const value = typeof newValue === 'number' ? newValue : parseInt(String(newValue)) || 0;
                          if (!effectiveBudgetId || !overviewBudget) return;
                          try {
                            const updatedTargets = {
                              calories: overviewBudget.nutrition_targets?.calories || 0,
                              protein: overviewBudget.nutrition_targets?.protein || 0,
                              carbs: value,
                              fat: overviewBudget.nutrition_targets?.fat || 0,
                              fiber_min: overviewBudget.nutrition_targets?.fiber_min || 0,
                            };

                            await updateBudget.mutateAsync({
                              budgetId: effectiveBudgetId,
                              name: overviewBudget.name,
                              description: overviewBudget.description || null,
                              nutrition_template_id: overviewBudget.nutrition_template_id,
                              nutrition_targets: updatedTargets,
                              steps_goal: overviewBudget.steps_goal,
                              steps_instructions: overviewBudget.steps_instructions || null,
                              workout_template_id: overviewBudget.workout_template_id,
                              supplement_template_id: overviewBudget.supplement_template_id,
                              supplements: overviewBudget.supplements || [],
                              eating_order: overviewBudget.eating_order || null,
                              eating_rules: overviewBudget.eating_rules || null,
                              cardio_training: overviewBudget.cardio_training || null,
                              interval_training: overviewBudget.interval_training || null,
                            });

                            // Sync nutrition plans with updated targets
                            if (activeAssignment) {
                              const { data: { user: authUser } } = await supabase.auth.getUser();
                              if (authUser) {
                                await syncPlansFromBudget({
                                  budget: { ...overviewBudget, nutrition_targets: updatedTargets },
                                  customerId: customerId || null,
                                  leadId: leadId || null,
                                  userId: authUser.id,
                                });
                              }
                            }

                            // Invalidate all budget-related queries to ensure UI updates everywhere
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] }),
                              queryClient.invalidateQueries({ queryKey: ['budgets'] }),
                              queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
                            ]);
                            // Force refetch to ensure immediate update
                            await queryClient.refetchQueries({ queryKey: ['budget', effectiveBudgetId] });
                          } catch (error: any) {
                            toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון הפחמימות', variant: 'destructive' });
                          }
                        }}
                        className="w-full"
                        valueClassName="text-base font-bold text-gray-700 text-center"
                      />
                    </div>
                    <div className="flex flex-col bg-white rounded-lg p-2.5 border border-orange-100 items-center" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        label="שומן"
                        value={activeNutrition.targets?.fat || 0}
                        type="number"
                        onSave={async (newValue) => {
                          const value = typeof newValue === 'number' ? newValue : parseInt(String(newValue)) || 0;
                          if (!effectiveBudgetId || !overviewBudget) return;
                          try {
                            const updatedTargets = {
                              calories: overviewBudget.nutrition_targets?.calories || 0,
                              protein: overviewBudget.nutrition_targets?.protein || 0,
                              carbs: overviewBudget.nutrition_targets?.carbs || 0,
                              fat: value,
                              fiber_min: overviewBudget.nutrition_targets?.fiber_min || 0,
                            };

                            await updateBudget.mutateAsync({
                              budgetId: effectiveBudgetId,
                              name: overviewBudget.name,
                              description: overviewBudget.description || null,
                              nutrition_template_id: overviewBudget.nutrition_template_id,
                              nutrition_targets: updatedTargets,
                              steps_goal: overviewBudget.steps_goal,
                              steps_instructions: overviewBudget.steps_instructions || null,
                              workout_template_id: overviewBudget.workout_template_id,
                              supplement_template_id: overviewBudget.supplement_template_id,
                              supplements: overviewBudget.supplements || [],
                              eating_order: overviewBudget.eating_order || null,
                              eating_rules: overviewBudget.eating_rules || null,
                              cardio_training: overviewBudget.cardio_training || null,
                              interval_training: overviewBudget.interval_training || null,
                            });

                            // Sync nutrition plans with updated targets
                            if (activeAssignment) {
                              const { data: { user: authUser } } = await supabase.auth.getUser();
                              if (authUser) {
                                await syncPlansFromBudget({
                                  budget: { ...overviewBudget, nutrition_targets: updatedTargets },
                                  customerId: customerId || null,
                                  leadId: leadId || null,
                                  userId: authUser.id,
                                });
                              }
                            }

                            // Invalidate all budget-related queries to ensure UI updates everywhere
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] }),
                              queryClient.invalidateQueries({ queryKey: ['budgets'] }),
                              queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
                            ]);
                            // Force refetch to ensure immediate update
                            await queryClient.refetchQueries({ queryKey: ['budget', effectiveBudgetId] });
                          } catch (error: any) {
                            toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון השומן', variant: 'destructive' });
                          }
                        }}
                        className="w-full"
                        valueClassName="text-base font-bold text-gray-700 text-center"
                      />
                    </div>
                    <div className="flex flex-col bg-white rounded-lg p-2.5 border border-orange-100 items-center col-start-2" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableField
                        label="סיבים"
                        value={activeNutrition.targets?.fiber || 0}
                        type="number"
                        onSave={async (newValue) => {
                          const value = typeof newValue === 'number' ? newValue : parseInt(String(newValue)) || 0;
                          if (!effectiveBudgetId || !overviewBudget) return;
                          try {
                            const updatedTargets = {
                              calories: overviewBudget.nutrition_targets?.calories || 0,
                              protein: overviewBudget.nutrition_targets?.protein || 0,
                              carbs: overviewBudget.nutrition_targets?.carbs || 0,
                              fat: overviewBudget.nutrition_targets?.fat || 0,
                              fiber_min: value,
                            };

                            await updateBudget.mutateAsync({
                              budgetId: effectiveBudgetId,
                              name: overviewBudget.name,
                              description: overviewBudget.description || null,
                              nutrition_template_id: overviewBudget.nutrition_template_id,
                              nutrition_targets: updatedTargets,
                              steps_goal: overviewBudget.steps_goal,
                              steps_instructions: overviewBudget.steps_instructions || null,
                              workout_template_id: overviewBudget.workout_template_id,
                              supplement_template_id: overviewBudget.supplement_template_id,
                              supplements: overviewBudget.supplements || [],
                              eating_order: overviewBudget.eating_order || null,
                              eating_rules: overviewBudget.eating_rules || null,
                              cardio_training: overviewBudget.cardio_training || null,
                              interval_training: overviewBudget.interval_training || null,
                            });

                            // Sync nutrition plans with updated targets
                            if (activeAssignment) {
                              const { data: { user: authUser } } = await supabase.auth.getUser();
                              if (authUser) {
                                await syncPlansFromBudget({
                                  budget: { ...overviewBudget, nutrition_targets: updatedTargets },
                                  customerId: customerId || null,
                                  leadId: leadId || null,
                                  userId: authUser.id,
                                });
                              }
                            }

                            // Invalidate all budget-related queries to ensure UI updates everywhere
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] }),
                              queryClient.invalidateQueries({ queryKey: ['budgets'] }),
                              queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
                            ]);
                            // Force refetch to ensure immediate update
                            await queryClient.refetchQueries({ queryKey: ['budget', effectiveBudgetId] });
                          } catch (error: any) {
                            toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון הסיבים', variant: 'destructive' });
                          }
                        }}
                        className="w-full"
                        valueClassName="text-base font-bold text-gray-700 text-center"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-sm text-gray-400">לחץ להוספה</div>
              )}
            </div>

            {/* Workout Plan Card */}
            <div
              className={`border rounded-xl p-3 relative hover:shadow-md transition-all cursor-pointer ${activeWorkout ? 'bg-blue-50/30 border-blue-100' : 'bg-gray-50 border-gray-100 border-dashed'}`}
              onClick={() => activeWorkout ? handleEditWorkout(activeWorkout) : onAddWorkoutPlan()}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${activeWorkout ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold block ${activeWorkout ? 'text-gray-900' : 'text-gray-500'}`}>אימונים</span>
                  {(overviewBudget as BudgetWithTemplates | null)?.workout_template?.name && (
                    <span className="text-[10px] text-slate-500 truncate block">תבנית: {(overviewBudget as BudgetWithTemplates).workout_template?.name}</span>
                  )}
                </div>
              </div>
              {activeWorkout ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium truncate">{activeWorkout.description || activeWorkout.name || 'ללא תיאור'}</p>

                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <Accordion type="single" collapsible className="w-full">
                      {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((dayKey) => {
                        const dayLabels: Record<string, string> = {
                          sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת'
                        };
                        const dayData = activeWorkout.weeklyWorkout?.days?.[dayKey];
                        const isActive = dayData?.isActive && dayData?.exercises?.length > 0;

                        return (
                          <AccordionItem value={dayKey} key={dayKey} className="border-b-0 mb-1 last:mb-0">
                            <AccordionTrigger className={`py-2 px-2 hover:no-underline hover:bg-blue-50 rounded-md ${isActive ? 'bg-blue-50/50' : ''}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400' : 'bg-gray-200'}`} />
                                <span className="text-sm text-gray-900">
                                  {dayLabels[dayKey]}
                                </span>
                                {isActive && (
                                  <span className="text-xs text-gray-400 mr-2">
                                    ({dayData.exercises.length} תרגילים)
                                  </span>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2 pb-2 pt-1">
                              {isActive ? (
                                <div className="space-y-2 mt-1">
                                  {dayData.exercises.map((ex: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs bg-white p-1.5 rounded border border-blue-100">
                                      {ex.image_url && (
                                        <img src={ex.image_url} alt="" className="w-8 h-8 object-cover rounded bg-gray-100" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-700 truncate">{ex.name}</p>
                                        <p className="text-gray-500">{ex.sets} סטים x {ex.reps} חזרות</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 py-1 pr-4">יום מנוחה</p>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-xs text-gray-400">לחץ להוספה</div>
              )}
            </div>

            {/* Steps Plan Card */}
            <div
              className={`border rounded-xl p-3 relative hover:shadow-md transition-all ${activeSteps || overviewBudget?.steps_goal ? 'bg-cyan-50/30 border-cyan-100' : 'bg-gray-50 border-gray-100 border-dashed'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${activeSteps || overviewBudget?.steps_goal ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Footprints className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${activeSteps || overviewBudget?.steps_goal ? 'text-gray-900' : 'text-gray-500'}`}>צעדים</span>
              </div>
              {activeSteps || overviewBudget?.steps_goal ? (
                <div className="space-y-2 py-2">
                  <div className="text-center">
                    {editingField === 'steps_goal' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          {previousValues.steps_goal !== undefined && previousValues.steps_goal !== editValues.steps_goal && (
                            <>
                              <span className="text-xl text-slate-400 line-through opacity-70">
                                {previousValues.steps_goal.toLocaleString()}
                              </span>
                              <ArrowLeft className="h-4 w-4 text-slate-300" />
                            </>
                          )}
                          <Input
                            type="number"
                            value={editValues.steps_goal !== undefined ? editValues.steps_goal : (activeSteps?.target ?? overviewBudget?.steps_goal ?? 0)}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? undefined : parseInt(value, 10);
                              setEditValues({ ...editValues, steps_goal: numValue !== undefined && !isNaN(numValue) ? numValue : undefined });
                            }}
                            className="text-2xl font-bold text-center border-2 border-cyan-500 focus:border-cyan-600"
                            dir="ltr"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!effectiveBudgetId || !overviewBudget) {
                                toast({ title: 'שגיאה', description: 'חסר מזהה תכנית פעולה', variant: 'destructive' });
                                return;
                              }
                              try {
                                const newStepsGoal = editValues.steps_goal !== undefined
                                  ? editValues.steps_goal
                                  : (activeSteps?.target ?? overviewBudget?.steps_goal ?? 0);

                                if (newStepsGoal === undefined || isNaN(newStepsGoal) || newStepsGoal < 0) {
                                  toast({ title: 'שגיאה', description: 'אנא הזן ערך תקין ליעד הצעדים', variant: 'destructive' });
                                  return;
                                }
                                await updateBudget.mutateAsync({
                                  budgetId: effectiveBudgetId,
                                  name: overviewBudget.name,
                                  description: overviewBudget.description || null,
                                  nutrition_template_id: overviewBudget.nutrition_template_id,
                                  nutrition_targets: overviewBudget.nutrition_targets,
                                  steps_goal: newStepsGoal,
                                  steps_instructions: overviewBudget.steps_instructions || null,
                                  workout_template_id: overviewBudget.workout_template_id,
                                  supplement_template_id: overviewBudget.supplement_template_id,
                                  supplements: overviewBudget.supplements || [],
                                  eating_order: overviewBudget.eating_order || null,
                                  eating_rules: overviewBudget.eating_rules || null,
                                  cardio_training: overviewBudget.cardio_training || null,
                                  interval_training: overviewBudget.interval_training || null,
                                });

                                // Sync steps plans with the updated budget
                                await syncStepsPlansFromBudgetUpdate(
                                  effectiveBudgetId,
                                  overviewBudget.name,
                                  newStepsGoal,
                                  overviewBudget.steps_instructions || null
                                );

                                // Get updated budget and templates for snapshot
                                const { data: updatedBudget } = await supabase
                                  .from('budgets')
                                  .select('*')
                                  .eq('id', effectiveBudgetId)
                                  .single();

                                let nutritionTemplate = null;
                                if (updatedBudget?.nutrition_template_id) {
                                  const { data } = await supabase.from('nutrition_templates').select('*').eq('id', updatedBudget.nutrition_template_id).single();
                                  nutritionTemplate = data;
                                }

                                let workoutTemplate = null;
                                if (updatedBudget?.workout_template_id) {
                                  const { data } = await supabase.from('workout_templates').select('*').eq('id', updatedBudget.workout_template_id).single();
                                  workoutTemplate = data;
                                }

                                if (updatedBudget && effectiveBudgetId) {
                                  const snapshot = createBudgetSnapshot(updatedBudget, nutritionTemplate, workoutTemplate);
                                  await saveActionPlan.mutateAsync({
                                    budget_id: effectiveBudgetId,
                                    lead_id: leadId,
                                    name: updatedBudget.name,
                                    description: updatedBudget.description || null,
                                    snapshot,
                                  });
                                }

                                toast({ title: 'הצלחה', description: 'יעד הצעדים עודכן ונשמר ביומן' });
                                setEditingField(null);
                                setEditValues({ ...editValues, steps_goal: undefined });
                                setPreviousValues({ ...previousValues, steps_goal: undefined });
                                await queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] });
                                await queryClient.invalidateQueries({ queryKey: ['budgets'] });
                                await queryClient.invalidateQueries({ queryKey: ['plans-history'] });
                                await queryClient.invalidateQueries({ queryKey: ['steps-plans'] });
                                // Refetch to ensure UI updates immediately
                                await queryClient.refetchQueries({ queryKey: ['budget', effectiveBudgetId] });
                                await queryClient.refetchQueries({ queryKey: ['plans-history'] });
                              } catch (error: any) {
                                toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון יעד הצעדים', variant: 'destructive' });
                              }
                            }}
                            className="h-7 px-2"
                          >
                            <Check className="h-3 w-3 ml-1" />
                            שמור
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingField(null);
                              setEditValues({ ...editValues, steps_goal: undefined });
                              setPreviousValues({ ...previousValues, steps_goal: undefined });
                            }}
                            className="h-7 px-2"
                          >
                            <X className="h-3 w-3 ml-1" />
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-2xl font-bold text-cyan-700 leading-none cursor-pointer hover:text-cyan-800 hover:bg-cyan-50/50 rounded p-2 transition-colors"
                        onClick={() => {
                          const currentValue = activeSteps?.target ?? overviewBudget?.steps_goal ?? 0;
                          setEditingField('steps_goal');
                          setEditValues({ ...editValues, steps_goal: currentValue });
                          setPreviousValues({ ...previousValues, steps_goal: currentValue });
                        }}
                        title="לחץ לעריכה"
                      >
                        {(activeSteps?.target ?? overviewBudget?.steps_goal ?? 0).toLocaleString()}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">צעדים ליום</p>
                  </div>
                  {(overviewBudget?.steps_instructions?.trim() || editingField === 'steps_instructions') && (
                    <div className="mt-2 pt-2 border-t border-cyan-100/60">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">הוראות צעדים</p>
                      </div>
                      {editingField === 'steps_instructions' ? (
                        <div className="space-y-2">
                          {previousValues.steps_instructions !== undefined && previousValues.steps_instructions !== (editValues.steps_instructions ?? '') && previousValues.steps_instructions.trim() && (
                            <div className="flex items-center gap-2 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              <span className="text-slate-400 line-through opacity-70 flex-1 truncate">
                                {previousValues.steps_instructions}
                              </span>
                              <ArrowLeft className="h-3 w-3 text-slate-300 shrink-0" />
                            </div>
                          )}
                          <Textarea
                            value={editValues.steps_instructions ?? (overviewBudget?.steps_instructions || '')}
                            onChange={(e) => setEditValues({ ...editValues, steps_instructions: e.target.value })}
                            className="text-sm min-h-[80px]"
                            dir="rtl"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!effectiveBudgetId || !overviewBudget) return;
                                try {
                                  await updateBudget.mutateAsync({
                                    budgetId: effectiveBudgetId,
                                    name: overviewBudget.name,
                                    description: overviewBudget.description || null,
                                    nutrition_template_id: overviewBudget.nutrition_template_id,
                                    nutrition_targets: overviewBudget.nutrition_targets,
                                    steps_goal: overviewBudget.steps_goal,
                                    steps_instructions: editValues.steps_instructions || null,
                                    workout_template_id: overviewBudget.workout_template_id,
                                    supplement_template_id: overviewBudget.supplement_template_id,
                                    supplements: overviewBudget.supplements || [],
                                    eating_order: overviewBudget.eating_order || null,
                                    eating_rules: overviewBudget.eating_rules || null,
                                    cardio_training: overviewBudget.cardio_training || null,
                                    interval_training: overviewBudget.interval_training || null,
                                  });

                                  // Sync steps plans with the updated budget
                                  if (overviewBudget.steps_goal && overviewBudget.steps_goal > 0) {
                                    await syncStepsPlansFromBudgetUpdate(
                                      effectiveBudgetId,
                                      overviewBudget.name,
                                      overviewBudget.steps_goal,
                                      editValues.steps_instructions || null
                                    );
                                  }

                                  // Get updated budget and templates for snapshot
                                  const { data: updatedBudget } = await supabase
                                    .from('budgets')
                                    .select('*')
                                    .eq('id', effectiveBudgetId)
                                    .single();

                                  let nutritionTemplate = null;
                                  if (updatedBudget?.nutrition_template_id) {
                                    const { data } = await supabase.from('nutrition_templates').select('*').eq('id', updatedBudget.nutrition_template_id).single();
                                    nutritionTemplate = data;
                                  }

                                  let workoutTemplate = null;
                                  if (updatedBudget?.workout_template_id) {
                                    const { data } = await supabase.from('workout_templates').select('*').eq('id', updatedBudget.workout_template_id).single();
                                    workoutTemplate = data;
                                  }

                                  if (updatedBudget && effectiveBudgetId) {
                                    const snapshot = createBudgetSnapshot(updatedBudget, nutritionTemplate, workoutTemplate);
                                    await saveActionPlan.mutateAsync({
                                      budget_id: effectiveBudgetId,
                                      name: updatedBudget.name,
                                      description: updatedBudget.description || null,
                                      snapshot,
                                    });
                                  }

                                  toast({ title: 'הצלחה', description: 'הוראות הצעדים עודכנו ונשמרו ביומן' });
                                  setEditingField(null);
                                  setEditValues({ ...editValues, steps_instructions: undefined });
                                  setPreviousValues({ ...previousValues, steps_instructions: undefined });
                                  await queryClient.invalidateQueries({ queryKey: ['budget', effectiveBudgetId] });
                                  await queryClient.invalidateQueries({ queryKey: ['budgets'] });
                                  await queryClient.invalidateQueries({ queryKey: ['plans-history'] });
                                  await queryClient.invalidateQueries({ queryKey: ['steps-plans'] });
                                  await queryClient.refetchQueries({ queryKey: ['plans-history'] });
                                } catch (error: any) {
                                  toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון הוראות הצעדים', variant: 'destructive' });
                                }
                              }}
                              className="h-7 px-2"
                            >
                              <Check className="h-3 w-3 ml-1" />
                              שמור
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingField(null);
                                setEditValues({ ...editValues, steps_instructions: undefined });
                                setPreviousValues({ ...previousValues, steps_instructions: undefined });
                              }}
                              className="h-7 px-2"
                            >
                              <X className="h-3 w-3 ml-1" />
                              ביטול
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-blue-600 hover:bg-blue-50/30 rounded p-2 transition-colors"
                          onClick={() => {
                            const currentValue = overviewBudget?.steps_instructions || '';
                            setEditingField('steps_instructions');
                            setEditValues({ ...editValues, steps_instructions: currentValue });
                            setPreviousValues({ ...previousValues, steps_instructions: currentValue });
                          }}
                          title="לחץ לעריכה"
                        >
                          {overviewBudget?.steps_instructions}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cardio and Interval Training Summary */}
                  {(overviewBudget?.cardio_training && Array.isArray(overviewBudget.cardio_training) && overviewBudget.cardio_training.length > 0) ||
                    (overviewBudget?.interval_training && Array.isArray(overviewBudget.interval_training) && overviewBudget.interval_training.length > 0) ? (
                    <div className="mt-2 pt-2 border-t border-cyan-100/60 space-y-1.5">
                      {overviewBudget.cardio_training && Array.isArray(overviewBudget.cardio_training) && overviewBudget.cardio_training.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">אירובי:</span>
                          <div className="mt-1 space-y-1">
                            {overviewBudget.cardio_training.map((cardio: any, idx: number) => (
                              <div key={idx} className="text-sm text-slate-700 bg-white rounded px-2 py-1.5 border border-red-100">
                                <span className="font-medium">{cardio.name || 'אירובי'}</span>
                                {cardio.duration_minutes && <span className="mr-1"> • {cardio.duration_minutes} דקות</span>}
                                {cardio.period_type && <span className="mr-1"> • {cardio.period_type}</span>}
                                {cardio.notes && <span className="mr-1 text-slate-500"> • ({cardio.notes})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {overviewBudget.interval_training && Array.isArray(overviewBudget.interval_training) && overviewBudget.interval_training.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">אינטרוולים:</span>
                          <div className="mt-1 space-y-1">
                            {overviewBudget.interval_training.map((interval: any, idx: number) => (
                              <div key={idx} className="text-sm text-slate-700 bg-white rounded px-2 py-1.5 border border-yellow-100">
                                <span className="font-medium">{interval.name || 'אינטרוול'}</span>
                                {interval.duration_minutes && <span className="mr-1"> • {interval.duration_minutes} דקות</span>}
                                {interval.period_type && <span className="mr-1"> • {interval.period_type}</span>}
                                {interval.notes && <span className="mr-1 text-slate-500"> • ({interval.notes})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-xs text-gray-400">אין יעד פעיל</div>
              )}
            </div>
          </div>

          {/* Second Row: 2 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aerobic Activity Card */}
            <div
              className={`border rounded-xl p-3 relative hover:shadow-md transition-all cursor-pointer ${overviewBudget?.cardio_training && Array.isArray(overviewBudget.cardio_training) && overviewBudget.cardio_training.length > 0 ? 'bg-red-50/30 border-red-100' : 'bg-gray-50 border-gray-100 border-dashed'}`}
              onClick={() => {
                if (effectiveBudgetId) {
                  setIsAerobicActivityModalOpen(true);
                }
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${overviewBudget?.cardio_training && Array.isArray(overviewBudget.cardio_training) && overviewBudget.cardio_training.length > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Heart className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${overviewBudget?.cardio_training && Array.isArray(overviewBudget.cardio_training) && overviewBudget.cardio_training.length > 0 ? 'text-gray-900' : 'text-gray-500'}`}>פעילות אירובית</span>
              </div>
              {overviewBudget?.cardio_training && Array.isArray(overviewBudget.cardio_training) && overviewBudget.cardio_training.length > 0 ? (
                <div className="space-y-2 py-2">
                  <div className="space-y-1.5">
                    {overviewBudget.cardio_training.map((cardio: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-md p-2 border border-red-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {cardio.name || 'פעילות אירובית'}
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                              {cardio.duration_minutes && (
                                <span className="flex items-center gap-1">
                                  <span className="text-gray-500">דקות:</span>
                                  <span className="font-medium dir-ltr">{cardio.duration_minutes}</span>
                                </span>
                              )}
                              {cardio.period_type && (
                                <span className="flex items-center gap-1">
                                  <span className="text-gray-500">תדירות:</span>
                                  <span className="font-medium">{cardio.period_type}</span>
                                </span>
                              )}
                              {cardio.workouts_per_week && (
                                <span className="flex items-center gap-1">
                                  <span className="text-gray-500">פעמים בשבוע:</span>
                                  <span className="font-medium dir-ltr">{cardio.workouts_per_week}</span>
                                </span>
                              )}
                            </div>
                            {cardio.notes && (
                              <p className="text-xs text-gray-500 mt-1.5 pt-1.5 border-t border-red-50">
                                {cardio.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-xs text-gray-400">לחץ להוספה</div>
              )}
            </div>

            {/* Supplements Plan Card */}
            <div
              className={`border rounded-xl p-3 relative hover:shadow-md transition-all cursor-pointer ${activeSupplements ? 'bg-green-50/30 border-green-100' : 'bg-gray-50 border-gray-100 border-dashed'}`}
              onClick={() => activeSupplements ? setSelectedSupplementPlan(activeSupplements) : onAddSupplementsPlan()}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${activeSupplements ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Pill className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${activeSupplements ? 'text-gray-900' : 'text-gray-500'}`}>תוספים</span>
              </div>
              {activeSupplements ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium truncate">{activeSupplements.description || 'ללא תיאור'}</p>
                  <div className="bg-white rounded-md p-2 border border-green-100 flex flex-col gap-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-500 font-medium">פריטים</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-green-50 text-green-700 border-green-100">
                        {activeSupplements.supplements?.length || 0}
                      </Badge>
                    </div>
                    <div className="space-y-2.5 max-h-[140px] overflow-y-auto scrollbar-hide">
                      {activeSupplements.supplements?.length ? (
                        activeSupplements.supplements.slice(0, 6).map((s: any, idx: number) => {
                          const name = typeof s === 'string' ? s : (s?.name ?? '');
                          const dosage = typeof s === 'string' ? '' : (s?.dosage ?? s?.mg ?? '');
                          const timing = typeof s === 'string' ? '' : (s?.timing ?? s?.when ?? '');
                          const dosageDisplay = (typeof dosage === 'string' && dosage.trim()) ? dosage.trim() : '—';
                          const timingDisplay = (typeof timing === 'string' && timing.trim()) ? timing.trim() : '—';
                          return (
                            <div key={idx} className="flex flex-col gap-0.5 border-b border-green-50 last:border-0 pb-2 last:pb-0">
                              <span className="text-xs font-semibold text-gray-800 truncate text-right">{name || '—'}</span>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
                                <span className="text-gray-500">מינון:</span>
                                <span className="text-gray-700 font-medium dir-ltr">{dosageDisplay}</span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-500">מתי לקחת:</span>
                                <span className="text-gray-700 font-medium">{timingDisplay}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-gray-400">אין תוספים בתכנית</span>
                      )}
                      {(activeSupplements.supplements?.length || 0) > 6 && (
                        <div className="text-[9px] text-gray-400 text-center pt-1 border-t border-green-50 mt-1">
                          +{activeSupplements.supplements!.length - 6} נוספים — לחץ לצפייה
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-xs text-gray-400">לחץ להוספה</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת הקצאת תכנית פעולה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הקצאת תכנית הפעולה?
              פעולה זו תמחק גם את כל התכניות המקושרות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              {deleteBudgetAssignment.isPending ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddWorkoutPlanDialog
        isOpen={isWorkoutPlanDialogOpen}
        onOpenChange={(open) => {
          setIsWorkoutPlanDialogOpen(open);
          if (!open) setEditingWorkoutPlan(null);
        }}
        onSave={async (data) => {
          if (editingWorkoutPlan?.id) {
            try {
              const { error } = await supabase.from('workout_plans').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editingWorkoutPlan.id);
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ['plans-history'] });
              queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
              toast({ title: 'הצלחה', description: 'תוכנית האימונים עודכנה בהצלחה' });
              setIsWorkoutPlanDialogOpen(false);
              setEditingWorkoutPlan(null);
            } catch (error: any) {
              toast({ title: 'שגיאה', description: error?.message, variant: 'destructive' });
            }
          } else {
            onAddWorkoutPlan();
          }
        }}
        customerId={customerId}
        leadId={leadId}
        initialData={editingWorkoutPlan}
      />

      <AddNutritionPlanDialog
        isOpen={isNutritionPlanDialogOpen}
        onOpenChange={(open) => {
          setIsNutritionPlanDialogOpen(open);
          if (!open) setEditingNutritionPlan(null);
        }}
        onSave={async (data) => {
          if (editingNutritionPlan?.id) {
            try {
              const { error } = await supabase.from('nutrition_plans').update({ targets: data, updated_at: new Date().toISOString() }).eq('id', editingNutritionPlan.id);
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ['plans-history'] });
              queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
              toast({ title: 'הצלחה', description: 'תוכנית התזונה עודכנה בהצלחה' });
              setIsNutritionPlanDialogOpen(false);
              setEditingNutritionPlan(null);
            } catch (error: any) {
              toast({ title: 'שגיאה', description: error?.message, variant: 'destructive' });
            }
          } else {
            onAddDietPlan();
          }
        }}
        customerId={customerId}
        leadId={leadId}
        initialData={editingNutritionPlan}
      />


      <BudgetDetailsModal
        isOpen={!!viewingBudgetId}
        onOpenChange={(open) => { if (!open) setViewingBudgetId(null); }}
        budgetId={viewingBudgetId}
        leadId={leadId}
        onEdit={() => {
          if (viewingBudgetId) {
            handleEditBudgetById(viewingBudgetId);
            setViewingBudgetId(null);
          }
        }}
      />

      <SendBudgetModal
        isOpen={!!sendingBudgetId && !!sendingBudget}
        onOpenChange={(open) => { if (!open) { setSendingBudgetId(null); setCustomerPhone(null); } }}
        budget={sendingBudget}
        phoneNumber={customerPhone}
      />

      <EditBudgetDialog
        isOpen={!!editingBudgetId && !!editingBudget}
        onOpenChange={(open) => { if (!open) { setEditingBudgetId(null); setCurrentAssignment(null); } }}
        editingBudget={editingBudget}
        onSave={handleSaveBudget}
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

      <AerobicActivityModal
        isOpen={isAerobicActivityModalOpen}
        onClose={() => setIsAerobicActivityModalOpen(false)}
        budgetId={effectiveBudgetId}
        cardioTraining={overviewBudget?.cardio_training || null}
        leadId={leadId}
      />

    </Card>
  );
};
