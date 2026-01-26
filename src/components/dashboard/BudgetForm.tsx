/**
 * BudgetForm Component
 * 
 * Premium Luxury Budget Configurator - Apple/Stripe Aesthetic
 * Bento-style layout with world-class UI/UX
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Dumbbell, Apple, Pill, Footprints, Edit2, ChevronDown, Check, ChevronsUpDown, Heart } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNutritionTemplates, useNutritionTemplate } from '@/hooks/useNutritionTemplates';
import { useWorkoutTemplates, useWorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { useSupplementTemplates } from '@/hooks/useSupplementTemplates';
import { useNavigate } from 'react-router-dom';
import type { Budget, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';
import type { BudgetWithTemplates } from '@/hooks/useBudgets';
import { cn } from '@/lib/utils';
import { AddWorkoutTemplateDialog } from '@/components/dashboard/dialogs/AddWorkoutTemplateDialog';
import { AddNutritionTemplateDialog } from '@/components/dashboard/dialogs/AddNutritionTemplateDialog';
import { EditWorkoutTemplateDialog } from '@/components/dashboard/dialogs/EditWorkoutTemplateDialog';
import { EditNutritionTemplateDialog } from '@/components/dashboard/dialogs/EditNutritionTemplateDialog';
import { AddSupplementDialog } from '@/components/dashboard/dialogs/AddSupplementDialog';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCreateWorkoutTemplate, useUpdateWorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { useCreateNutritionTemplate, useUpdateNutritionTemplate } from '@/hooks/useNutritionTemplates';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/store/hooks';

interface BudgetFormProps {
  mode: 'create' | 'edit';
  initialData?: Budget | BudgetWithTemplates | null;
  onSave: (data: any) => Promise<Budget | void> | void;
  onCancel: () => void;
  enableAssignment?: boolean; // Deprecated: kept for backwards compatibility, always allows lead assignment
}

// Macro Split Bar Component
const MacroSplitBar = ({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) => {
  const totalCalories = protein * 4 + carbs * 4 + fat * 9;

  if (totalCalories === 0) {
    return (
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-200" />
      </div>
    );
  }

  const proteinPercent = Math.round((protein * 4 / totalCalories) * 100);
  const carbsPercent = Math.round((carbs * 4 / totalCalories) * 100);
  const fatPercent = Math.round((fat * 9 / totalCalories) * 100);

  return (
    <div className="space-y-2">
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${proteinPercent}%` }}
        />
        <div
          className="bg-green-500 transition-all duration-300"
          style={{ width: `${carbsPercent}%` }}
        />
        <div
          className="bg-amber-500 transition-all duration-300"
          style={{ width: `${fatPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500" dir="rtl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>שומן {fatPercent}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>פחמימות {carbsPercent}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>חלבון {proteinPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SupplementRowProps {
  index: number;
  supplement: Supplement;
  templates: any[];
  onUpdate: (index: number, field: keyof Supplement, value: string) => void;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
}

const SupplementRow = ({ index, supplement, templates, onUpdate, onRemove, onEdit }: SupplementRowProps) => {
  return (
    <div className="flex gap-2 items-start p-2 bg-slate-50 rounded-lg">
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-1">
            <span className="text-xs text-slate-500">שם תוסף</span>
            <div className="text-xs font-medium text-slate-900">{supplement.name || '-'}</div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-500">מינון</span>
            <div className="text-xs font-medium text-slate-900">{supplement.dosage || '-'}</div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-500">זמן נטילה</span>
            <div className="text-xs font-medium text-slate-900">{supplement.timing || '-'}</div>
          </div>
        </div>
        {(supplement.link1 || supplement.link2) && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {supplement.link1 && (
              <div className="space-y-1">
                <span className="text-xs text-slate-500">קישור 1</span>
                <a
                  href={supplement.link1}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline truncate block"
                  dir="ltr"
                >
                  {supplement.link1}
                </a>
              </div>
            )}
            {supplement.link2 && (
              <div className="space-y-1">
                <span className="text-xs text-slate-500">קישור 2</span>
                <a
                  href={supplement.link2}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline truncate block"
                  dir="ltr"
                >
                  {supplement.link2}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onEdit(index)}
          className="h-8 w-8 text-slate-400 hover:text-[#5B6FB9] hover:bg-[#5B6FB9]/10"
          title="ערוך תוסף"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
          title="מחק תוסף"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

interface WorkoutRowProps {
  workout: {
    id: string;
    name: string;
    type: string; // 'erobi' or 'intervals'
    duration_minutes: number;
    workouts_per_week: number;
    period_type?: string; // 'לשבוע' or 'ליום'
    notes: string;
  };
  onUpdate: (id: string, field: string, value: string | number) => void;
  onRemove: (id: string) => void;
}

const WorkoutRow = ({ workout, onUpdate, onRemove }: WorkoutRowProps) => {
  return (
    <div className="flex gap-2 items-start p-2 bg-slate-50 rounded-lg">
      <div className="flex-1 grid grid-cols-5 gap-1.5">
        <Select
          value={workout.type || 'erobi'}
          onValueChange={(value) => onUpdate(workout.id, 'type', value)}
        >
          <SelectTrigger className="h-8 bg-white border-0 text-xs justify-between" dir="rtl">
            <SelectValue>{workout.type === 'intervals' ? 'אינטרוולים' : 'אירובי'}</SelectValue>
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="erobi">אירובי</SelectItem>
            <SelectItem value="intervals">אינטרוולים</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={workout.name}
          onChange={(e) => onUpdate(workout.id, 'name', e.target.value)}
          placeholder="שם האימון"
          className="h-8 bg-white border-0 text-xs"
          dir="rtl"
        />
        <Input
          type="number"
          min="0"
          value={workout.duration_minutes || ''}
          onChange={(e) => onUpdate(workout.id, 'duration_minutes', parseInt(e.target.value) || 0)}
          placeholder="דקות"
          className="h-8 bg-white border-0 text-xs"
          dir="ltr"
        />
        <Select
          value={workout.period_type || 'לשבוע'}
          onValueChange={(value) => onUpdate(workout.id, 'period_type', value)}
        >
          <SelectTrigger className="h-8 bg-white border-0 text-xs justify-between" dir="rtl">
            <SelectValue>{workout.period_type || 'לשבוע'}</SelectValue>
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="לשבוע">לשבוע</SelectItem>
            <SelectItem value="ליום">ליום</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={workout.notes}
          onChange={(e) => onUpdate(workout.id, 'notes', e.target.value)}
          placeholder="הנחיות"
          className="h-8 bg-white border-0 text-xs"
          dir="rtl"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(workout.id)}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export const BudgetForm = ({ mode, initialData, onSave, onCancel, enableAssignment = false }: BudgetFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);

  // Only managers/admins can edit templates
  const canEditTemplates = user?.role === 'admin' || user?.role === 'user';

  const { data: nutritionTemplatesData } = useNutritionTemplates();
  const { data: workoutTemplatesData } = useWorkoutTemplates();
  const { data: supplementTemplatesData } = useSupplementTemplates();
  const nutritionTemplates = nutritionTemplatesData?.data || [];
  const workoutTemplates = workoutTemplatesData?.data || [];
  const supplementTemplates = supplementTemplatesData?.data || [];

  // Fetch full template data for linked templates when editing (in case they're not in paginated list)
  const linkedNutritionTemplateId = (initialData as BudgetWithTemplates | undefined)?.nutrition_template_id;
  const linkedWorkoutTemplateId = (initialData as BudgetWithTemplates | undefined)?.workout_template_id;
  const { data: linkedNutritionTemplate } = useNutritionTemplate(
    linkedNutritionTemplateId && !nutritionTemplates.some(t => t.id === linkedNutritionTemplateId)
      ? linkedNutritionTemplateId
      : null
  );
  const { data: linkedWorkoutTemplate } = useWorkoutTemplate(
    linkedWorkoutTemplateId && !workoutTemplates.some(t => t.id === linkedWorkoutTemplateId)
      ? linkedWorkoutTemplateId
      : null
  );
  const createWorkoutTemplate = useCreateWorkoutTemplate();
  const createNutritionTemplate = useCreateNutritionTemplate();
  const updateWorkoutTemplate = useUpdateWorkoutTemplate();
  const updateNutritionTemplate = useUpdateNutritionTemplate();

  // Template creation/editing dialog states
  const [isWorkoutTemplateDialogOpen, setIsWorkoutTemplateDialogOpen] = useState(false);
  const [isNutritionTemplateDialogOpen, setIsNutritionTemplateDialogOpen] = useState(false);
  const [isEditWorkoutTemplateDialogOpen, setIsEditWorkoutTemplateDialogOpen] = useState(false);
  const [isEditNutritionTemplateDialogOpen, setIsEditNutritionTemplateDialogOpen] = useState(false);
  const [editingWorkoutTemplate, setEditingWorkoutTemplate] = useState<any>(null);
  const [editingNutritionTemplate, setEditingNutritionTemplate] = useState<any>(null);

  // Supplement dialog state
  const [isAddSupplementDialogOpen, setIsAddSupplementDialogOpen] = useState(false);
  const [editingSupplementIndex, setEditingSupplementIndex] = useState<number | null>(null);


  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Nutrition
  const [nutritionTemplateId, setNutritionTemplateId] = useState<string | null>(null);
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber_min: 20,
  });

  // Steps
  const [stepsGoal, setStepsGoal] = useState(0);
  const [stepsInstructions, setStepsInstructions] = useState('');

  // Workout
  const [workoutTemplateId, setWorkoutTemplateId] = useState<string | null>(null);

  // Supplements
  const [supplementTemplateId, setSupplementTemplateId] = useState<string | null>(null);
  const [supplements, setSupplements] = useState<Supplement[]>([]);

  // Guidelines
  const [eatingOrder, setEatingOrder] = useState('');
  const [eatingRules, setEatingRules] = useState('');

  // Unified Workout Training - Array of workouts (erobi or intervals)
  const [workoutTrainings, setWorkoutTrainings] = useState<Array<{
    id: string;
    name: string;
    type: string; // 'erobi' or 'intervals'
    duration_minutes: number;
    workouts_per_week: number;
    period_type?: string; // 'לשבוע' or 'ליום'
    notes: string;
  }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setNutritionTemplateId(initialData.nutrition_template_id ?? null);
      setNutritionTargets(initialData.nutrition_targets || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber_min: 20,
      });
      setStepsGoal(initialData.steps_goal || 0);
      setStepsInstructions(initialData.steps_instructions || '');
      setWorkoutTemplateId(initialData.workout_template_id ?? null);
      setSupplementTemplateId(initialData.supplement_template_id ?? null);
      setSupplements(initialData.supplements || []);
      setEatingOrder(initialData.eating_order || '');
      setEatingRules(initialData.eating_rules || '');

      // Initialize unified workout trainings array (combining cardio and interval)
      const cardioData = initialData.cardio_training;
      const intervalData = initialData.interval_training;
      const allWorkouts: Array<{
        id: string;
        name: string;
        type: string;
        duration_minutes: number;
        workouts_per_week: number;
        period_type?: string;
        notes: string;
      }> = [];

      if (Array.isArray(cardioData) && cardioData.length > 0) {
        cardioData.forEach((item, index) => {
          allWorkouts.push({
            id: item.id || `workout-${Date.now()}-${index}`,
            name: item.name || '',
            type: 'erobi', // Set type to 'erobi' for cardio
            duration_minutes: item.duration_minutes || 0,
            workouts_per_week: 1,
            period_type: (item as any).period_type || 'לשבוע',
            notes: item.notes || '',
          });
        });
      }

      if (Array.isArray(intervalData) && intervalData.length > 0) {
        intervalData.forEach((item, index) => {
          allWorkouts.push({
            id: item.id || `workout-${Date.now()}-${index + (cardioData?.length || 0)}`,
            name: item.name || '',
            type: 'intervals', // Set type to 'intervals' for interval training
            duration_minutes: item.duration_minutes || 0,
            workouts_per_week: 1,
            period_type: (item as any).period_type || 'לשבוע',
            notes: item.notes || '',
          });
        });
      }

      setWorkoutTrainings(allWorkouts);
    }
  }, [initialData]);

  // Merge dropdown options with budget's linked templates (from useBudget join) so connected
  // plans always appear even if not in the paginated templates list
  const workoutOptions = useMemo((): Array<{ id: string; name: string }> => {
    const list: Array<{ id: string; name: string }> = (workoutTemplates || []).map((t) => ({ id: t.id, name: t.name }));
    const b = initialData as BudgetWithTemplates | undefined;
    // Ensure linked template appears in options even if not in paginated list
    if (b?.workout_template_id) {
      const existing = list.find((t) => t.id === b.workout_template_id);
      if (!existing) {
        // Try to get template from joined data, fetched template, or create placeholder
        if (b?.workout_template) {
          list.unshift({ id: b.workout_template.id, name: b.workout_template.name });
        } else if (linkedWorkoutTemplate) {
          list.unshift({ id: linkedWorkoutTemplate.id, name: linkedWorkoutTemplate.name });
        } else {
          // Template ID exists but object not loaded - add placeholder
          list.unshift({ id: b.workout_template_id, name: `תבנית אימונים (${b.workout_template_id.slice(0, 8)}...)` });
        }
      }
    }
    return list;
  }, [workoutTemplates, initialData, linkedWorkoutTemplate]);

  const nutritionOptions = useMemo((): Array<{ id: string; name: string }> => {
    const list: Array<{ id: string; name: string }> = (nutritionTemplates || []).map((t) => ({ id: t.id, name: t.name }));
    const b = initialData as BudgetWithTemplates | undefined;
    // Ensure linked template appears in options even if not in paginated list
    if (b?.nutrition_template_id) {
      const existing = list.find((t) => t.id === b.nutrition_template_id);
      if (!existing) {
        // Try to get template from joined data, fetched template, or create placeholder
        if (b?.nutrition_template) {
          list.unshift({ id: b.nutrition_template.id, name: b.nutrition_template.name });
        } else if (linkedNutritionTemplate) {
          list.unshift({ id: linkedNutritionTemplate.id, name: linkedNutritionTemplate.name });
        } else {
          // Template ID exists but object not loaded - add placeholder
          list.unshift({ id: b.nutrition_template_id, name: `תבנית תזונה (${b.nutrition_template_id.slice(0, 8)}...)` });
        }
      }
    }
    return list;
  }, [nutritionTemplates, initialData, linkedNutritionTemplate]);

  // Handle nutrition template selection
  const handleNutritionTemplateChange = (templateId: string) => {
    if (templateId === 'none') {
      setNutritionTemplateId(null);
      setNutritionTargets({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber_min: 20,
      });
    } else {
      setNutritionTemplateId(templateId);
      // Try to find template in the templates list first
      let template = nutritionTemplates.find((t) => t.id === templateId);

      // If not found, check if it's the linked template from initialData
      if (!template) {
        const b = initialData as BudgetWithTemplates | undefined;
        if (b?.nutrition_template_id === templateId && b?.nutrition_template) {
          // For linked templates, we need to fetch the full template data to get targets
          // For now, keep existing targets if they were set from initialData
          // The targets should already be set from initialData.nutrition_targets
          return;
        }
      }

      if (template?.targets) {
        setNutritionTargets({
          calories: template.targets.calories || 0,
          protein: template.targets.protein || 0,
          carbs: template.targets.carbs || 0,
          fat: template.targets.fat || 0,
          fiber_min: template.targets.fiber || 20,
        });
      }
    }
  };


  // Supplements management
  const addSupplement = () => {
    setEditingSupplementIndex(null);
    setIsAddSupplementDialogOpen(true);
  };

  const handleSaveSupplement = (supplement: Supplement) => {
    if (editingSupplementIndex !== null) {
      // Update existing supplement
      const updated = [...supplements];
      updated[editingSupplementIndex] = supplement;
      setSupplements(updated);
    } else {
      // Add new supplement
      setSupplements([...supplements, supplement]);
    }
    setIsAddSupplementDialogOpen(false);
    setEditingSupplementIndex(null);
  };

  const handleEditSupplement = (index: number) => {
    setEditingSupplementIndex(index);
    setIsAddSupplementDialogOpen(true);
  };

  const removeSupplement = (index: number) => {
    setSupplements(supplements.filter((_, i) => i !== index));
  };

  const updateSupplement = (index: number, field: keyof Supplement, value: string) => {
    const updated = [...supplements];
    updated[index] = { ...updated[index], [field]: value };
    setSupplements(updated);
  };

  // Unified Workout Training management
  const addWorkoutTraining = () => {
    const newWorkout = {
      id: `workout-${Date.now()}-${Math.random()}`,
      name: '',
      type: 'erobi', // Default to 'erobi'
      duration_minutes: 0,
      workouts_per_week: 1,
      period_type: 'לשבוע', // Default to 'לשבוע'
      notes: '',
    };
    setWorkoutTrainings([...workoutTrainings, newWorkout]);
  };

  const removeWorkoutTraining = (id: string) => {
    setWorkoutTrainings(workoutTrainings.filter((item) => item.id !== id));
  };

  const updateWorkoutTraining = (id: string, field: string, value: string | number) => {
    setWorkoutTrainings(workoutTrainings.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    setIsSubmitting(true);

    try {
      const budgetData = {
        name,
        description: description || null,
        nutrition_template_id: nutritionTemplateId || null,
        nutrition_targets: nutritionTargets,
        steps_goal: stepsGoal,
        steps_instructions: stepsInstructions || null,
        workout_template_id: workoutTemplateId || null,
        supplement_template_id: supplementTemplateId || null,
        supplements: supplements.filter((s) => s.name.trim() !== ''),
        eating_order: eatingOrder || null,
        eating_rules: eatingRules || null,
        cardio_training: workoutTrainings.filter((w) => w.type === 'erobi' && (w.name.trim() || w.duration_minutes > 0)).length > 0
          ? workoutTrainings.filter((w) => w.type === 'erobi' && (w.name.trim() || w.duration_minutes > 0)).map((w) => ({
            id: w.id,
            name: w.name,
            type: w.type,
            duration_minutes: w.duration_minutes,
            workouts_per_week: 1, // Always 1 week
            period_type: w.period_type,
            notes: w.notes,
          }))
          : null,
        interval_training: workoutTrainings.filter((w) => w.type === 'intervals' && (w.name.trim() || w.duration_minutes > 0)).length > 0
          ? workoutTrainings.filter((w) => w.type === 'intervals' && (w.name.trim() || w.duration_minutes > 0)).map((w) => ({
            id: w.id,
            name: w.name,
            type: w.type,
            duration_minutes: w.duration_minutes,
            workouts_per_week: 1, // Always 1 week
            period_type: w.period_type,
            notes: w.notes,
          }))
          : null,
      };

      const savedBudget = await onSave(budgetData);

      // Get the budget ID - use initialData.id for edit mode, or savedBudget.id if returned
      const budgetId = (mode === 'edit' && initialData?.id) ? initialData.id : (savedBudget as Budget | undefined)?.id;


    } catch (error) {
      // Silent failure
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle creating new workout template
  const handleCreateWorkoutTemplate = async (data: any) => {
    try {
      const newTemplate = await createWorkoutTemplate.mutateAsync(data);

      // Refresh templates list
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates'] });

      // Auto-select the newly created template
      setWorkoutTemplateId(newTemplate.id);

      // Close dialog
      setIsWorkoutTemplateDialogOpen(false);

      toast({
        title: 'הצלחה',
        description: 'תבנית האימונים נוצרה בהצלחה ונבחרה אוטומטית',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת תבנית האימונים',
        variant: 'destructive',
      });
    }
  };

  // Handle creating new nutrition template
  const handleCreateNutritionTemplate = async (data: any) => {
    try {
      const newTemplate = await createNutritionTemplate.mutateAsync(data);

      // Refresh templates list
      queryClient.invalidateQueries({ queryKey: ['nutritionTemplates'] });

      // Auto-select the newly created template and load its targets
      setNutritionTemplateId(newTemplate.id);

      if (newTemplate.targets) {
        setNutritionTargets({
          calories: newTemplate.targets.calories || 0,
          protein: newTemplate.targets.protein || 0,
          carbs: newTemplate.targets.carbs || 0,
          fat: newTemplate.targets.fat || 0,
          fiber_min: newTemplate.targets.fiber || 20,
        });
      }

      // Close dialog
      setIsNutritionTemplateDialogOpen(false);

      toast({
        title: 'הצלחה',
        description: 'תבנית התזונה נוצרה בהצלחה ונבחרה אוטומטית',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת תבנית התזונה',
        variant: 'destructive',
      });
    }
  };


  // Handle editing workout template
  const handleEditWorkoutTemplate = () => {
    if (!workoutTemplateId) return;
    const template = workoutTemplates.find((t) => t.id === workoutTemplateId);
    if (template) {
      setEditingWorkoutTemplate(template);
      setIsEditWorkoutTemplateDialogOpen(true);
    }
  };

  // Handle saving edited workout template
  const handleUpdateWorkoutTemplate = async (data: any) => {
    if (!editingWorkoutTemplate) return;
    try {
      const updated = await updateWorkoutTemplate.mutateAsync({
        templateId: editingWorkoutTemplate.id,
        ...data,
      });

      // Close only the edit template dialog first, keep budget dialog open
      setIsEditWorkoutTemplateDialogOpen(false);
      setEditingWorkoutTemplate(null);

      // Refresh templates list without closing parent dialog
      // Use refetchQueries instead of invalidateQueries to avoid triggering unnecessary re-renders
      await queryClient.refetchQueries({ queryKey: ['workoutTemplates'] });

      // The template list will refresh automatically, and the Select will show updated name
      // The pencil button will show the updated template data

      toast({
        title: 'הצלחה',
        description: 'תבנית האימונים עודכנה בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון תבנית האימונים',
        variant: 'destructive',
      });
    }
  };

  // Handle editing nutrition template
  const handleEditNutritionTemplate = () => {
    if (!nutritionTemplateId) return;
    const template = nutritionTemplates.find((t) => t.id === nutritionTemplateId);
    if (template) {
      setEditingNutritionTemplate(template);
      setIsEditNutritionTemplateDialogOpen(true);
    }
  };


  // Handle saving edited nutrition template
  const handleUpdateNutritionTemplate = async (data: any) => {
    if (!editingNutritionTemplate) return;
    try {
      const updated = await updateNutritionTemplate.mutateAsync({
        templateId: editingNutritionTemplate.id,
        ...data,
      });

      // Close only the edit template dialog first, keep budget dialog open
      setIsEditNutritionTemplateDialogOpen(false);
      setEditingNutritionTemplate(null);

      // Update nutrition targets if they changed
      if (updated?.targets) {
        setNutritionTargets({
          calories: updated.targets.calories || 0,
          protein: updated.targets.protein || 0,
          carbs: updated.targets.carbs || 0,
          fat: updated.targets.fat || 0,
          fiber_min: updated.targets.fiber || 20,
        });
      }

      // Refresh templates list without closing parent dialog
      // Use refetchQueries instead of invalidateQueries to avoid triggering unnecessary re-renders
      await queryClient.refetchQueries({ queryKey: ['nutritionTemplates'] });

      // The template list will refresh automatically, and the Select will show updated name
      // The pencil button will show the updated template data

      toast({
        title: 'הצלחה',
        description: 'תבנית התזונה עודכנה בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון תבנית התזונה',
        variant: 'destructive',
      });
    }
  };




  return (
    <form onSubmit={handleSubmit} className="space-y-2.5" dir="rtl" style={{ fontFamily: 'Assistant, Heebo, sans-serif' }}>
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Left Column: Basic Info + Eating Guidelines */}
        <div className="flex flex-col gap-2.5">
          {/* Card A: General Identity */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-base font-semibold text-slate-900">מידע בסיסי</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-slate-500">שם תכנית הפעולה *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="לדוגמה: תכנית פעולה 1700 קלוריות"
                  required
                  className={cn(
                    "h-9 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 transition-all",
                    "text-slate-900 font-medium text-sm"
                  )}
                  dir="rtl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium text-slate-500">תיאור</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תיאור קצר של תכנית הפעולה"
                  className={cn(
                    "min-h-[50px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 transition-all resize-none",
                    "text-slate-900 font-medium text-sm"
                  )}
                  dir="rtl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Guidelines Card - Moved here */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-base font-semibold text-slate-900">הנחיות אכילה</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="eating_order" className="text-sm font-medium text-slate-500">סדר האכילה</Label>
                  <Textarea
                    id="eating_order"
                    value={eatingOrder}
                    onChange={(e) => setEatingOrder(e.target.value)}
                    placeholder="לדוגמה: מתחילה בירקות, ממשיכה לחלבון ומסיימת בפחמימה"
                    className={cn(
                      "min-h-[50px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 resize-none",
                      "text-slate-900 font-medium text-sm"
                    )}
                    dir="rtl"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="eating_rules" className="text-sm font-medium text-slate-500">כללי אכילה</Label>
                  <Textarea
                    id="eating_rules"
                    value={eatingRules}
                    onChange={(e) => setEatingRules(e.target.value)}
                    placeholder="לדוגמה: לא תאכלי פחמימה לבדה - עם חלבון, סיבים ושומן"
                    className={cn(
                      "min-h-[50px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 resize-none",
                      "text-slate-900 font-medium text-sm"
                    )}
                    dir="rtl"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Steps Section - Moved to Left Column */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Footprints className="h-4 w-4 text-slate-400" />
                יעד צעדים יומי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-500">יעד צעדים</Label>
                  <Input
                    type="number"
                    value={stepsGoal || ''}
                    onChange={(e) => setStepsGoal(parseInt(e.target.value) || 0)}
                    placeholder="לדוגמה: 7000"
                    className={cn(
                      "h-9 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "text-slate-900 font-medium text-sm"
                    )}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="steps_instructions" className="text-sm font-medium text-slate-500">הוראות צעדים</Label>
                  <Textarea
                    id="steps_instructions"
                    value={stepsInstructions}
                    onChange={(e) => setStepsInstructions(e.target.value)}
                    placeholder="הוראות והנחיות נוספות לגבי הצעדים היומיים"
                    className={cn(
                      "min-h-[50px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 transition-all resize-none",
                      "text-slate-900 font-medium text-sm"
                    )}
                    dir="rtl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card B: Plan Integration (Top Right) */}
        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base font-semibold text-slate-900">אינטגרציית תכניות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Dumbbell className="h-3.5 w-3.5 text-slate-400" />
                תכנית אימונים
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={workoutTemplateId || 'none'}
                  onValueChange={(value) => setWorkoutTemplateId(value === 'none' ? null : value || null)}
                >
                  <SelectTrigger className={cn(
                    "h-9 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 flex-1",
                    "text-slate-900 font-medium text-sm"
                  )} dir="rtl">
                    <SelectValue placeholder="בחר תבנית אימונים" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">ללא תבנית</SelectItem>
                    {workoutOptions.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {workoutTemplateId && canEditTemplates && workoutTemplates.some((t) => t.id === workoutTemplateId) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleEditWorkoutTemplate}
                    className="h-9 w-9 text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10 border border-[#5B6FB9]/20"
                    title="ערוך תבנית אימונים"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsWorkoutTemplateDialogOpen(true)}
                  className="h-9 w-9 text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10 border border-[#5B6FB9]/20"
                  title="צור תבנית אימונים חדשה"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Apple className="h-3.5 w-3.5 text-slate-400" />
                תבנית תזונה
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={nutritionTemplateId || 'none'}
                  onValueChange={handleNutritionTemplateChange}
                >
                  <SelectTrigger className={cn(
                    "h-9 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 flex-1",
                    "text-slate-900 font-medium text-sm"
                  )} dir="rtl">
                    <SelectValue placeholder="בחר תבנית תזונה" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">ללא תבנית</SelectItem>
                    {nutritionOptions.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {nutritionTemplateId && canEditTemplates && nutritionTemplates.some((t) => t.id === nutritionTemplateId) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleEditNutritionTemplate}
                    className="h-9 w-9 text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10 border border-[#5B6FB9]/20"
                    title="ערוך תבנית תזונה"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNutritionTemplateDialogOpen(true)}
                  className="h-9 w-9 text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10 border border-[#5B6FB9]/20"
                  title="צור תבנית תזונה חדשה"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Pill className="h-3.5 w-3.5 text-slate-400" />
                תוספים (עריכה ידנית)
              </Label>
              <div className="space-y-2">
                {supplements.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">אין תוספים</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSupplement}
                      className="text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      הוסף תוסף
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplements.map((supplement, index) => (
                      <SupplementRow
                        key={index}
                        index={index}
                        supplement={supplement}
                        templates={supplementTemplates}
                        onUpdate={updateSupplement}
                        onRemove={removeSupplement}
                        onEdit={handleEditSupplement}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSupplement}
                      className="w-full text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      הוסף תוסף נוסף
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Unified Workout Training Section - Under Supplements */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-slate-400" />
                פעילות גופנית
              </Label>
              <div className="space-y-2">
                {workoutTrainings.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">אין פעילות גופנית</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addWorkoutTraining}
                      className="text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      הוסף פעילות גופנית
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workoutTrainings.map((workout) => (
                      <WorkoutRow
                        key={workout.id}
                        workout={workout}
                        onUpdate={updateWorkoutTraining}
                        onRemove={removeWorkoutTraining}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addWorkoutTraining}
                      className="w-full text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      הוסף פעילות גופנית נוספת
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions - Bottom Right (RTL) */}
      <div className="flex flex-row-reverse justify-end gap-2 pt-2.5 pb-1 border-t border-slate-100">
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className={cn(
            "h-10 px-6 bg-gradient-to-r from-[#5B6FB9] to-[#5B6FB9]/90 text-white font-semibold text-sm",
            "hover:from-[#5B6FB9]/90 hover:to-[#5B6FB9] hover:-translate-y-0.5 transition-all duration-200",
            "shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          )}
        >
          {isSubmitting ? 'שומר...' : mode === 'create' ? 'צור תכנית פעולה' : 'שמור שינויים'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-10 px-5 text-sm text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300"
        >
          ביטול
        </Button>
      </div>

      {/* Template Creation Dialogs */}
      <AddWorkoutTemplateDialog
        isOpen={isWorkoutTemplateDialogOpen}
        onOpenChange={setIsWorkoutTemplateDialogOpen}
        onSave={handleCreateWorkoutTemplate}
      />

      <AddNutritionTemplateDialog
        isOpen={isNutritionTemplateDialogOpen}
        onOpenChange={setIsNutritionTemplateDialogOpen}
        onSave={handleCreateNutritionTemplate}
      />

      {/* Template Edit Dialogs */}
      <EditWorkoutTemplateDialog
        isOpen={isEditWorkoutTemplateDialogOpen}
        onOpenChange={setIsEditWorkoutTemplateDialogOpen}
        editingTemplate={editingWorkoutTemplate}
        onSave={handleUpdateWorkoutTemplate}
      />

      <EditNutritionTemplateDialog
        isOpen={isEditNutritionTemplateDialogOpen}
        onOpenChange={setIsEditNutritionTemplateDialogOpen}
        editingTemplate={editingNutritionTemplate}
        onSave={handleUpdateNutritionTemplate}
      />

      {/* Add/Edit Supplement Dialog */}
      <AddSupplementDialog
        isOpen={isAddSupplementDialogOpen}
        onOpenChange={setIsAddSupplementDialogOpen}
        onSave={handleSaveSupplement}
        initialData={editingSupplementIndex !== null ? supplements[editingSupplementIndex] : null}
        supplementTemplates={supplementTemplates}
      />

    </form>
  );
};
