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
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
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

  const bmr = useMemo(() => {
    try {
      return calculateBMR();
    } catch (error) {
      console.error('Error calculating BMR:', error);
      return 0;
    }
  }, [calculateBMR]);
  
  const tdee = useMemo(() => {
    try {
      return calculateTDEE();
    } catch (error) {
      console.error('Error calculating TDEE:', error);
      return 0;
    }
  }, [calculateTDEE]);
  
  const calculatedMacros = useMemo(() => {
    try {
      return calculateMacros();
    } catch (error) {
      console.error('Error calculating macros:', error);
      return {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 30,
      };
    }
  }, [calculateMacros]);

  // Calculate Highcharts pie chart options
  const pieChartOptions = useMemo((): Highcharts.Options => {
    try {
      if (!targets || typeof targets.protein !== 'number' || typeof targets.carbs !== 'number' || typeof targets.fat !== 'number') {
        return {
          chart: { type: 'pie', height: 300 },
          title: { text: '' },
          series: [{ type: 'pie', data: [] }],
        };
      }
      
      const proteinCalories = (targets.protein || 0) * 4;
      const carbsCalories = (targets.carbs || 0) * 4;
      const fatCalories = (targets.fat || 0) * 9;
      const total = proteinCalories + carbsCalories + fatCalories;

      if (total === 0 || !isFinite(total)) {
        return {
          chart: { type: 'pie', height: 300 },
          title: { text: '' },
          series: [{ type: 'pie', data: [] }],
        };
      }

      const proteinPercent = Math.round((proteinCalories / total) * 100);
      const carbsPercent = Math.round((carbsCalories / total) * 100);
      const fatPercent = Math.round((fatCalories / total) * 100);

      return {
        chart: {
          type: 'pie',
          height: 300,
          backgroundColor: 'transparent',
          spacing: [20, 20, 20, 20],
        },
        title: {
          text: 'התפלגות קלוריות לפי מקרו-נוטריאנטים',
          style: {
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
          },
        },
        credits: {
          enabled: false,
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e5e7eb',
          borderRadius: 8,
          shadow: {
            color: 'rgba(0, 0, 0, 0.1)',
            width: 2,
            offsetX: 0,
            offsetY: 2,
          },
          formatter: function() {
            return `<b>${this.point.name}</b><br/>${this.percentage.toFixed(1)}% (${this.y} קק״ל)`;
          },
          style: {
            fontFamily: 'inherit',
            fontSize: '12px',
          },
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b>: {point.percentage:.1f}%',
              style: {
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: '500',
              },
              distance: 20,
            },
            showInLegend: true,
            states: {
              hover: {
                brightness: 0.1,
              },
            },
          },
        },
        legend: {
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle',
          itemStyle: {
            fontFamily: 'inherit',
            fontSize: '12px',
          },
        },
        series: [
          {
            type: 'pie',
            name: 'קלוריות',
            data: [
              {
                name: 'חלבון',
                y: proteinCalories,
                color: MACRO_COLORS.protein,
              },
              {
                name: 'פחמימות',
                y: carbsCalories,
                color: MACRO_COLORS.carbs,
              },
              {
                name: 'שומן',
                y: fatCalories,
                color: MACRO_COLORS.fat,
              },
            ],
          },
        ],
      };
    } catch (error) {
      console.error('Error calculating pie chart data:', error);
      return {
        chart: { type: 'pie', height: 300 },
        title: { text: '' },
        series: [{ type: 'pie', data: [] }],
      };
    }
  }, [targets]);

  // Calculate variance (user mode only)
  const varianceData = useMemo(() => {
    try {
      if (mode !== 'user' || !actualValues || !targets) return null;

      return {
        calories: (actualValues.calories || 0) - (targets.calories || 0),
        protein: (actualValues.protein || 0) - (targets.protein || 0),
        carbs: (actualValues.carbs || 0) - (targets.carbs || 0),
        fat: (actualValues.fat || 0) - (targets.fat || 0),
        fiber: (actualValues.fiber || 0) - (targets.fiber || 0),
      };
    } catch (error) {
      console.error('Error calculating variance data:', error);
      return null;
    }
  }, [mode, actualValues, targets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = getNutritionData(mode);
      // Extract templateData when in template mode, or pass userData for user mode
      if (mode === 'template' && data.templateData) {
        onSave(data.templateData);
      } else if (mode === 'user' && data.userData) {
        onSave(data.userData);
      } else {
        throw new Error('Invalid data structure');
      }
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
      <CardHeader className="pb-1 pt-2 px-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md" style={{ backgroundColor: `${color}20` }}>
            <Icon className="h-3 w-3" style={{ color }} />
          </div>
          <CardTitle className="text-xs font-semibold">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="text-base font-bold text-center h-8"
            dir="ltr"
            min="0"
          />
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
      <div className="flex-1 overflow-hidden p-3 space-y-2.5">
        {/* Header Section - Stacked Layout */}
        <div className="space-y-2">
          <div>
            <Label htmlFor="name" className="text-xs font-semibold mb-1 block">
              {mode === 'template' ? 'שם התבנית' : 'שם התוכנית'}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'template' ? 'לדוגמה: תבנית חיטוב' : 'שם התוכנית'}
              required
              className="text-sm h-8"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-xs font-semibold mb-1 block">
              תיאור
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור התבנית או התוכנית..."
              className="text-sm h-16 resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Macro Budget Inputs - Compact Grid */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              תקציב מקרו-נוטריאנטים
            </h3>
            <Collapsible open={calculatorOpen} onOpenChange={setCalculatorOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2">
                  <Calculator className="h-3 w-3 ml-1" />
                  מחשבון
                  {calculatorOpen ? (
                    <ChevronUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* BMR/TDEE Calculator */}
          <Collapsible open={calculatorOpen} onOpenChange={setCalculatorOpen}>
            <CollapsibleContent>
              <Card className="mb-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader className="pb-1.5 pt-2 px-2.5">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <Calculator className="h-3.5 w-3.5 text-blue-600" />
                    מחשבון BMR/TDEE
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-2.5 pb-2.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <Label htmlFor="calc-weight" className="text-xs">משקל (ק"ג)</Label>
                      <Input
                        id="calc-weight"
                        type="number"
                        value={calculatorInputs.weight}
                        onChange={(e) => setCalculatorInput('weight', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calc-height" className="text-xs">גובה (ס"מ)</Label>
                      <Input
                        id="calc-height"
                        type="number"
                        value={calculatorInputs.height}
                        onChange={(e) => setCalculatorInput('height', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calc-age" className="text-xs">גיל</Label>
                      <Input
                        id="calc-age"
                        type="number"
                        value={calculatorInputs.age}
                        onChange={(e) => setCalculatorInput('age', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calc-gender" className="text-xs">מין</Label>
                      <Select
                        value={calculatorInputs.gender}
                        onValueChange={(value: 'male' | 'female') => setCalculatorInput('gender', value)}
                      >
                        <SelectTrigger id="calc-gender" className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">זכר</SelectItem>
                          <SelectItem value="female">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="calc-activity" className="text-xs">רמת פעילות</Label>
                      <Select
                        value={calculatorInputs.activityLevel}
                        onValueChange={(value: any) => setCalculatorInput('activityLevel', value)}
                      >
                        <SelectTrigger id="calc-activity" className="h-7 text-xs">
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
                      <Label htmlFor="calc-goal" className="text-xs">מטרה</Label>
                      <Select
                        value={calculatorInputs.goal}
                        onValueChange={(value: any) => setCalculatorInput('goal', value)}
                      >
                        <SelectTrigger id="calc-goal" className="h-7 text-xs">
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

                  <Separator className="my-1.5" />

                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="text-center p-1.5 bg-white rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-0.5">BMR</p>
                      <p className="text-base font-bold">{bmr}</p>
                      <p className="text-xs text-muted-foreground">קק״ל/יום</p>
                    </div>
                    <div className="text-center p-1.5 bg-white rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-0.5">TDEE</p>
                      <p className="text-base font-bold">{tdee}</p>
                      <p className="text-xs text-muted-foreground">קק״ל/יום</p>
                    </div>
                    <div className="text-center p-1.5 bg-white rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-0.5">מטרה</p>
                      <p className="text-base font-bold">
                        {tdee + (calculatorInputs.goal === 'cut' ? -500 : calculatorInputs.goal === 'bulk' ? 500 : 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">קק״ל/יום</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={applyCalculatedValues}
                    className="w-full h-7 text-xs"
                    variant="default"
                  >
                    <Target className="h-3 w-3 ml-1" />
                    החל ערכים מחושבים
                  </Button>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
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

        {/* Macro Distribution Visualization - Stacked Compact Layout */}
        <div className="space-y-2">
          {/* Pie Chart */}
          <Card>
            <CardHeader className="pb-1 pt-2 px-2.5">
              <CardTitle className="text-xs">התפלגות מקרו-נוטריאנטים</CardTitle>
            </CardHeader>
            <CardContent className="px-2.5 pb-2.5">
              {pieChartOptions.series && (pieChartOptions.series[0] as any)?.data?.length > 0 && (
                <div className="h-80">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={pieChartOptions}
                    containerProps={{ style: { height: '100%', width: '100%' } }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Bars */}
          <Card>
            <CardHeader className="pb-1 pt-2 px-2.5">
              <CardTitle className="text-xs">אחוזים</CardTitle>
            </CardHeader>
            <CardContent className="px-2.5 pb-2.5">
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} />
                      חלבון
                    </span>
                    <span className="text-xs font-bold">{macroPercentages.protein}%</span>
                  </div>
                  <Progress value={macroPercentages.protein} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} />
                      פחמימות
                    </span>
                    <span className="text-xs font-bold">{macroPercentages.carbs}%</span>
                  </div>
                  <Progress value={macroPercentages.carbs} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} />
                      שומן
                    </span>
                    <span className="text-xs font-bold">{macroPercentages.fat}%</span>
                  </div>
                  <Progress value={macroPercentages.fat} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
      <div className="border-t bg-white p-2.5 flex gap-2 flex-shrink-0" dir="rtl">
        <Button
          type="submit"
          className="flex-1 h-8 text-sm"
          disabled={isSubmitting || !name.trim()}
        >
          שמור {mode === 'template' ? 'תבנית' : 'תוכנית'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-8 text-sm"
        >
          ביטול
        </Button>
      </div>
    </form>
  );
};



