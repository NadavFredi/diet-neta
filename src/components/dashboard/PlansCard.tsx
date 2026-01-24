
import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Footprints, UtensilsCrossed, Pill, Plus, Wallet, Edit, Trash2, Eye, FileText, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { BudgetLinkBadge } from './BudgetLinkBadge';
import { PlanDetailModal } from './dialogs/PlanDetailModal';
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
import { useNavigate } from 'react-router-dom';
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
  
  // States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<BudgetAssignmentItem | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<BudgetAssignmentItem | null>(null);
  const [viewingBudgetId, setViewingBudgetId] = useState<string | null>(null);
  const [sendingBudgetId, setSendingBudgetId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Dialog states
  const [isWorkoutPlanDialogOpen, setIsWorkoutPlanDialogOpen] = useState(false);
  const [isNutritionPlanDialogOpen, setIsNutritionPlanDialogOpen] = useState(false);
  const [isStepsPlanDialogOpen, setIsStepsPlanDialogOpen] = useState(false);
  const [editingWorkoutPlan, setEditingWorkoutPlan] = useState<any>(null);
  const [editingNutritionPlan, setEditingNutritionPlan] = useState<any>(null);
  const [editingStepsPlan, setEditingStepsPlan] = useState<any>(null);

  // Modal states for details
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState<WorkoutHistoryItem | null>(null);
  const [selectedNutritionPlan, setSelectedNutritionPlan] = useState<NutritionHistoryItem | null>(null);
  const [selectedSupplementPlan, setSelectedSupplementPlan] = useState<SupplementsHistoryItem | null>(null);

  // Queries
  const { data: sendingBudget } = useBudget(sendingBudgetId);
  const { data: editingBudget, refetch: refetchEditingBudget } = useBudget(editingBudgetId);
  const updateBudget = useUpdateBudget();
  const createBudget = useCreateBudget();

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

  // Fetch fallback budget details if needed
  const { data: fallbackBudget } = useBudget(fallbackBudgetId);

  // Effective budget name
  const effectiveBudgetName = activeAssignment?.budget_name || fallbackBudget?.name || 'תקציב פעיל';
  const effectiveBudgetId = activeAssignment?.budget_id || fallbackBudgetId;

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
        toast({ title: 'הצלחה', description: 'נוצר עותק פרטי של התקציב. שינויים יעשו רק על הליד הזה.' });
      }

      setCurrentAssignment(assignment);
      setEditingBudgetId(budgetIdToEdit);
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל בעריכת התקציב', variant: 'destructive' });
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
      });

      toast({ title: 'הצלחה', description: 'התקציב עודכן בהצלחה' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['budget', editingBudget.id] }),
        queryClient.invalidateQueries({ queryKey: ['budget', updateResult.id] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
      ]);
      setEditingBudgetId(null);
      setCurrentAssignment(null);
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל בעדכון התקציב', variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    try {
      await deleteBudgetAssignment.mutateAsync(assignmentToDelete.id);
      toast({ title: 'הצלחה', description: 'התקציב והתכניות המקושרות נמחקו בהצלחה' });
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל במחיקת התקציב', variant: 'destructive' });
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
        setEditingNutritionPlan(data);
        setIsNutritionPlanDialogOpen(true);
      } catch (error: any) {
        toast({ title: 'שגיאה', description: error?.message || 'נכשל בטעינת תוכנית התזונה', variant: 'destructive' });
      }
    }
  };

  const handleEditSteps = async (step: any) => {
     if (customerId) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('daily_protocol')
          .eq('id', customerId)
          .single();
        if (error) throw error;
        setEditingStepsPlan({
          stepsGoal: data?.daily_protocol?.stepsGoal || step.target || 0,
          stepsInstructions: '',
        });
        setIsStepsPlanDialogOpen(true);
      } catch (error: any) {
        toast({ title: 'שגיאה', description: error?.message || 'נכשל בטעינת יעד הצעדים', variant: 'destructive' });
      }
    }
  };

  if (!activeAssignment && !effectiveBudgetId && !workoutHistory?.length && !nutritionHistory?.length) {
    return (
      <Card className="p-6 border border-slate-100 rounded-lg shadow-sm bg-white mt-3 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#E8EDF7] flex items-center justify-center">
          <Wallet className="h-6 w-6 text-[#5B6FB9]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">אין תכניות פעילות</h3>
        <p className="text-gray-500 text-sm mb-4">הקצה תקציב כדי ליצור תכניות אימון, תזונה וצעדים</p>
        <Button 
          onClick={onAssignBudget}
          className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
        >
          <Plus className="h-4 w-4" />
          הקצה תקציב
        </Button>
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
              {effectiveBudgetName !== 'תקציב פעיל' ? effectiveBudgetName : 'סקירת תכניות'}
            </h3>
            <div className="text-xs text-gray-500 flex gap-2">
              {activeAssignment && (
                <span>הוקצה ב: {formatDate(activeAssignment.assigned_at)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {effectiveBudgetId && (
            <div className="flex items-center gap-1">
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => activeAssignment ? handleEditBudgetFromLead(activeAssignment) : handleEditBudgetById(effectiveBudgetId)} 
                 className="gap-2 h-8 ml-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
               >
                 <Edit className="h-3.5 w-3.5" />
                 <span>ערוך תקציב</span>
               </Button>

               <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => setViewingBudgetId(effectiveBudgetId)} className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4 text-gray-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>תצוגה מהירה</p></TooltipContent>
                </Tooltip>
                 {activeAssignment && (
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(activeAssignment)} className="h-8 w-8 p-0 hover:text-red-600">
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>מחק תקציב</p></TooltipContent>
                  </Tooltip>
                 )}
               </TooltipProvider>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Nutrition Plan Card */}
          <div 
            className={`border rounded-xl p-3 relative hover:shadow-md transition-all cursor-pointer ${activeNutrition ? 'bg-orange-50/30 border-orange-100' : 'bg-gray-50 border-gray-100 border-dashed'}`}
            onClick={() => activeNutrition ? handleEditNutrition(activeNutrition) : onAddDietPlan()}
          >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${activeNutrition ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'}`}>
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${activeNutrition ? 'text-gray-900' : 'text-gray-500'}`}>תזונה</span>
             </div>
             {activeNutrition ? (
               <div className="space-y-2">
                 <p className="text-xs text-gray-600 font-medium truncate">{activeNutrition.description || 'ללא תיאור'}</p>
                 <div className="grid grid-cols-2 gap-1.5">
                   <div className="flex flex-col bg-white rounded-md p-1 border border-orange-100 items-center">
                     <span className="text-[9px] text-gray-400 font-medium">קלוריות</span>
                     <span className="text-xs font-bold text-gray-700">{activeNutrition.targets?.calories || '-'}</span>
                   </div>
                   <div className="flex flex-col bg-white rounded-md p-1 border border-orange-100 items-center">
                     <span className="text-[9px] text-gray-400 font-medium">חלבון</span>
                     <span className="text-xs font-bold text-gray-700">{activeNutrition.targets?.protein || '-'}</span>
                   </div>
                   <div className="flex flex-col bg-white rounded-md p-1 border border-orange-100 items-center">
                     <span className="text-[9px] text-gray-400 font-medium">פחמימה</span>
                     <span className="text-xs font-bold text-gray-700">{activeNutrition.targets?.carbs || '-'}</span>
                   </div>
                   <div className="flex flex-col bg-white rounded-md p-1 border border-orange-100 items-center">
                     <span className="text-[9px] text-gray-400 font-medium">שומן</span>
                     <span className="text-xs font-bold text-gray-700">{activeNutrition.targets?.fat || '-'}</span>
                   </div>
                 </div>
               </div>
             ) : (
                <div className="h-16 flex items-center justify-center text-xs text-gray-400">לחץ להוספה</div>
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
                <span className={`text-sm font-semibold ${activeWorkout ? 'text-gray-900' : 'text-gray-500'}`}>אימונים</span>
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
                       const isToday = new Date().getDay() === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayKey);
                       
                       return (
                         <AccordionItem value={dayKey} key={dayKey} className="border-b-0 mb-1 last:mb-0">
                           <AccordionTrigger className={`py-2 px-2 hover:no-underline hover:bg-blue-50 rounded-md ${isActive ? 'bg-blue-50/50' : ''}`}>
                             <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${isActive ? (isToday ? 'bg-blue-600' : 'bg-blue-400') : 'bg-gray-200'}`} />
                               <span className={`text-sm ${isToday ? 'font-bold text-blue-700' : 'text-gray-600'}`}>
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
            className={`border rounded-xl p-3 relative hover:shadow-md transition-all cursor-pointer ${activeSteps ? 'bg-cyan-50/30 border-cyan-100' : 'bg-gray-50 border-gray-100 border-dashed'}`}
            onClick={() => activeSteps ? handleEditSteps(activeSteps) : null}
          >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${activeSteps ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Footprints className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${activeSteps ? 'text-gray-900' : 'text-gray-500'}`}>צעדים</span>
             </div>
             {activeSteps ? (
               <div className="space-y-2 text-center py-2">
                 <div>
                   <p className="text-2xl font-bold text-cyan-700 leading-none">{(activeSteps.target || 0).toLocaleString()}</p>
                   <p className="text-[10px] text-gray-500 mt-1">צעדים ליום</p>
                 </div>
                 <div className="inline-block bg-white rounded-md px-2 py-0.5 border border-cyan-100">
                   <p className="text-[10px] text-gray-400">{activeSteps.week || activeSteps.weekNumber || 'יעד נוכחי'}</p>
                 </div>
               </div>
             ) : (
                <div className="h-16 flex items-center justify-center text-xs text-gray-400">אין יעד פעיל</div>
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
                 <div className="bg-white rounded-md p-1.5 border border-green-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-500">פריטים</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-green-50 text-green-700 border-green-100">
                        {activeSupplements.supplements?.length || 0}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {activeSupplements.supplements?.slice(0, 2).map((s: any) => s.name || s).join(', ') || '-'}
                      {(activeSupplements.supplements?.length || 0) > 2 ? '...' : ''}
                    </div>
                 </div>
               </div>
             ) : (
                <div className="h-16 flex items-center justify-center text-xs text-gray-400">לחץ להוספה</div>
             )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת הקצאת תקציב</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הקצאת התקציב?
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
              const { error } = await supabase.from('workout_plans').update({...data, updated_at: new Date().toISOString()}).eq('id', editingWorkoutPlan.id);
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
              const { error } = await supabase.from('nutrition_plans').update({targets: data, updated_at: new Date().toISOString()}).eq('id', editingNutritionPlan.id);
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

      <BudgetDetailsModal
        isOpen={!!viewingBudgetId}
        onOpenChange={(open) => { if (!open) setViewingBudgetId(null); }}
        budgetId={viewingBudgetId}
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

    </Card>
  );
};
