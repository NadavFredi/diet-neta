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
        description: 'אנא בחר תקציב',
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
        description: 'התקציב הוקצה בהצלחה. תכניות אימונים, תזונה, תוספים וצעדים נוצרו אוטומטית.',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בהקצאת התקציב',
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
        description: 'התקציב נוצר בהצלחה ונבחר אוטומטית',
      });

      setIsAddBudgetDialogOpen(false);
      return newBudget;
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת התקציב',
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
            <DialogTitle>הקצאת תקציב</DialogTitle>
            <DialogDescription>
              בחר תקציב להקצאה ל{leadId ? 'ליד' : 'לקוח'} זה. התקציב ייצור אוטומטית תכניות אימונים, תזונה ותוספים.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="budget" className="text-sm font-semibold">
                  תקציב *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddBudgetDialogOpen(true)}
                  disabled={isSubmitting}
                  className="h-8 px-2"
                >
                  <Plus className="h-4 w-4 ml-1" />
                  תקציב חדש
                </Button>
              </div>
              <Select
                value={selectedBudgetId}
                onValueChange={setSelectedBudgetId}
                disabled={isLoadingBudgets || isSubmitting}
              >
                <SelectTrigger id="budget" className="border-slate-200" dir="rtl">
                  <SelectValue placeholder="בחר תקציב" />
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
              'הקצה תקציב'
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

