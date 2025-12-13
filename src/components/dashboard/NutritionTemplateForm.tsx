import { useState, useMemo } from 'react';
import { useNutritionBuilder, type NutritionBuilderMode } from '@/hooks/useNutritionBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import {
  Calculator,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';

interface NutritionTemplateFormProps {
  mode: NutritionBuilderMode;
  initialData?: NutritionTemplate | { targets?: any };
  onSave: (data: any) => void;
  onCancel: () => void;
  actualValues?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

const MACRO_COLORS = {
  protein: '#ef4444', // red-500
  carbs: '#3b82f6',    // blue-500
  fat: '#f59e0b',      // amber-500
};

const ACTIVITY_LEVEL_LABELS = {
  sedentary: 'יושבני (פעילות מינימלית)',
  light: 'קל (1-3 אימונים בשבוע)',
  moderate: 'בינוני (3-5 אימונים בשבוע)',
  active: 'פעיל (6-7 אימונים בשבוע)',
  very_active: 'פעיל מאוד (אימונים מרובים + עבודה פיזית)',
};

const GOAL_LABELS = {
  cut: 'חיטוב',
  maintain: 'תחזוקה',
  bulk: 'עלייה במשקל',
};

export const NutritionTemplateForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  actualValues,
}: NutritionTemplateFormProps) => {
  const {
    name,
    description,
    targets,
    calculatorInputs,
    calculatorOpen,
    setName,
    setDescription,
    setTarget,
    setCalculatorInput,
    setCalculatorOpen,
    calculateBMR,
    calculateTDEE,
    calculateMacros,
    applyCalculatedValues,
    getNutritionData,
    macroPercentages,
  } = useNutritionBuilder(mode, initialData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const bmr = useMemo(() => calculateBMR(), [calculateBMR]);
  const tdee = useMemo(() => calculateTDEE(), [calculateTDEE]);
  const calculatedMacros = useMemo(() => calculateMacros(), [calculateMacros]);

  // Calculate pie chart data
  const pieChartData = useMemo(() => {
    const proteinCalories = targets.protein * 4;
    const carbsCalories = targets.carbs * 4;
    const fatCalories = targets.fat * 9;
    const total = proteinCalories + carbsCalories + fatCalories;

    if (total === 0) return [];

    return [
      { name: 'חלבון', value: Math.round((proteinCalories / total) * 100), color: MACRO_COLORS.protein },
      { name: 'פחמימות', value: Math.round((carbsCalories / total) * 100), color: MACRO_COLORS.carbs },
      { name: 'שומן', value: Math.round((fatCalories / total) * 100), color: MACRO_COLORS.fat },
    ];
  }, [targets]);

  // Calculate variance (user mode only)
  const varianceData = useMemo(() => {
    if (mode !== 'user' || !actualValues) return null;

    return {
      calories: actualValues.calories - targets.calories,
      protein: actualValues.protein - targets.protein,
      carbs: actualValues.carbs - targets.carbs,
      fat: actualValues.fat - targets.fat,
      fiber: actualValues.fiber - targets.fiber,
    };
  }, [mode, actualValues, targets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = getNutritionData(mode);
      onSave(data);
    } catch (error: any) {
      console.error('Error saving nutrition data:', error);
      alert(error.message || 'שגיאה בשמירת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  };

  const MacroInputCard = ({
    label,
    icon: Icon,
    value,
    onChange,
    unit,
    color,
    description,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: number;
    onChange: (value: number) => void;
    unit: string;
    color: string;
    description?: string;
  }) => (
    <Card className="border-2 hover:border-opacity-80 transition-colors" style={{ borderColor: color }}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{label}</CardTitle>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              className="text-2xl font-bold text-center"
              dir="ltr"
              min="0"
            />
            <span className="text-lg font-semibold text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-base font-semibold mb-2 block">
              {mode === 'template' ? 'שם התבנית' : 'שם התוכנית'}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'template' ? 'לדוגמה: תבנית חיטוב' : 'שם התוכנית'}
              required
              className="text-base"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-base font-semibold mb-2 block">
              תיאור
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור התבנית או התוכנית..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Macro Budget Inputs - 5 Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5" />
              תקציב מקרו-נוטריאנטים
            </h3>
            <Collapsible open={calculatorOpen} onOpenChange={setCalculatorOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Calculator className="h-4 w-4 ml-2" />
                  מחשבון BMR/TDEE
                  {calculatorOpen ? (
                    <ChevronUp className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* BMR/TDEE Calculator */}
          <Collapsible open={calculatorOpen} onOpenChange={setCalculatorOpen}>
            <CollapsibleContent>
              <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    מחשבון BMR/TDEE
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calc-weight">משקל (ק"ג)</Label>
                      <Input
                        id="calc-weight"
                        type="number"
                        value={calculatorInputs.weight}
                        onChange={(e) => setCalculatorInput('weight', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calc-height">גובה (ס"מ)</Label>
                      <Input
                        id="calc-height"
                        type="number"
                        value={calculatorInputs.height}
                        onChange={(e) => setCalculatorInput('height', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calc-age">גיל</Label>
                      <Input
                        id="calc-age"
                        type="number"
                        value={calculatorInputs.age}
                        onChange={(e) => setCalculatorInput('age', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calc-gender">מין</Label>
                      <Select
                        value={calculatorInputs.gender}
                        onValueChange={(value: 'male' | 'female') => setCalculatorInput('gender', value)}
                      >
                        <SelectTrigger id="calc-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">זכר</SelectItem>
                          <SelectItem value="female">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="calc-activity">רמת פעילות</Label>
                      <Select
                        value={calculatorInputs.activityLevel}
                        onValueChange={(value: any) => setCalculatorInput('activityLevel', value)}
                      >
                        <SelectTrigger id="calc-activity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ACTIVITY_LEVEL_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="calc-goal">מטרה</Label>
                      <Select
                        value={calculatorInputs.goal}
                        onValueChange={(value: any) => setCalculatorInput('goal', value)}
                      >
                        <SelectTrigger id="calc-goal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GOAL_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">BMR</p>
                      <p className="text-2xl font-bold">{bmr}</p>
                      <p className="text-xs text-muted-foreground">קלוריות/יום</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">TDEE</p>
                      <p className="text-2xl font-bold">{tdee}</p>
                      <p className="text-xs text-muted-foreground">קלוריות/יום</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">מטרה</p>
                      <p className="text-2xl font-bold">
                        {tdee + (calculatorInputs.goal === 'cut' ? -500 : calculatorInputs.goal === 'bulk' ? 500 : 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">קלוריות/יום</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={applyCalculatedValues}
                    className="w-full"
                    variant="default"
                  >
                    <Target className="h-4 w-4 ml-2" />
                    החל ערכים מחושבים
                  </Button>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <MacroInputCard
              label="קלוריות"
              icon={Flame}
              value={targets.calories}
              onChange={(val) => setTarget('calories', val)}
              unit="קק״ל"
              color="#f97316"
              description="סך הקלוריות היומיות"
            />
            <MacroInputCard
              label="חלבון"
              icon={Beef}
              value={targets.protein}
              onChange={(val) => setTarget('protein', val)}
              unit="גרם"
              color={MACRO_COLORS.protein}
              description="גרם חלבון יומי"
            />
            <MacroInputCard
              label="פחמימות"
              icon={Wheat}
              value={targets.carbs}
              onChange={(val) => setTarget('carbs', val)}
              unit="גרם"
              color={MACRO_COLORS.carbs}
              description="גרם פחמימות יומי"
            />
            <MacroInputCard
              label="שומן"
              icon={Droplets}
              value={targets.fat}
              onChange={(val) => setTarget('fat', val)}
              unit="גרם"
              color={MACRO_COLORS.fat}
              description="גרם שומן יומי"
            />
            <MacroInputCard
              label="סיבים"
              icon={Leaf}
              value={targets.fiber}
              onChange={(val) => setTarget('fiber', val)}
              unit="גרם"
              color="#22c55e"
              description="גרם סיבים יומי"
            />
          </div>
        </div>

        {/* Macro Distribution Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">התפלגות מקרו-נוטריאנטים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pie Chart */}
              {pieChartData.length > 0 && (
                <div className="h-64">
                  <ChartContainer
                    config={{
                      protein: { label: 'חלבון', color: MACRO_COLORS.protein },
                      carbs: { label: 'פחמימות', color: MACRO_COLORS.carbs },
                      fat: { label: 'שומן', color: MACRO_COLORS.fat },
                    }}
                    className="h-full"
                  >
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>
              )}

              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} />
                      חלבון
                    </span>
                    <span className="text-sm font-bold">{macroPercentages.protein}%</span>
                  </div>
                  <Progress value={macroPercentages.protein} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} />
                      פחמימות
                    </span>
                    <span className="text-sm font-bold">{macroPercentages.carbs}%</span>
                  </div>
                  <Progress value={macroPercentages.carbs} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} />
                      שומן
                    </span>
                    <span className="text-sm font-bold">{macroPercentages.fat}%</span>
                  </div>
                  <Progress value={macroPercentages.fat} className="h-3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gap Logic Table (User Mode Only) */}
        {mode === 'user' && actualValues && varianceData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ניתוח פערים</CardTitle>
              <p className="text-sm text-muted-foreground">
                השוואה בין המטרה לבין הערכים בפועל
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מקרו-נוטריאנט</TableHead>
                    <TableHead className="text-right">מטרה</TableHead>
                    <TableHead className="text-right">פועל</TableHead>
                    <TableHead className="text-right">פער</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { key: 'calories', label: 'קלוריות', unit: 'קק״ל' },
                    { key: 'protein', label: 'חלבון', unit: 'גרם' },
                    { key: 'carbs', label: 'פחמימות', unit: 'גרם' },
                    { key: 'fat', label: 'שומן', unit: 'גרם' },
                    { key: 'fiber', label: 'סיבים', unit: 'גרם' },
                  ].map(({ key, label, unit }) => {
                    const targetValue = targets[key as keyof typeof targets];
                    const actualValue = actualValues[key as keyof typeof actualValues];
                    const variance = varianceData[key as keyof typeof varianceData];
                    const isWithinRange = Math.abs(variance) <= (key === 'calories' ? 50 : key === 'fiber' ? 5 : 10);
                    
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell>{targetValue} {unit}</TableCell>
                        <TableCell>{actualValue} {unit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {variance > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-500" />
                            ) : variance < 0 ? (
                              <TrendingDown className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-400" />
                            )}
                            <span
                              className={cn(
                                'font-semibold',
                                isWithinRange ? 'text-green-600' : 'text-red-600'
                              )}
                            >
                              {variance > 0 ? '+' : ''}{variance} {unit}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t bg-white p-4 flex gap-3" dir="rtl">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || !name.trim()}
        >
          שמור {mode === 'template' ? 'תבנית' : 'תוכנית'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          ביטול
        </Button>
      </div>
    </form>
  );
};

