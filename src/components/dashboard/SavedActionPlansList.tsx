/**
 * SavedActionPlansList Component
 * 
 * Displays a list of all saved action plans
 */

import React, { useState } from 'react';
import { useSavedActionPlans, useDeleteSavedActionPlan, type SavedActionPlan } from '@/hooks/useSavedActionPlans';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Eye, Trash2, Calendar, Apple, Dumbbell, Pill, Footprints, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { SavedActionPlanView } from './SavedActionPlanView';
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

/** Build a comprehensive summary of the action plan from its snapshot */
function getActionPlanSummaryText(plan: SavedActionPlan): string {
  const parts: string[] = [];
  const s = plan.snapshot || {};

  // Description
  if (plan.description?.trim()) {
    const desc = plan.description.trim().replace(/\s+/g, ' ');
    parts.push(desc.length > 80 ? `${desc.slice(0, 77)}...` : desc);
  }

  // Nutrition
  if (s.nutrition_template?.name) parts.push(`תזונה: ${s.nutrition_template.name}`);
  if (s.nutrition_targets && (s.nutrition_targets.calories || s.nutrition_targets.protein)) {
    const t = s.nutrition_targets;
    const vals = [
      t.calories && `${t.calories} קק"ל`,
      t.protein && `${t.protein} גרם חלבון`,
      t.carbs && `${t.carbs} גרם פחמימה`,
      t.fat && `${t.fat} גרם שומן`
    ].filter(Boolean);
    if (vals.length) parts.push(vals.join(' • '));
  }

  // Workout Plan Summary
  if (s.workout_template?.name) {
    const workoutParts = [`אימונים: ${s.workout_template.name}`];
    
    // Add workout template description if available
    if (s.workout_template.description) {
      const desc = s.workout_template.description.trim().replace(/\s+/g, ' ');
      workoutParts.push(desc.length > 50 ? `${desc.slice(0, 47)}...` : desc);
    }
    
    // Add weekly workout summary
    if (s.workout_template.routine_data?.weeklyWorkout?.days) {
      const days = s.workout_template.routine_data.weeklyWorkout.days;
      const activeDays = Object.keys(days).filter(day => 
        days[day]?.isActive && days[day]?.exercises?.length > 0
      );
      if (activeDays.length > 0) {
        const totalExercises = activeDays.reduce((sum, day) => 
          sum + (days[day]?.exercises?.length || 0), 0
        );
        workoutParts.push(`${activeDays.length} ימים פעילים • ${totalExercises} תרגילים`);
      }
    }
    
    parts.push(workoutParts.join(' | '));
  }

  // Cardio Training
  const cardioCount = Array.isArray(s.cardio_training) ? s.cardio_training.length : 0;
  if (cardioCount > 0) {
    const cardioDetails = s.cardio_training.map((c: any) => 
      c.name ? `${c.name}${c.duration_minutes ? ` (${c.duration_minutes} דקות)` : ''}` : null
    ).filter(Boolean);
    if (cardioDetails.length > 0) {
      parts.push(`אירובי: ${cardioDetails.join(', ')}`);
    } else {
      parts.push(`אירובי ${cardioCount}`);
    }
  }

  // Interval Training
  const intervalCount = Array.isArray(s.interval_training) ? s.interval_training.length : 0;
  if (intervalCount > 0) {
    const intervalDetails = s.interval_training.map((i: any) => 
      i.name ? `${i.name}${i.duration_minutes ? ` (${i.duration_minutes} דקות)` : ''}` : null
    ).filter(Boolean);
    if (intervalDetails.length > 0) {
      parts.push(`אינטרוולים: ${intervalDetails.join(', ')}`);
    } else {
      parts.push(`אינטרוולים ${intervalCount}`);
    }
  }

  // Supplements
  const suppCount = Array.isArray(s.supplements) ? s.supplements.length : 0;
  if (suppCount > 0) {
    const suppNames = s.supplements.map((sup: any) => sup.name || sup).filter(Boolean).slice(0, 3);
    parts.push(`תוספים ${suppCount}${suppNames.length > 0 ? `: ${suppNames.join(', ')}${suppCount > 3 ? '...' : ''}` : ''}`);
  }

  // Steps
  if (s.steps_goal) {
    parts.push(`צעדים: ${s.steps_goal.toLocaleString()}`);
  }

  // Notes and Guidelines
  const notes: string[] = [];
  if (s.eating_order?.trim()) {
    const order = s.eating_order.trim().replace(/\s+/g, ' ');
    notes.push(`סדר אכילה: ${order.length > 60 ? `${order.slice(0, 57)}...` : order}`);
  }
  if (s.eating_rules?.trim()) {
    const rules = s.eating_rules.trim().replace(/\s+/g, ' ');
    notes.push(`כללי אכילה: ${rules.length > 60 ? `${rules.slice(0, 57)}...` : rules}`);
  }
  if (s.steps_instructions?.trim()) {
    const steps = s.steps_instructions.trim().replace(/\s+/g, ' ');
    notes.push(`הוראות צעדים: ${steps.length > 60 ? `${steps.slice(0, 57)}...` : steps}`);
  }
  if (notes.length > 0) {
    parts.push(notes.join(' | '));
  }

  // Additional notes from the plan itself
  if (plan.notes?.trim()) {
    const planNotes = plan.notes.trim().replace(/\s+/g, ' ');
    parts.push(`הערות: ${planNotes.length > 80 ? `${planNotes.slice(0, 77)}...` : planNotes}`);
  }

  return parts.length ? parts.join(' • ') : 'אין פרטי תכנית';
}

export interface SavedActionPlansListProps {
  leadId?: string | null;
  customerId?: string | null;
}

export function SavedActionPlansList({ leadId, customerId }: SavedActionPlansListProps = {}) {
  const { data, isLoading } = useSavedActionPlans();
  const deletePlan = useDeleteSavedActionPlan();
  const { toast } = useToast();
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const savedPlans = data?.data || [];

  const handleDelete = async (id: string) => {
    try {
      await deletePlan.mutateAsync(id);
      toast({
        title: 'הצלחה',
        description: 'תכנית הפעולה נמחקה בהצלחה',
      });
      setDeletingPlanId(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת תכנית הפעולה',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">טוען תכניות פעולה שמורות...</p>
        </div>
      </div>
    );
  }

  if (savedPlans.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-700 mb-2">אין תכניות פעולה שמורות</p>
          <p className="text-sm text-slate-500">שמור תכנית פעולה כדי שתופיע כאן</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {savedPlans.map((plan) => {
            const summary = getActionPlanSummaryText(plan);
            const s = plan.snapshot || {};
            
            // Helper function to create compact workout summary
            const getWorkoutSummary = () => {
              const parts: string[] = [];
              if (s.workout_template?.name) {
                parts.push(s.workout_template.name);
                if (s.workout_template.routine_data?.weeklyWorkout?.days) {
                  const days = s.workout_template.routine_data.weeklyWorkout.days;
                  const activeDays = Object.keys(days).filter(day => 
                    days[day]?.isActive && days[day]?.exercises?.length > 0
                  );
                  if (activeDays.length > 0) {
                    const totalExercises = activeDays.reduce((sum, day) => 
                      sum + (days[day]?.exercises?.length || 0), 0
                    );
                    const dayLabels: Record<string, string> = {
                      sunday: 'א', monday: 'ב', tuesday: 'ג', wednesday: 'ד',
                      thursday: 'ה', friday: 'ו', saturday: 'ש',
                    };
                    const activeDayNames = activeDays.map(d => dayLabels[d] || d).join(',');
                    parts.push(`${activeDays.length} ימים (${activeDayNames}) • ${totalExercises} תרגילים`);
                  }
                }
              }
              if (Array.isArray(s.cardio_training) && s.cardio_training.length > 0) {
                const cardio = s.cardio_training.map((c: any) => 
                  `${c.name || 'אירובי'}${c.duration_minutes ? ` ${c.duration_minutes}ד` : ''}${c.period_type ? ` ${c.period_type}` : ''}`
                ).join(', ');
                parts.push(`אירובי: ${cardio}`);
              }
              if (Array.isArray(s.interval_training) && s.interval_training.length > 0) {
                const intervals = s.interval_training.map((i: any) => 
                  `${i.name || 'אינטרוול'}${i.duration_minutes ? ` ${i.duration_minutes}ד` : ''}${i.period_type ? ` ${i.period_type}` : ''}`
                ).join(', ');
                parts.push(`אינטרוולים: ${intervals}`);
              }
              return parts.join(' • ');
            };
            
            return (
            <Card key={plan.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-all" dir="rtl">
              <div className="px-4 py-2.5">
                {/* Single Row Layout */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Name & Date */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                      {plan.name}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span className="whitespace-nowrap">
                        {format(new Date(plan.saved_at), 'HH:mm dd/MM/yyyy', { locale: he })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Nutrition */}
                  {(s.nutrition_template?.name || s.nutrition_targets) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 rounded-md border border-orange-100">
                      <Apple className="h-3 w-3 text-orange-600 flex-shrink-0" />
                      <div className="flex items-center gap-1.5 text-xs">
                        {s.nutrition_template?.name && (
                          <span className="font-medium text-slate-900">{s.nutrition_template.name}</span>
                        )}
                        {s.nutrition_targets && (s.nutrition_targets.calories || s.nutrition_targets.protein) && (
                          <span className="text-slate-600">
                            {s.nutrition_template?.name && '•'}
                            {[
                              s.nutrition_targets.calories && `${s.nutrition_targets.calories} קק"ל`,
                              s.nutrition_targets.protein && `${s.nutrition_targets.protein} חלבון`,
                              s.nutrition_targets.carbs && `${s.nutrition_targets.carbs} פחמימה`,
                              s.nutrition_targets.fat && `${s.nutrition_targets.fat} שומן`
                            ].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Workouts */}
                  {(s.workout_template?.name || s.workout_template_id || 
                    (Array.isArray(s.cardio_training) && s.cardio_training.length > 0) ||
                    (Array.isArray(s.interval_training) && s.interval_training.length > 0)) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md border border-blue-100 max-w-md">
                      <Dumbbell className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      <span className="text-xs text-slate-700 truncate" title={getWorkoutSummary()}>
                        {getWorkoutSummary() || 'תכנית אימונים'}
                      </span>
                    </div>
                  )}
                  
                  {/* Supplements & Steps */}
                  {((Array.isArray(s.supplements) && s.supplements.length > 0) || s.steps_goal) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md border border-green-100">
                      {Array.isArray(s.supplements) && s.supplements.length > 0 && (
                        <>
                          <Pill className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-slate-700">
                            {s.supplements.length} תוספים: {s.supplements.slice(0, 2).map((sup: any) => sup.name || sup).filter(Boolean).join(', ')}
                            {s.supplements.length > 2 && '...'}
                          </span>
                        </>
                      )}
                      {s.steps_goal && (
                        <>
                          {Array.isArray(s.supplements) && s.supplements.length > 0 && <span className="text-slate-300 mx-1">|</span>}
                          <Footprints className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-slate-700">{s.steps_goal.toLocaleString()} צעדים</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Guidelines/Notes - Compact */}
                  {(s.eating_order?.trim() || s.eating_rules?.trim() || s.steps_instructions?.trim() || plan.notes?.trim()) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border border-slate-200 max-w-xs">
                      <FileText className="h-3 w-3 text-slate-600 flex-shrink-0" />
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        {s.eating_order?.trim() && (
                          <span className="truncate" title={s.eating_order}>
                            סדר: {s.eating_order.length > 15 ? s.eating_order.slice(0, 12) + '...' : s.eating_order}
                          </span>
                        )}
                        {s.eating_rules?.trim() && (
                          <>
                            {s.eating_order?.trim() && <span className="text-slate-300">•</span>}
                            <span className="truncate" title={s.eating_rules}>
                              כללים: {s.eating_rules.length > 15 ? s.eating_rules.slice(0, 12) + '...' : s.eating_rules}
                            </span>
                          </>
                        )}
                        {s.steps_instructions?.trim() && (
                          <>
                            {(s.eating_order?.trim() || s.eating_rules?.trim()) && <span className="text-slate-300">•</span>}
                            <span className="truncate" title={s.steps_instructions}>
                              צעדים: {s.steps_instructions.length > 15 ? s.steps_instructions.slice(0, 12) + '...' : s.steps_instructions}
                            </span>
                          </>
                        )}
                        {plan.notes?.trim() && (
                          <>
                            {(s.eating_order?.trim() || s.eating_rules?.trim() || s.steps_instructions?.trim()) && <span className="text-slate-300">•</span>}
                            <span className="truncate" title={plan.notes}>
                              הערות: {plan.notes.length > 15 ? plan.notes.slice(0, 12) + '...' : plan.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Description - Compact */}
                  {plan.description?.trim() && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-md border border-purple-100 max-w-xs">
                      <FileText className="h-3 w-3 text-purple-600 flex-shrink-0" />
                      <span className="text-xs text-slate-700 truncate" title={plan.description}>
                        {plan.description.length > 30 ? plan.description.slice(0, 27) + '...' : plan.description}
                      </span>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mr-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingPlanId(plan.id)}
                      className="h-7 px-2.5 text-xs"
                    >
                      <Eye className="h-3 w-3 ml-1" />
                      צפה
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingPlanId(plan.id)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
          })}
        </div>
      </div>

      {/* View Plan Modal */}
      {viewingPlanId && (
        <SavedActionPlanView
          planId={viewingPlanId}
          isOpen={!!viewingPlanId}
          onClose={() => setViewingPlanId(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPlanId} onOpenChange={(open) => !open && setDeletingPlanId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תכנית פעולה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק תכנית פעולה זו? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlanId && handleDelete(deletingPlanId)}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
