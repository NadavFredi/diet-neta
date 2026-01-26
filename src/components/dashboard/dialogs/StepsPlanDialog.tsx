/**
 * StepsPlanDialog Component
 * 
 * Dialog for editing steps goal for a customer/lead.
 * Extracted from BudgetForm steps section.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface StepsPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  leadId?: string;
  budgetId?: string | null;
  initialData?: {
    id?: string;
    stepsGoal?: number;
    stepsInstructions?: string;
    budgetId?: string;
  };
}

export const StepsPlanDialog = ({
  isOpen,
  onOpenChange,
  customerId,
  leadId,
  budgetId: propBudgetId,
  initialData,
}: StepsPlanDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stepsGoal, setStepsGoal] = useState(0);
  const [stepsInstructions, setStepsInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setStepsGoal(initialData.stepsGoal || 0);
      setStepsInstructions(initialData.stepsInstructions || '');
    } else {
      setStepsGoal(0);
      setStepsInstructions('');
    }
  }, [initialData, isOpen]);

  const handleSave = async () => {
    if (!customerId && !leadId) {
      toast({
        title: 'שגיאה',
        description: 'נדרש מזהה לקוח או ליד',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const budgetId = initialData?.budgetId || propBudgetId;

      if (initialData?.id) {
        // Update existing plan
        const { error } = await supabase
          .from('steps_plans')
          .update({
            steps_goal: stepsGoal,
            steps_instructions: stepsInstructions,
          })
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // Create new plan (e.g. overriding budget default)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('steps_plans')
          .insert({
            user_id: user.id,
            customer_id: customerId || null,
            lead_id: leadId || null,
            budget_id: budgetId || null,
            start_date: new Date().toISOString().split('T')[0],
            steps_goal: stepsGoal,
            steps_instructions: stepsInstructions,
            is_active: true,
          });

        if (error) throw error;
      }

      // Sync with budget if budgetId is present (to trigger history log)
      if (budgetId) {
        const { error: budgetError } = await supabase
          .from('budgets')
          .update({
            steps_goal: stepsGoal,
            steps_instructions: stepsInstructions,
          })
          .eq('id', budgetId);
          
        if (budgetError) {
          console.error('Error syncing budget:', budgetError);
        } else {
          // Invalidate budget history query
          queryClient.invalidateQueries({ queryKey: ['budget-history', budgetId] });
          queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['plans-history'] });
      if (customerId) queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });

      toast({
        title: 'הצלחה',
        description: 'יעד הצעדים עודכן בהצלחה',
      });
  
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving steps plan:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון יעד הצעדים',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            {initialData ? 'עריכת יעד צעדים' : 'הגדרת יעד צעדים'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Footprints className="h-4 w-4 text-slate-400" />
              יעד צעדים יומי
            </Label>
            <Input
              type="number"
              value={stepsGoal || ''}
              onChange={(e) => setStepsGoal(parseInt(e.target.value) || 0)}
              placeholder="לדוגמה: 7000"
              className={cn(
                "h-10 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                "text-slate-900 font-medium text-sm"
              )}
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="steps_instructions" className="text-sm font-medium text-slate-700">
              הוראות צעדים
            </Label>
            <Textarea
              id="steps_instructions"
              value={stepsInstructions}
              onChange={(e) => setStepsInstructions(e.target.value)}
              placeholder="הוראות והנחיות נוספות לגבי הצעדים היומיים"
              className={cn(
                "min-h-[100px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 transition-all resize-none",
                "text-slate-900 font-medium text-sm"
              )}
              dir="rtl"
            />
          </div>
        </div>

        <div className="flex flex-row-reverse justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "h-10 px-6 bg-gradient-to-r from-[#5B6FB9] to-[#5B6FB9]/90 text-white font-semibold text-sm",
              "hover:from-[#5B6FB9]/90 hover:to-[#5B6FB9] transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? 'שומר...' : 'שמור'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-10 px-5 text-sm text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300"
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
