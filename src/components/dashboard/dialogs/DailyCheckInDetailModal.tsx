/**
 * DailyCheckInDetailModal Component
 * 
 * Modal for viewing and editing daily check-in details
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

interface DailyCheckIn {
  id: string;
  check_in_date: string;
  weight: number | null;
  calories_daily: number | null;
  protein_daily: number | null;
  fiber_daily: number | null;
  steps_actual: number | null;
  energy_level: number | null;
}

interface DailyCheckInDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkIn: DailyCheckIn | null;
  customerId?: string | null;
}

export const DailyCheckInDetailModal = ({
  isOpen,
  onClose,
  checkIn,
  customerId,
}: DailyCheckInDetailModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    check_in_date: '',
    weight: '',
    calories_daily: '',
    protein_daily: '',
    fiber_daily: '',
    steps_actual: '',
    energy_level: '',
  });

  useEffect(() => {
    if (checkIn) {
      setForm({
        check_in_date: checkIn.check_in_date || '',
        weight: checkIn.weight?.toString() || '',
        calories_daily: checkIn.calories_daily?.toString() || '',
        protein_daily: checkIn.protein_daily?.toString() || '',
        fiber_daily: checkIn.fiber_daily?.toString() || '',
        steps_actual: checkIn.steps_actual?.toString() || '',
        energy_level: checkIn.energy_level?.toString() || '',
      });
      setIsEditing(false);
    }
  }, [checkIn]);

  const handleSave = async () => {
    if (!checkIn?.id) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא מזהה דיווח',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await supabase
        .from('daily_check_ins')
        .update({
          check_in_date: form.check_in_date,
          weight: form.weight ? parseFloat(form.weight) : null,
          calories_daily: form.calories_daily ? parseInt(form.calories_daily) : null,
          protein_daily: form.protein_daily ? parseInt(form.protein_daily) : null,
          fiber_daily: form.fiber_daily ? parseInt(form.fiber_daily) : null,
          steps_actual: form.steps_actual ? parseInt(form.steps_actual) : null,
          energy_level: form.energy_level ? parseInt(form.energy_level) : null,
        })
        .eq('id', checkIn.id);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['daily-check-ins'] });

      toast({
        title: 'הצלחה',
        description: 'הדיווח עודכן בהצלחה',
      });

      setIsEditing(false);
      onClose();
    } catch (error: any) {
      console.error('Error saving check-in:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון הדיווח',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!checkIn) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} dir="rtl">
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>פרטי דיווח יומי</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in_date">תאריך</Label>
              <Input
                id="check_in_date"
                type="date"
                value={form.check_in_date}
                onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                disabled={!isEditing}
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">משקל (ק"ג)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                disabled={!isEditing}
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories_daily">קלוריות</Label>
              <Input
                id="calories_daily"
                type="number"
                value={form.calories_daily}
                onChange={(e) => setForm({ ...form, calories_daily: e.target.value })}
                disabled={!isEditing}
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein_daily">חלבון (גרם)</Label>
              <Input
                id="protein_daily"
                type="number"
                value={form.protein_daily}
                onChange={(e) => setForm({ ...form, protein_daily: e.target.value })}
                disabled={!isEditing}
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiber_daily">סיבים (גרם)</Label>
              <Input
                id="fiber_daily"
                type="number"
                value={form.fiber_daily}
                onChange={(e) => setForm({ ...form, fiber_daily: e.target.value })}
                disabled={!isEditing}
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="steps_actual">צעדים</Label>
              <Input
                id="steps_actual"
                type="number"
                value={form.steps_actual}
                onChange={(e) => setForm({ ...form, steps_actual: e.target.value })}
                disabled={!isEditing}
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="energy_level">רמת אנרגיה (1-10)</Label>
              <Input
                id="energy_level"
                type="number"
                min="1"
                max="10"
                value={form.energy_level}
                onChange={(e) => setForm({ ...form, energy_level: e.target.value })}
                disabled={!isEditing}
                className="bg-slate-50"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          {!isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                סגור
              </Button>
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
              >
                ערוך
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset form
                  if (checkIn) {
                    setForm({
                      check_in_date: checkIn.check_in_date || '',
                      weight: checkIn.weight?.toString() || '',
                      calories_daily: checkIn.calories_daily?.toString() || '',
                      protein_daily: checkIn.protein_daily?.toString() || '',
                      fiber_daily: checkIn.fiber_daily?.toString() || '',
                      steps_actual: checkIn.steps_actual?.toString() || '',
                      energy_level: checkIn.energy_level?.toString() || '',
                    });
                  }
                }}
                disabled={isSaving}
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    שמור שינויים
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

