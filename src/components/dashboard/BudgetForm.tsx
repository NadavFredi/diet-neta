/**
 * BudgetForm Component
 * 
 * Comprehensive form for creating/editing budgets (Taktziv)
 * Handles all fields: nutrition, steps, workout, supplements, guidelines
 */

import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, X } from 'lucide-react';
import { useNutritionTemplates } from '@/hooks/useNutritionTemplates';
import type { Budget, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';
import { cn } from '@/lib/utils';

interface BudgetFormProps {
  mode: 'create' | 'edit';
  initialData?: Budget | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const BudgetForm = ({ mode, initialData, onSave, onCancel }: BudgetFormProps) => {
  const { data: nutritionTemplates = [] } = useNutritionTemplates();
  
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* Basic Info */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">מידע בסיסי</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">שם התקציב *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: תקציב 1700 קלוריות"
              required
              className="border-slate-200"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">תיאור</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר של התקציב"
              rows={2}
              className="border-slate-200"
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Nutrition */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">תזונה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">תבנית תזונה</Label>
            <Select
              value={useCustomNutrition ? 'custom' : nutritionTemplateId || ''}
              onValueChange={handleNutritionTemplateChange}
            >
              <SelectTrigger className="border-slate-200" dir="rtl">
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
          </div>

          {useCustomNutrition && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="calories" className="text-xs">קלוריות (קק״ל)</Label>
                <Input
                  id="calories"
                  type="number"
                  value={nutritionTargets.calories || ''}
                  onChange={(e) =>
                    setNutritionTargets({ ...nutritionTargets, calories: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="border-slate-200"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein" className="text-xs">חלבון (ג׳)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={nutritionTargets.protein || ''}
                  onChange={(e) =>
                    setNutritionTargets({ ...nutritionTargets, protein: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="border-slate-200"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs" className="text-xs">פחמימות (ג׳)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={nutritionTargets.carbs || ''}
                  onChange={(e) =>
                    setNutritionTargets({ ...nutritionTargets, carbs: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="border-slate-200"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat" className="text-xs">שומן (ג׳)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={nutritionTargets.fat || ''}
                  onChange={(e) =>
                    setNutritionTargets({ ...nutritionTargets, fat: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="border-slate-200"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiber_min" className="text-xs">סיבים מינימום (ג׳)</Label>
                <Input
                  id="fiber_min"
                  type="number"
                  value={nutritionTargets.fiber_min || ''}
                  onChange={(e) =>
                    setNutritionTargets({ ...nutritionTargets, fiber_min: parseFloat(e.target.value) || 20 })
                  }
                  placeholder="20"
                  className="border-slate-200"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="water_min" className="text-xs">מים מינימום (ליטר)</Label>
                <Input
                  id="water_min"
                  type="number"
                  step="0.1"
                  value={nutritionTargets.water_min || ''}
                  onChange={(e) =>
                    setNutritionTargets({ ...nutritionTargets, water_min: parseFloat(e.target.value) || 2.5 })
                  }
                  placeholder="2.5"
                  className="border-slate-200"
                  dir="ltr"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">צעדים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="steps_goal" className="text-sm font-semibold">יעד צעדים יומי</Label>
            <Input
              id="steps_goal"
              type="number"
              value={stepsGoal || ''}
              onChange={(e) => setStepsGoal(parseInt(e.target.value) || 0)}
              placeholder="לדוגמה: 7000"
              className="border-slate-200"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="steps_instructions" className="text-sm font-semibold">הוראות צעדים</Label>
            <Textarea
              id="steps_instructions"
              value={stepsInstructions}
              onChange={(e) => setStepsInstructions(e.target.value)}
              placeholder="לדוגמה: 10-15 דק' הליכה אחרי כל ארוחה"
              rows={2}
              className="border-slate-200"
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Workout */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">אימונים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">תבנית אימונים</Label>
            <Select
              value={workoutTemplateId || 'none'}
              onValueChange={(value) => setWorkoutTemplateId(value === 'none' ? null : value || null)}
            >
              <SelectTrigger className="border-slate-200" dir="rtl">
                <SelectValue placeholder="בחר תבנית אימונים (אופציונלי)" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="none">ללא תבנית</SelectItem>
                {/* TODO: Add workout templates when available */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Supplements */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-base font-bold">תוספים</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSupplement}
            className="text-xs"
          >
            <Plus className="h-3 w-3 ml-1" />
            הוסף תוסף
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {supplements.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">אין תוספים. לחץ על "הוסף תוסף" כדי להתחיל</p>
          ) : (
            supplements.map((supplement, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border border-slate-200 rounded-lg">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">שם התוסף</Label>
                    <Input
                      value={supplement.name}
                      onChange={(e) => updateSupplement(index, 'name', e.target.value)}
                      placeholder="לדוגמה: ויטמין D3+K2"
                      className="border-slate-200 text-sm"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">מינון</Label>
                    <Input
                      value={supplement.dosage}
                      onChange={(e) => updateSupplement(index, 'dosage', e.target.value)}
                      placeholder="לדוגמה: 5000IU"
                      className="border-slate-200 text-sm"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">זמן נטילה</Label>
                    <Input
                      value={supplement.timing}
                      onChange={(e) => updateSupplement(index, 'timing', e.target.value)}
                      placeholder="לדוגמה: בבוקר"
                      className="border-slate-200 text-sm"
                      dir="rtl"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSupplement(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">הנחיות אכילה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eating_order" className="text-sm font-semibold">סדר האכילה</Label>
            <Textarea
              id="eating_order"
              value={eatingOrder}
              onChange={(e) => setEatingOrder(e.target.value)}
              placeholder="לדוגמה: מתחילה בירקות, ממשיכה לחלבון ומסיימת בפחמימה"
              rows={2}
              className="border-slate-200"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eating_rules" className="text-sm font-semibold">כללי אכילה</Label>
            <Textarea
              id="eating_rules"
              value={eatingRules}
              onChange={(e) => setEatingRules(e.target.value)}
              placeholder="לדוגמה: לא תאכלי פחמימה לבדה - עם חלבון, סיבים ושומן"
              rows={2}
              className="border-slate-200"
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          ביטול
        </Button>
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? 'שומר...' : mode === 'create' ? 'צור תקציב' : 'שמור שינויים'}
        </Button>
      </div>
    </form>
  );
};

