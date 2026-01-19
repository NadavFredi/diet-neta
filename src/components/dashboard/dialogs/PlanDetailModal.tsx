/**
 * PlanDetailModal Component
 * 
 * Universal modal for viewing and editing plan details (workout, nutrition, supplements)
 * Changes only affect the user/lead plan, not the budget template
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

interface WorkoutPlanData {
  id?: string;
  startDate?: string;
  description?: string;
  strength?: number;
  cardio?: number;
  intervals?: number;
  budget_id?: string;
  created_at?: string;
}

interface NutritionPlanData {
  id?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  targets?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  budget_id?: string;
  created_at?: string;
}

interface SupplementPlanData {
  id?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  supplements?: string[];
  budget_id?: string;
  created_at?: string;
}

type PlanData = WorkoutPlanData | NutritionPlanData | SupplementPlanData;

interface PlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'workout' | 'nutrition' | 'supplements';
  planData: PlanData | null;
  leadId?: string | null;
  customerId?: string | null;
}

export const PlanDetailModal = ({
  isOpen,
  onClose,
  planType,
  planData,
  leadId,
  customerId,
}: PlanDetailModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state based on plan type
  const [workoutForm, setWorkoutForm] = useState({
    startDate: '',
    description: '',
    strength: 0,
    cardio: 0,
    intervals: 0,
  });

  const [nutritionForm, setNutritionForm] = useState({
    startDate: '',
    endDate: '',
    description: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  });

  const [supplementForm, setSupplementForm] = useState({
    startDate: '',
    endDate: '',
    description: '',
    supplements: [] as string[],
    newSupplement: '',
  });

  // Helper to convert date string to YYYY-MM-DD format for input
  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      // Try parsing and formatting
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      // If it's in DD/MM/YYYY format, convert it
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Initialize form when planData changes
  useEffect(() => {
    if (planData) {
      if (planType === 'workout') {
        const data = planData as WorkoutPlanData;
        setWorkoutForm({
          startDate: formatDateForInput(data.startDate),
          description: data.description || '',
          strength: data.strength || 0,
          cardio: data.cardio || 0,
          intervals: data.intervals || 0,
        });
      } else if (planType === 'nutrition') {
        const data = planData as NutritionPlanData;
        setNutritionForm({
          startDate: formatDateForInput(data.startDate),
          endDate: formatDateForInput(data.endDate),
          description: data.description || '',
          calories: data.targets?.calories || 0,
          protein: data.targets?.protein || 0,
          carbs: data.targets?.carbs || 0,
          fat: data.targets?.fat || 0,
          fiber: data.targets?.fiber || 0,
        });
      } else if (planType === 'supplements') {
        const data = planData as SupplementPlanData;
        setSupplementForm({
          startDate: formatDateForInput(data.startDate),
          endDate: formatDateForInput(data.endDate),
          description: data.description || '',
          supplements: data.supplements || [],
          newSupplement: '',
        });
      }
      setIsEditing(false);
    }
  }, [planData, planType]);

  const handleSave = async () => {
    if (!planData?.id) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא מזהה תוכנית',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (planType === 'workout') {
        await supabase
          .from('workout_plans')
          .update({
            start_date: workoutForm.startDate,
            description: workoutForm.description,
            strength: workoutForm.strength,
            cardio: workoutForm.cardio,
            intervals: workoutForm.intervals,
          })
          .eq('id', planData.id);
      } else if (planType === 'nutrition') {
        await supabase
          .from('nutrition_plans')
          .update({
            start_date: nutritionForm.startDate,
            end_date: nutritionForm.endDate || null,
            description: nutritionForm.description,
            targets: {
              calories: nutritionForm.calories,
              protein: nutritionForm.protein,
              carbs: nutritionForm.carbs,
              fat: nutritionForm.fat,
              fiber: nutritionForm.fiber,
            },
          })
          .eq('id', planData.id);
      } else if (planType === 'supplements') {
        await supabase
          .from('supplement_plans')
          .update({
            start_date: supplementForm.startDate,
            end_date: supplementForm.endDate || null,
            description: supplementForm.description,
            supplements: supplementForm.supplements,
          })
          .eq('id', planData.id);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['plans-history'] });
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
      queryClient.invalidateQueries({ queryKey: ['supplementPlan'] });

      toast({
        title: 'הצלחה',
        description: 'התוכנית עודכנה בהצלחה',
      });

      setIsEditing(false);
      onClose();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון התוכנית',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSupplement = () => {
    if (supplementForm.newSupplement.trim()) {
      setSupplementForm({
        ...supplementForm,
        supplements: [...supplementForm.supplements, supplementForm.newSupplement.trim()],
        newSupplement: '',
      });
    }
  };

  const handleRemoveSupplement = (index: number) => {
    setSupplementForm({
      ...supplementForm,
      supplements: supplementForm.supplements.filter((_, i) => i !== index),
    });
  };

  if (!planData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} dir="rtl">
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {planType === 'workout' && 'פרטי תוכנית אימונים'}
            {planType === 'nutrition' && 'פרטי תוכנית תזונה'}
            {planType === 'supplements' && 'פרטי תוכנית תוספים'}
          </DialogTitle>
          <DialogDescription>
            {planData.budget_id && (
              <Badge variant="outline" className="mt-2">
                קשור לתקציב
              </Badge>
            )}
            {planData.created_at && (
              <span className="text-xs text-gray-500 block mt-2">
                נוצר ב: {formatDate(planData.created_at)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {planType === 'workout' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">תאריך התחלה</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={workoutForm.startDate}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, startDate: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Input
                    id="description"
                    value={workoutForm.description}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, description: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="strength">כוח</Label>
                  <Input
                    id="strength"
                    type="number"
                    value={workoutForm.strength}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, strength: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardio">קרדיו</Label>
                  <Input
                    id="cardio"
                    type="number"
                    value={workoutForm.cardio}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, cardio: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervals">אינטרוולים</Label>
                  <Input
                    id="intervals"
                    type="number"
                    value={workoutForm.intervals}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, intervals: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
              </div>
            </>
          )}

          {planType === 'nutrition' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">תאריך התחלה</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={nutritionForm.startDate}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, startDate: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">תאריך סיום</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={nutritionForm.endDate}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, endDate: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  value={nutritionForm.description}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, description: e.target.value })}
                  disabled={!isEditing}
                  className="bg-slate-50"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">קלוריות</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={nutritionForm.calories}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, calories: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">חלבון (גרם)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={nutritionForm.protein}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, protein: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">פחמימות (גרם)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={nutritionForm.carbs}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, carbs: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">שומן (גרם)</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={nutritionForm.fat}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, fat: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiber">סיבים (גרם)</Label>
                  <Input
                    id="fiber"
                    type="number"
                    value={nutritionForm.fiber}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, fiber: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
              </div>
            </>
          )}

          {planType === 'supplements' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">תאריך התחלה</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={supplementForm.startDate}
                    onChange={(e) => setSupplementForm({ ...supplementForm, startDate: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">תאריך סיום</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={supplementForm.endDate}
                    onChange={(e) => setSupplementForm({ ...supplementForm, endDate: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  value={supplementForm.description}
                  onChange={(e) => setSupplementForm({ ...supplementForm, description: e.target.value })}
                  disabled={!isEditing}
                  className="bg-slate-50"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>תוספים</Label>
                <div className="flex gap-2">
                  <Input
                    value={supplementForm.newSupplement}
                    onChange={(e) => setSupplementForm({ ...supplementForm, newSupplement: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSupplement()}
                    disabled={!isEditing}
                    placeholder="הוסף תוסף חדש"
                    className="bg-slate-50"
                  />
                  {isEditing && (
                    <Button type="button" onClick={handleAddSupplement} size="sm">
                      הוסף
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {supplementForm.supplements.map((sup, index) => (
                    <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {sup}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSupplement(index)}
                          className="mr-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
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
                  // Reset form to original values
                  if (planData) {
                    if (planType === 'workout') {
                      const data = planData as WorkoutPlanData;
                      setWorkoutForm({
                        startDate: formatDateForInput(data.startDate),
                        description: data.description || '',
                        strength: data.strength || 0,
                        cardio: data.cardio || 0,
                        intervals: data.intervals || 0,
                      });
                    } else if (planType === 'nutrition') {
                      const data = planData as NutritionPlanData;
                      setNutritionForm({
                        startDate: formatDateForInput(data.startDate),
                        endDate: formatDateForInput(data.endDate),
                        description: data.description || '',
                        calories: data.targets?.calories || 0,
                        protein: data.targets?.protein || 0,
                        carbs: data.targets?.carbs || 0,
                        fat: data.targets?.fat || 0,
                        fiber: data.targets?.fiber || 0,
                      });
                    } else if (planType === 'supplements') {
                      const data = planData as SupplementPlanData;
                      setSupplementForm({
                        startDate: formatDateForInput(data.startDate),
                        endDate: formatDateForInput(data.endDate),
                        description: data.description || '',
                        supplements: data.supplements || [],
                        newSupplement: '',
                      });
                    }
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

