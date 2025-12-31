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
import { useBudgets } from '@/hooks/useBudgets';
import { useAssignBudgetToLead, useAssignBudgetToCustomer } from '@/hooks/useBudgets';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

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
  const { data: budgets = [], isLoading: isLoadingBudgets } = useBudgets();
  const assignToLead = useAssignBudgetToLead();
  const assignToCustomer = useAssignBudgetToCustomer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setSelectedBudgetId('');
      setNotes('');
    }
  }, [isOpen]);

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

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['budget-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
      queryClient.invalidateQueries({ queryKey: ['supplementPlan'] });

      toast({
        title: 'הצלחה',
        description: 'התקציב הוקצה בהצלחה. תכניות אימונים, תזונה ותוספים נוצרו אוטומטית.',
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

  const isSubmitting = assignToLead.isPending || assignToCustomer.isPending;

  return (
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
            <Label htmlFor="budget" className="text-sm font-semibold">
              תקציב *
            </Label>
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
  );
};

