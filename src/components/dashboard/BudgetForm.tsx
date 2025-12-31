/**
 * BudgetForm Component
 * 
 * Premium Luxury Budget Configurator - Apple/Stripe Aesthetic
 * Bento-style layout with world-class UI/UX
 */

import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Trash2, Dumbbell, Apple, Pill, Footprints } from 'lucide-react';
import { useNutritionTemplates } from '@/hooks/useNutritionTemplates';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { useNavigate } from 'react-router-dom';
import type { Budget, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';
import { cn } from '@/lib/utils';
import { AddWorkoutTemplateDialog } from '@/components/dashboard/dialogs/AddWorkoutTemplateDialog';
import { AddNutritionTemplateDialog } from '@/components/dashboard/dialogs/AddNutritionTemplateDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateWorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { useCreateNutritionTemplate } from '@/hooks/useNutritionTemplates';
import { useToast } from '@/hooks/use-toast';

interface BudgetFormProps {
  mode: 'create' | 'edit';
  initialData?: Budget | null;
  onSave: (data: any) => void;
  onCancel: () => void;
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

export const BudgetForm = ({ mode, initialData, onSave, onCancel }: BudgetFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: nutritionTemplates = [] } = useNutritionTemplates();
  const { data: workoutTemplates = [] } = useWorkoutTemplates();
  const createWorkoutTemplate = useCreateWorkoutTemplate();
  const createNutritionTemplate = useCreateNutritionTemplate();
  
  // Template creation dialog states
  const [isWorkoutTemplateDialogOpen, setIsWorkoutTemplateDialogOpen] = useState(false);
  const [isNutritionTemplateDialogOpen, setIsNutritionTemplateDialogOpen] = useState(false);
  
  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Nutrition
  const [nutritionTemplateId, setNutritionTemplateId] = useState<string | null>(null);
  const [useCustomNutrition, setUseCustomNutrition] = useState(false);
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber_min: 20,
    water_min: 2.5,
  });
  
  // Steps
  const [stepsGoal, setStepsGoal] = useState(0);
  const [stepsInstructions, setStepsInstructions] = useState('');
  
  // Workout
  const [workoutTemplateId, setWorkoutTemplateId] = useState<string | null>(null);
  
  // Supplements
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  
  // Guidelines
  const [eatingOrder, setEatingOrder] = useState('');
  const [eatingRules, setEatingRules] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setNutritionTemplateId(initialData.nutrition_template_id);
      setUseCustomNutrition(!initialData.nutrition_template_id);
      setNutritionTargets(initialData.nutrition_targets || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber_min: 20,
        water_min: 2.5,
      });
      setStepsGoal(initialData.steps_goal || 0);
      setStepsInstructions(initialData.steps_instructions || '');
      setWorkoutTemplateId(initialData.workout_template_id);
      setSupplements(initialData.supplements || []);
      setEatingOrder(initialData.eating_order || '');
      setEatingRules(initialData.eating_rules || '');
    }
  }, [initialData]);

  // Handle nutrition template selection
  const handleNutritionTemplateChange = (templateId: string) => {
    if (templateId === 'custom') {
      setUseCustomNutrition(true);
      setNutritionTemplateId(null);
    } else {
      setUseCustomNutrition(false);
      setNutritionTemplateId(templateId);
      const template = nutritionTemplates.find((t) => t.id === templateId);
      if (template && template.targets) {
        setNutritionTargets({
          calories: template.targets.calories || 0,
          protein: template.targets.protein || 0,
          carbs: template.targets.carbs || 0,
          fat: template.targets.fat || 0,
          fiber_min: template.targets.fiber || 20,
          water_min: nutritionTargets.water_min || 2.5,
        });
      }
    }
  };

  // Supplements management
  const addSupplement = () => {
    setSupplements([...supplements, { name: '', dosage: '', timing: '' }]);
  };

  const removeSupplement = (index: number) => {
    setSupplements(supplements.filter((_, i) => i !== index));
  };

  const updateSupplement = (index: number, field: keyof Supplement, value: string) => {
    const updated = [...supplements];
    updated[index] = { ...updated[index], [field]: value };
    setSupplements(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave({
        name,
        description: description || null,
        nutrition_template_id: useCustomNutrition ? null : nutritionTemplateId,
        nutrition_targets: nutritionTargets,
        steps_goal: stepsGoal,
        steps_instructions: stepsInstructions || null,
        workout_template_id: workoutTemplateId || null,
        supplements: supplements.filter((s) => s.name.trim() !== ''),
        eating_order: eatingOrder || null,
        eating_rules: eatingRules || null,
      });
    } catch (error) {
      console.error('Error saving budget:', error);
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
      setUseCustomNutrition(false);
      
      if (newTemplate.targets) {
        setNutritionTargets({
          calories: newTemplate.targets.calories || 0,
          protein: newTemplate.targets.protein || 0,
          carbs: newTemplate.targets.carbs || 0,
          fat: newTemplate.targets.fat || 0,
          fiber_min: newTemplate.targets.fiber || 20,
          water_min: nutritionTargets.water_min || 2.5,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl" style={{ fontFamily: 'Assistant, Heebo, sans-serif' }}>
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Card A: General Identity (Top Left) */}
        <Card className="bg-white border-0 shadow-sm rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">מידע בסיסי</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-500">שם התקציב *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: תקציב 1700 קלוריות"
                required
                className={cn(
                  "h-11 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 transition-all",
                  "text-slate-900 font-medium"
                )}
                dir="rtl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-slate-500">תיאור</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור קצר של התקציב"
                className={cn(
                  "min-h-[60px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 transition-all resize-none",
                  "text-slate-900 font-medium"
                )}
                dir="rtl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card B: Plan Integration (Top Right) */}
        <Card className="bg-white border-0 shadow-sm rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">אינטגרציית תכניות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-slate-400" />
                תכנית אימונים
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={workoutTemplateId || 'none'}
                  onValueChange={(value) => setWorkoutTemplateId(value === 'none' ? null : value || null)}
                >
                  <SelectTrigger className={cn(
                    "h-11 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 flex-1",
                    "text-slate-900 font-medium"
                  )} dir="rtl">
                    <SelectValue placeholder="בחר תבנית אימונים" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">ללא תבנית</SelectItem>
                    {workoutTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsWorkoutTemplateDialogOpen(true)}
                  className="h-11 w-11 text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10 border border-[#5B6FB9]/20"
                  title="צור תבנית אימונים חדשה"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Apple className="h-4 w-4 text-slate-400" />
                תבנית תזונה
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={useCustomNutrition ? 'custom' : nutritionTemplateId || ''}
                  onValueChange={handleNutritionTemplateChange}
                >
                  <SelectTrigger className={cn(
                    "h-11 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 flex-1",
                    "text-slate-900 font-medium"
                  )} dir="rtl">
                    <SelectValue placeholder="בחר תבנית תזונה או הזן ידנית" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="custom">הזן ידנית</SelectItem>
                    {nutritionTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNutritionTemplateDialogOpen(true)}
                  className="h-11 w-11 text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10 border border-[#5B6FB9]/20"
                  title="צור תבנית תזונה חדשה"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Pill className="h-4 w-4 text-slate-400" />
                תוספים
              </Label>
              <div className="space-y-3">
                {supplements.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-sm text-slate-400 mb-3">אין תוספים</p>
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
                      <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={supplement.name}
                            onChange={(e) => updateSupplement(index, 'name', e.target.value)}
                            placeholder="שם התוסף"
                            className="h-9 bg-white border-0 text-sm"
                            dir="rtl"
                          />
                          <Input
                            value={supplement.dosage}
                            onChange={(e) => updateSupplement(index, 'dosage', e.target.value)}
                            placeholder="מינון"
                            className="h-9 bg-white border-0 text-sm"
                            dir="rtl"
                          />
                          <Input
                            value={supplement.timing}
                            onChange={(e) => updateSupplement(index, 'timing', e.target.value)}
                            placeholder="זמן נטילה"
                            className="h-9 bg-white border-0 text-sm"
                            dir="rtl"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSupplement(index)}
                          className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Footprints className="h-4 w-4 text-slate-400" />
                יעד צעדים יומי
              </Label>
              <Input
                type="number"
                value={stepsGoal || ''}
                onChange={(e) => setStepsGoal(parseInt(e.target.value) || 0)}
                placeholder="לדוגמה: 7000"
                className={cn(
                  "h-11 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                  "text-slate-900 font-medium"
                )}
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="steps_instructions" className="text-sm font-medium text-slate-500">הוראות צעדים</Label>
              <Textarea
                id="steps_instructions"
                value={stepsInstructions}
                onChange={(e) => setStepsInstructions(e.target.value)}
                placeholder="הוראות והנחיות נוספות לגבי הצעדים היומיים"
                className={cn(
                  "min-h-[60px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 transition-all resize-none",
                  "text-slate-900 font-medium"
                )}
                dir="rtl"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card C: Nutrition Matrix (Bottom Full Width) */}
      {useCustomNutrition && (
        <Card className="bg-white border-0 shadow-sm rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">מטריצת תזונה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Macro Split Bar */}
            <MacroSplitBar 
              protein={nutritionTargets.protein || 0}
              carbs={nutritionTargets.carbs || 0}
              fat={nutritionTargets.fat || 0}
            />

            {/* Nutrition Grid - 3 columns */}
            <div className="grid grid-cols-3 gap-6">
              {/* Row 1 */}
              <div className="space-y-2">
                <Label htmlFor="calories" className="text-sm font-medium text-slate-500">קלוריות</Label>
                <div className="relative">
                  <Input
                    id="calories"
                    type="number"
                    value={nutritionTargets.calories || ''}
                    onChange={(e) =>
                      setNutritionTargets({ ...nutritionTargets, calories: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className={cn(
                      "h-12 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "text-slate-900 font-semibold text-lg pr-16"
                    )}
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">קק״ל</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="protein" className="text-sm font-medium text-slate-500">חלבון</Label>
                <div className="relative">
                  <Input
                    id="protein"
                    type="number"
                    value={nutritionTargets.protein || ''}
                    onChange={(e) =>
                      setNutritionTargets({ ...nutritionTargets, protein: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className={cn(
                      "h-12 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "text-slate-900 font-semibold text-lg pr-12"
                    )}
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">ג׳</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="carbs" className="text-sm font-medium text-slate-500">פחמימות</Label>
                <div className="relative">
                  <Input
                    id="carbs"
                    type="number"
                    value={nutritionTargets.carbs || ''}
                    onChange={(e) =>
                      setNutritionTargets({ ...nutritionTargets, carbs: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className={cn(
                      "h-12 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "text-slate-900 font-semibold text-lg pr-12"
                    )}
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">ג׳</span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="space-y-2">
                <Label htmlFor="fat" className="text-sm font-medium text-slate-500">שומן</Label>
                <div className="relative">
                  <Input
                    id="fat"
                    type="number"
                    value={nutritionTargets.fat || ''}
                    onChange={(e) =>
                      setNutritionTargets({ ...nutritionTargets, fat: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className={cn(
                      "h-12 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "text-slate-900 font-semibold text-lg pr-12"
                    )}
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">ג׳</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiber_min" className="text-sm font-medium text-slate-500">סיבים</Label>
                <div className="relative">
                  <Input
                    id="fiber_min"
                    type="number"
                    value={nutritionTargets.fiber_min || ''}
                    onChange={(e) =>
                      setNutritionTargets({ ...nutritionTargets, fiber_min: parseFloat(e.target.value) || 20 })
                    }
                    placeholder="20"
                    className={cn(
                      "h-12 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "text-slate-900 font-semibold text-lg pr-12"
                    )}
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">ג׳</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="water_min" className="text-sm font-medium text-slate-500">מים</Label>
                <div className="relative">
                  <Input
                    id="water_min"
                    type="number"
                    step="0.1"
                    value={nutritionTargets.water_min || ''}
                    onChange={(e) =>
                      setNutritionTargets({ ...nutritionTargets, water_min: parseFloat(e.target.value) || 2.5 })
                    }
                    placeholder="2.5"
                    className={cn(
                      "h-12 bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "text-slate-900 font-semibold text-lg pr-16"
                    )}
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">ליטר</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines Card - Always visible */}
      <Card className="bg-white border-0 shadow-sm rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">הנחיות אכילה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eating_order" className="text-sm font-medium text-slate-500">סדר האכילה</Label>
            <Textarea
              id="eating_order"
              value={eatingOrder}
              onChange={(e) => setEatingOrder(e.target.value)}
              placeholder="לדוגמה: מתחילה בירקות, ממשיכה לחלבון ומסיימת בפחמימה"
              className={cn(
                "min-h-[60px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 resize-none",
                "text-slate-900 font-medium"
              )}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eating_rules" className="text-sm font-medium text-slate-500">כללי אכילה</Label>
            <Textarea
              id="eating_rules"
              value={eatingRules}
              onChange={(e) => setEatingRules(e.target.value)}
              placeholder="לדוגמה: לא תאכלי פחמימה לבדה - עם חלבון, סיבים ושומן"
              className={cn(
                "min-h-[60px] bg-slate-50 border-0 focus:border focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20 resize-none",
                "text-slate-900 font-medium"
              )}
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hero Save Button */}
      <div className="flex justify-start gap-3 pt-6 border-t border-slate-100">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={isSubmitting}
          className="h-12 px-6 text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300"
        >
          ביטול
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || !name.trim()}
          className={cn(
            "h-12 px-8 bg-gradient-to-r from-[#5B6FB9] to-[#5B6FB9]/90 text-white font-semibold",
            "hover:from-[#5B6FB9]/90 hover:to-[#5B6FB9] hover:-translate-y-0.5 transition-all duration-200",
            "shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          )}
        >
          {isSubmitting ? 'שומר...' : mode === 'create' ? 'צור תקציב' : 'שמור שינויים'}
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
    </form>
  );
};
