/**
 * AssignBudgetDialog Component
 * 
 * Dialog for assigning a budget to a lead/customer
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBudgets, useAssignBudgetToLead, useAssignBudgetToCustomer, useCreateBudget } from '@/hooks/useBudgets';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { AddBudgetDialog } from './AddBudgetDialog';

interface AssignBudgetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  customerId?: string | null;
  onSuccess?: () => void;
}

export const AssignBudgetDialog = ({
  isOpen,
  onOpenChange,
  leadId,
  customerId,
  onSuccess,
}: AssignBudgetDialogProps) => {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
  // Refetch budgets when dialog opens to ensure we have the latest data
  const { data: budgetsData, isLoading: isLoadingBudgets, refetch: refetchBudgets } = useBudgets();
  const budgets = budgetsData?.data || [];
  const assignToLead = useAssignBudgetToLead();
  const assignToCustomer = useAssignBudgetToCustomer();
  const createBudget = useCreateBudget();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
          water_min: 2.5,
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
        description: 'נוצרו תכנית פעולה ריקה ותכניות ריקות לאימונים, תזונה, תוספים וצעדים',
      });

      // Close dialog and call onSuccess if provided
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating blank plans:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת התכניות',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedBudgetId('');
      setNotes('');
    } else {
      // Refetch budgets when dialog opens to ensure we have the latest data
      refetchBudgets();
    }
  }, [isOpen, refetchBudgets]);

  const handleAssign = async () => {
    if (!selectedBudgetId) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר תכנית פעולה',
        variant: 'destructive',
      });
      return;
    }

    if (!leadId && !customerId) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא ליד או לקוח',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get customerId if we only have leadId (needed for query invalidation)
      let finalCustomerId = customerId;
      if (leadId && !customerId) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('customer_id')
          .eq('id', leadId)
          .single();
        finalCustomerId = leadData?.customer_id || null;
      }

      // The mutation's onSuccess will handle query invalidation, but we also do it here
      // to ensure immediate UI update after sync completes
      if (leadId) {
        await assignToLead.mutateAsync({
          budgetId: selectedBudgetId,
          leadId,
          notes: notes || undefined,
        });
      } else if (customerId) {
        await assignToCustomer.mutateAsync({
          budgetId: selectedBudgetId,
          customerId,
          notes: notes || undefined,
        });
      }

      // Wait for plans to be created (sync happens inside mutation)
      await new Promise(resolve => setTimeout(resolve, 2000));


      // Invalidate queries to refresh data - ensure all plan types are refreshed
      // Use the exact query keys that usePlansHistory uses: ['plans-history', customerId, leadId]
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budget-assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplementPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }), // Invalidates all plans-history queries
        queryClient.invalidateQueries({ queryKey: ['plans-history', finalCustomerId, leadId || undefined] }), // Specific query
        queryClient.invalidateQueries({ queryKey: ['workout-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['supplement-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['steps-plans'] }),
      ]);
      
      // Force refetch the specific plans-history query with correct parameters
      // This ensures the UI updates immediately
      await queryClient.refetchQueries({ 
        queryKey: ['plans-history', finalCustomerId, leadId || undefined],
        exact: false 
      });
      

      toast({
        title: 'הצלחה',
        description: 'תכנית הפעולה הוקצתה בהצלחה. תכניות אימונים, תזונה, תוספים וצעדים נוצרו אוטומטית.',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בהקצאת תכנית הפעולה',
        variant: 'destructive',
      });
    }
  };

  const handleSaveBudget = async (data: any) => {
    try {
      const newBudget = await createBudget.mutateAsync({
        name: data.name!,
        description: data.description,
        nutrition_template_id: (data as any).nutrition_template_id,
        nutrition_targets: (data as any).nutrition_targets,
        steps_goal: (data as any).steps_goal,
        steps_instructions: (data as any).steps_instructions,
        workout_template_id: (data as any).workout_template_id,
        supplement_template_id: (data as any).supplement_template_id,
        supplements: (data as any).supplements,
        eating_order: (data as any).eating_order,
        eating_rules: (data as any).eating_rules,
        is_public: false,
      });

      // Refetch budgets to get the updated list
      await refetchBudgets();

      // Automatically select the newly created budget
      setSelectedBudgetId(newBudget.id);

      toast({
        title: 'הצלחה',
        description: 'תכנית הפעולה נוצרה בהצלחה ונבחרה אוטומטית',
      });

      setIsAddBudgetDialogOpen(false);
      return newBudget;
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת תכנית הפעולה',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const isSubmitting = assignToLead.isPending || assignToCustomer.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>הקצאת תכנית פעולה</DialogTitle>
            <DialogDescription>
              בחר תכנית פעולה להקצאה ל{leadId ? 'ליד' : 'לקוח'} זה. תכנית הפעולה תיצור אוטומטית תכניות אימונים, תזונה ותוספים.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="budget" className="text-sm font-semibold">
                  תכנית פעולה *
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCreateBlankPlans}
                    disabled={isSubmitting}
                    className="h-8 px-2"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    צור תכניות ריקות
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddBudgetDialogOpen(true)}
                    disabled={isSubmitting}
                    className="h-8 px-2"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    תכנית פעולה חדשה
                  </Button>
                </div>
              </div>
              <Select
                value={selectedBudgetId}
                onValueChange={setSelectedBudgetId}
                disabled={isLoadingBudgets || isSubmitting}
              >
                <SelectTrigger id="budget" className="border-slate-200" dir="rtl">
                  <SelectValue placeholder="בחר תכנית פעולה" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {budgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      {budget.name}
                      {budget.description && ` - ${budget.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">
              הערות (אופציונלי)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות נוספות על ההקצאה..."
              rows={3}
              className="border-slate-200"
              dir="rtl"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedBudgetId || isSubmitting}
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                מקצה...
              </>
            ) : (
              'הקצה תכנית פעולה'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Add Budget Dialog */}
    <AddBudgetDialog
      isOpen={isAddBudgetDialogOpen}
      onOpenChange={setIsAddBudgetDialogOpen}
      onSave={handleSaveBudget}
    />
    </>
  );
};

