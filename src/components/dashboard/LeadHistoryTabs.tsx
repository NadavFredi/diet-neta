/**
 * LeadHistoryTabs Component
 * 
 * Displays workout history and steps history for a single lead.
 * Used in ActionDashboard for the active lead interaction.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Footprints, UtensilsCrossed, Pill, Plus, Wallet, Activity, CalendarDays, Trash2 } from 'lucide-react';
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
import { formatDate } from '@/utils/dashboard';
import { BudgetLinkBadge } from './BudgetLinkBadge';
import { PlanDetailModal } from './dialogs/PlanDetailModal';
import { DailyCheckInDetailModal } from './dialogs/DailyCheckInDetailModal';
import { AddWorkoutPlanDialog } from './dialogs/AddWorkoutPlanDialog';
import { AddNutritionPlanDialog } from './dialogs/AddNutritionPlanDialog';
import { StepsPlanDialog } from './dialogs/StepsPlanDialog';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteBudgetAssignment } from '@/hooks/useBudgets';

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
  notes?: string;
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
  const deleteBudgetAssignment = useDeleteBudgetAssignment();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<BudgetAssignmentItem | null>(null);
  
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

  const hasWorkoutHistory = workoutHistory && workoutHistory.length > 0;
  const hasStepsHistory = stepsHistory && stepsHistory.length > 0;
  const hasNutritionHistory = nutritionHistory && nutritionHistory.length > 0;
  const hasSupplementsHistory = supplementsHistory && supplementsHistory.length > 0;
  const hasBudgetAssignments = budgetAssignments && budgetAssignments.length > 0;

  // Delete budget assignment handlers
  const handleDeleteClick = (assignment: BudgetAssignmentItem) => {
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
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
          className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white"
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
        <TabsList className="grid w-full grid-cols-7 mb-4 h-10 bg-gray-100 rounded-lg p-1">
          <TabsTrigger 
            value="budgets" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            תקציבים
          </TabsTrigger>
          <TabsTrigger 
            value="workouts" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            יומן אימונים
          </TabsTrigger>
          <TabsTrigger 
            value="steps" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            יומן צעדים
          </TabsTrigger>
          <TabsTrigger 
            value="nutrition" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            תכניות תזונה
          </TabsTrigger>
          <TabsTrigger 
            value="supplements" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            תכניות תוספים
          </TabsTrigger>
          <TabsTrigger 
            value="daily-activity" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            יומן פעילות יומי
          </TabsTrigger>
          <TabsTrigger 
            value="weekly-checkin" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            דיווח שבועי
          </TabsTrigger>
        </TabsList>

        {/* Workout History Tab */}
        <TabsContent value="workouts" className="mt-0">
          {!hasWorkoutHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תוכניות אימון</p>
              <p className="text-gray-400 text-xs mb-3">תכניות אימונים נוצרות אוטומטית מהתקציב</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white border-[#5B6FB9]"
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
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">כוח</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">קרדיו</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">אינטרוולים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workoutHistory.map((workout, index) => {
                    const strength = workout.split?.strength || workout.strengthCount || workout.strength || 0;
                    const cardio = workout.split?.cardio || workout.cardioCount || workout.cardio || 0;
                    const intervals = workout.split?.intervals || workout.intervalsCount || workout.intervals || 0;

                    return (
                      <TableRow
                        key={index}
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
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        } hover:bg-blue-50 hover:shadow-sm border-b border-gray-100`}
                      >
                        <TableCell className="text-xs font-semibold text-gray-900 py-3">
                          {workout.startDate ? formatDate(workout.startDate) : '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs font-semibold text-gray-900 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate">{workout.description || workout.name || '-'}</span>
                            {workout.budget_id && (
                              <BudgetLinkBadge budgetId={workout.budget_id} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 font-semibold">
                            {strength}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 font-semibold">
                            {cardio}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5 font-semibold">
                            {intervals}
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
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white border-[#5B6FB9]"
              >
                <Plus className="h-4 w-4" />
                הקצה תקציב
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {(stepsHistory || []).map((step: any, index: number) => {
                const isCurrent = index === (stepsHistory || []).length - 1;
                return (
                  <div
                    key={index}
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
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6 text-orange-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תכניות תזונה</p>
              <p className="text-gray-400 text-xs mb-3">תכניות תזונה נוצרות אוטומטית מהתקציב</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white border-[#5B6FB9]"
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
                  {nutritionHistory.map((nutrition, index) => (
                    <TableRow
                      key={index}
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
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Supplements History Tab */}
        <TabsContent value="supplements" className="mt-0">
          {!hasSupplementsHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-100 flex items-center justify-center">
                <Pill className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תכניות תוספים</p>
              <p className="text-gray-400 text-xs mb-3">תכניות תוספים נוצרות אוטומטית מהתקציב</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white border-[#5B6FB9]"
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
                  {supplementsHistory.map((supplement, index) => (
                    <TableRow
                      key={index}
                      onClick={() => setSelectedSupplementPlan(supplement)}
                      className={`transition-all duration-200 cursor-pointer ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
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
                  ))}
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
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-purple-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין תקציבים מוקצים</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAssignBudget}
                type="button"
                className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white border-[#5B6FB9]"
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
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">הערות</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3 w-20">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetAssignments.map((assignment, index) => (
                    <TableRow
                      key={assignment.id}
                      className={`transition-all duration-200 ${
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
                      <TableCell className="text-xs max-w-xs truncate font-semibold text-gray-900 py-3">
                        {assignment.notes || '-'}
                      </TableCell>
                      <TableCell className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(assignment);
                          }}
                          disabled={deleteBudgetAssignment.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
    </Card>
  );
};




