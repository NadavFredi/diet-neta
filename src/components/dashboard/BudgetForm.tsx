/**
 * BudgetForm Component
 * 
 * Premium Luxury Budget Configurator - Apple/Stripe Aesthetic
 * Bento-style layout with world-class UI/UX
 */

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
import { useNutritionTemplates } from '@/hooks/useNutritionTemplates';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { useNavigate } from 'react-router-dom';
import type { Budget, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';
import { cn } from '@/lib/utils';
import { AddWorkoutTemplateDialog } from '@/components/dashboard/dialogs/AddWorkoutTemplateDialog';
import { AddNutritionTemplateDialog } from '@/components/dashboard/dialogs/AddNutritionTemplateDialog';
import { useToast } from '@/hooks/use-toast';

interface BudgetFormProps {
  mode: 'create' | 'edit';
  initialData?: Budget | null;
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

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: nutritionTemplates = [] } = useNutritionTemplates();
  const { data: workoutTemplates = [] } = useWorkoutTemplates();
  const createWorkoutTemplate = useCreateWorkoutTemplate();
  const createNutritionTemplate = useCreateNutritionTemplate();
  
  const [isWorkoutTemplateDialogOpen, setIsWorkoutTemplateDialogOpen] = useState(false);
  const [isNutritionTemplateDialogOpen, setIsNutritionTemplateDialogOpen] = useState(false);
  
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
    if (templateId === 'none') {
      setNutritionTemplateId(null);
      setNutritionTargets({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber_min: 20,
        water_min: 2.5,
      });
    } else {
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
        name,
        description: description || null,
        nutrition_template_id: nutritionTemplateId || null,
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
                <Label htmlFor="name" className="text-sm font-medium text-slate-500">שם התקציב *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="לדוגמה: תקציב 1700 קלוריות"
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
                  placeholder="תיאור קצר של התקציב"
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
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
                תוספים
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
                      <div key={index} className="flex gap-2 items-start p-2 bg-slate-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-1.5">
                          <Input
                            value={supplement.name}
                            onChange={(e) => updateSupplement(index, 'name', e.target.value)}
                            placeholder="שם התוסף"
                            className="h-8 bg-white border-0 text-xs"
                            dir="rtl"
                          />
                          <Input
                            value={supplement.dosage}
                            onChange={(e) => updateSupplement(index, 'dosage', e.target.value)}
                            placeholder="מינון"
                            className="h-8 bg-white border-0 text-xs"
                            dir="rtl"
                          />
                          <Input
                            value={supplement.timing}
                            onChange={(e) => updateSupplement(index, 'timing', e.target.value)}
                            placeholder="זמן נטילה"
                            className="h-8 bg-white border-0 text-xs"
                            dir="rtl"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSupplement(index)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Footprints className="h-3.5 w-3.5 text-slate-400" />
                יעד צעדים יומי
              </Label>
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
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions - Bottom Left (RTL) */}
      <div className="flex flex-row-reverse justify-start gap-2 pt-2.5 pb-1 border-t border-slate-100">
        <Button 
          type="submit" 
          disabled={isSubmitting || !name.trim()}
          className={cn(
            "h-10 px-6 bg-gradient-to-r from-[#5B6FB9] to-[#5B6FB9]/90 text-white font-semibold text-sm",
            "hover:from-[#5B6FB9]/90 hover:to-[#5B6FB9] hover:-translate-y-0.5 transition-all duration-200",
            "shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          )}
        >
          {isSubmitting ? 'שומר...' : mode === 'create' ? 'צור תקציב' : 'שמור שינויים'}
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
    </form>
  );
};
