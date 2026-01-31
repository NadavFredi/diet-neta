/**
 * PlanDetailModal Component
 * 
 * Universal modal for viewing and editing plan details (workout, nutrition, supplements)
 * Changes only affect the user/lead plan, not the budget template
 */

import { useState, useEffect, useMemo, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Trash2, Plus, Edit2 } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import type { Supplement } from '@/store/slices/budgetSlice';
import { useSupplementTemplates, useCreateSupplementTemplate } from '@/hooks/useSupplementTemplates';
import { AddSupplementDialog } from './AddSupplementDialog';

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
  supplements?: Supplement[] | string[]; // Support both formats for backward compatibility
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
  const [isAddSupplementDialogOpen, setIsAddSupplementDialogOpen] = useState(false);
  const [editingSupplementIndex, setEditingSupplementIndex] = useState<number | null>(null);

  // Track which plan we last initialized form from, so we don't overwrite in-modal edits
  // when parent re-renders and passes a new planData object reference.
  const lastInitializedPlanIdRef = useRef<string | null>(null);

  // Fetch supplement templates to get the list of available supplements
  const { data: supplementTemplatesData, refetch: refetchSupplementTemplates } = useSupplementTemplates();
  const supplementTemplates = supplementTemplatesData?.data || [];
  const createSupplementTemplate = useCreateSupplementTemplate();

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
    supplements: [] as Supplement[],
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

  // Reset "last initialized" when modal closes so next open re-initializes
  useEffect(() => {
    if (!isOpen) {
      lastInitializedPlanIdRef.current = null;
    }
  }, [isOpen]);

  // Initialize form only when modal opens or when a different plan is selected.
  // Do not re-initialize on every planData reference change (e.g. parent re-render),
  // so in-modal edits are not overwritten.
  useEffect(() => {
    if (!isOpen || !planData) return;

    const planId = planData.id ?? null;
    if (planId != null && lastInitializedPlanIdRef.current === planId) return;
    lastInitializedPlanIdRef.current = planId;

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
      // Handle backward compatibility: convert string[] to Supplement[]
      let supplements: Supplement[] = [];
      if (data.supplements) {
        if (Array.isArray(data.supplements) && data.supplements.length > 0) {
          if (typeof data.supplements[0] === 'string') {
            // Old format: string[]
            supplements = (data.supplements as string[]).map(name => ({
              name: name,
              dosage: '',
              timing: '',
            }));
          } else {
            // New format: Supplement[]
            supplements = data.supplements as Supplement[];
          }
        }
      }
      setSupplementForm({
        startDate: formatDateForInput(data.startDate),
        endDate: formatDateForInput(data.endDate),
        description: data.description || '',
        supplements: supplements,
      });
    }
    // Supplements modal is always editable; workout/nutrition use edit toggle
    if (planType !== 'supplements') {
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [isOpen, planData, planType]);

  const handleSave = async (overrideSupplements?: Supplement[], closeOnSuccess = true) => {
    if (!planData?.id) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא מזהה תוכנית',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    if (planType === 'workout' && !workoutForm.startDate) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין תאריך התחלה',
        variant: 'destructive',
      });
      return;
    }

    if (planType === 'nutrition' && !nutritionForm.startDate) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין תאריך התחלה',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (planType === 'workout') {
        const { error } = await supabase
          .from('workout_plans')
          .update({
            start_date: workoutForm.startDate,
            description: workoutForm.description,
            strength: workoutForm.strength,
            cardio: workoutForm.cardio,
            intervals: workoutForm.intervals,
          })
          .eq('id', planData.id);
        if (error) throw error;
      } else if (planType === 'nutrition') {
        const { error } = await supabase
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
        if (error) throw error;
      } else if (planType === 'supplements') {
        const list = overrideSupplements ?? supplementForm.supplements;
        const validSupplements = list.filter((s) => s?.name?.trim() !== '');
        // Use form state values, fallback to original planData if form values are empty
        // start_date is required, so preserve original if form value is empty
        const supplementData = planData as SupplementPlanData;
        const startDate = supplementForm.startDate || supplementData.startDate;
        const endDate = supplementForm.endDate || supplementData.endDate || null;
        const description = supplementForm.description || supplementData.description || null;
        
        // Ensure supplements array is properly formatted
        const formattedSupplements = validSupplements.map(s => ({
          name: s.name || '',
          dosage: s.dosage || '',
          timing: s.timing || '',
          ...(s.link1 && { link1: s.link1 }),
          ...(s.link2 && { link2: s.link2 }),
        }));
        
        const { error } = await supabase
          .from('supplement_plans')
          .update({
            start_date: startDate,
            end_date: endDate,
            description: description,
            supplements: formattedSupplements,
          })
          .eq('id', planData.id);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['plans-history'] });
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
      queryClient.invalidateQueries({ queryKey: ['supplementPlan'] });
      // Refetch plans-history so the list (supplement plans) updates with new/edited items
      await queryClient.refetchQueries({ queryKey: ['plans-history', customerId ?? undefined, leadId ?? undefined] });
      if (planData.budget_id) {
        queryClient.invalidateQueries({ queryKey: ['budget-history', planData.budget_id] });
        await queryClient.refetchQueries({ queryKey: ['budget-history', planData.budget_id] });
      }

      if (closeOnSuccess) {
        toast({
          title: 'הצלחה',
          description: 'התוכנית עודכנה בהצלחה',
        });
        setIsEditing(false);
        onClose();
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || error?.error?.message || 'נכשל בעדכון התוכנית',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };


  const handleRemoveSupplement = (index: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setSupplementForm((prev) => ({
      ...prev,
      supplements: prev.supplements.filter((_, i) => i !== index),
    }));
  };

  const handleSupplementFieldChange = (index: number, field: 'name' | 'dosage' | 'timing', value: string) => {
    setSupplementForm((prev) => {
      const next = [...prev.supplements];
      if (!next[index]) return prev;
      // Preserve existing supplement data including optional fields (link1, link2)
      next[index] = { 
        ...next[index], 
        [field]: value 
      };
      return { ...prev, supplements: next };
    });
  };

  const handleEditSupplement = (index: number) => {
    setEditingSupplementIndex(index);
    setIsAddSupplementDialogOpen(true);
  };

  const handleSaveSupplement = async (supplement: Supplement) => {
    const idx = editingSupplementIndex;
    const nextSupplements: Supplement[] =
      idx !== null
        ? (() => {
            const updated = [...supplementForm.supplements];
            if (updated[idx]) updated[idx] = supplement;
            return updated;
          })()
        : [...supplementForm.supplements, supplement];

    setSupplementForm((prev) => {
      if (idx !== null) {
        const updated = [...prev.supplements];
        if (updated[idx]) updated[idx] = supplement;
        return { ...prev, supplements: updated };
      }
      return { ...prev, supplements: [...prev.supplements, supplement] };
    });
    setEditingSupplementIndex(null);

    if (planType === 'supplements' && planData?.id) {
      await handleSave(nextSupplements, false);
    }
    setIsAddSupplementDialogOpen(false);
  };

  if (!planData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} dir="rtl">
      <DialogContent className="min-w-[1000px] max-w-7xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {planType === 'workout' && 'פרטי תוכנית אימונים'}
            {planType === 'nutrition' && 'פרטי תוכנית תזונה'}
            {planType === 'supplements' && 'פרטי תוכנית תוספים'}
          </DialogTitle>
          <div className="text-sm text-muted-foreground space-y-2">
            {planData.budget_id && (
              <Badge variant="outline" className="block w-fit">
                קשור לתכנית פעולה
              </Badge>
            )}
            {planData.created_at && (
              <DialogDescription className="text-xs text-gray-500">
                נוצר ב: {formatDate(planData.created_at)}
              </DialogDescription>
            )}
          </div>
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
              <div className="space-y-2">
                <Label>תוספים</Label>
                {supplementForm.supplements.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">אין תוספים</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSupplementIndex(null);
                        setIsAddSupplementDialogOpen(true);
                      }}
                      className="text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      הוסף תוסף
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplementForm.supplements.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 px-3 py-1 text-xs font-medium text-slate-500 border-b border-slate-100 pr-14">
                        <span>שם</span>
                        <span>מינון</span>
                        <span>זמן נטילה</span>
                      </div>
                    )}
                    {supplementForm.supplements.map((supplement, index) => (
                      <div key={index} className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={supplement.name || ''}
                            onChange={(e) => handleSupplementFieldChange(index, 'name', e.target.value)}
                            placeholder="שם התוסף"
                            className="bg-white text-sm h-9"
                            dir="rtl"
                          />
                          <Input
                            value={supplement.dosage || ''}
                            onChange={(e) => handleSupplementFieldChange(index, 'dosage', e.target.value)}
                            placeholder="מינון"
                            className="bg-white text-sm h-9"
                            dir="rtl"
                          />
                          <Input
                            value={supplement.timing || ''}
                            onChange={(e) => handleSupplementFieldChange(index, 'timing', e.target.value)}
                            placeholder="זמן נטילה"
                            className="bg-white text-sm h-9"
                            dir="rtl"
                          />
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSupplement(index)}
                            className="h-8 w-8 text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                            title="ערוך תוסף (קישורים וכו')"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveSupplement(index, e);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="מחק תוסף"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSupplementIndex(null);
                        setIsAddSupplementDialogOpen(true);
                      }}
                      className="w-full text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      הוסף תוסף נוסף
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Supplement Dialog */}
        <AddSupplementDialog
          isOpen={isAddSupplementDialogOpen}
          onOpenChange={(open) => {
            setIsAddSupplementDialogOpen(open);
            if (!open) {
              setEditingSupplementIndex(null);
            }
          }}
          onSave={handleSaveSupplement}
          initialData={editingSupplementIndex !== null ? supplementForm.supplements[editingSupplementIndex] : null}
          supplementTemplates={supplementTemplates}
          successToastDescription={planType === 'supplements' ? 'התוסף נוסף ונשמר' : undefined}
        />

        <div className="flex  gap-3 pt-4 border-t">
          {planType === 'supplements' ? (
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
                onClick={() => handleSave()}
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
                    שמור
                  </>
                )}
              </Button>
            </>
          ) : !isEditing ? (
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
                    }
                  }
                }}
                disabled={isSaving}
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={() => handleSave()}
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

