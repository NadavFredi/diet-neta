import { useState, useMemo, useEffect } from 'react';
import { useNutritionBuilder, type NutritionBuilderMode } from '@/hooks/useNutritionBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  Calculator,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  Target,
  Info,
  Plus,
  Trash2,
  Activity,
  BarChart3,
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
  fiber: '#22c55e',    // green-500
  calories: '#f97316', // orange-500
};

const PAL_OPTIONS = [
  { value: 1.1, label: 'יושבני (1.1-1.2)', description: 'פעילות מינימלית' },
  { value: 1.3, label: 'קל (1.3-1.375)', description: '1-3 אימונים בשבוע' },
  { value: 1.4, label: 'בינוני (1.4-1.55)', description: '3-5 אימונים בשבוע' },
  { value: 1.6, label: 'פעיל (1.6-1.7)', description: '6-7 אימונים בשבוע' },
  { value: 1.7, label: 'פעיל מאוד (1.7+)', description: 'אימונים מרובים + עבודה פיזית' },
];

// Auto-apply calculated values when calculator inputs change
const AUTO_APPLY_THRESHOLD = 500; // milliseconds delay

export const NutritionTemplateForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
}: NutritionTemplateFormProps) => {
  const {
    name,
    description,
    targets,
    calculatorInputs,
    activityEntries,
    calculatorOpen,
    setName,
    setDescription,
    setTarget,
    setCalculatorInput,
    setCalculatorOpen,
    addActivityEntry,
    updateActivityEntry,
    removeActivityEntry,
    calculateBodyFat,
    calculateLBM,
    calculateBMR,
    calculateExerciseEE,
    calculateTDEE,
    calculateMacros,
    applyCalculatedValues,
    getNutritionData,
    macroPercentages,
  } = useNutritionBuilder(mode, initialData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-apply calculated values when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (calculatorInputs.weight > 0 && calculatorInputs.height > 0 && calculatorInputs.age > 0) {
        applyCalculatedValues();
      }
    }, AUTO_APPLY_THRESHOLD);

    return () => clearTimeout(timer);
  }, [
    calculatorInputs.weight,
    calculatorInputs.height,
    calculatorInputs.age,
    calculatorInputs.gender,
    calculatorInputs.pal,
    calculatorInputs.caloricDeficitPercent,
    calculatorInputs.proteinPerKg,
    calculatorInputs.fatPerKg,
    calculatorInputs.carbsPerKg,
    activityEntries,
    applyCalculatedValues,
  ]);

  // Calculate derived metrics
  const bodyFatPercent = useMemo(() => calculateBodyFat(), [calculateBodyFat]);
  const lbm = useMemo(() => calculateLBM(), [calculateLBM]);
  const bmrResults = useMemo(() => calculateBMR(), [calculateBMR]);
  const exerciseEE = useMemo(() => calculateExerciseEE(), [calculateExerciseEE]);
  const tdee = useMemo(() => calculateTDEE(), [calculateTDEE]);
  const calculatedMacros = useMemo(() => calculateMacros(), [calculateMacros]);

  // Calculate total weekly minutes
  const totalWeeklyMinutes = useMemo(() => {
    return activityEntries.reduce((sum, entry) => sum + (entry.minutesPerWeek || 0), 0);
  }, [activityEntries]);

  // Highcharts Donut Chart for Macro Distribution
  const donutChartOptions = useMemo((): Highcharts.Options => {
    const proteinCalories = (targets.protein || 0) * 4;
    const carbsCalories = (targets.carbs || 0) * 4;
    const fatCalories = (targets.fat || 0) * 9;
    const total = proteinCalories + carbsCalories + fatCalories;

    if (total === 0) {
      return {
        chart: { type: 'pie', height: 280, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [{ type: 'pie', data: [] }],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'pie',
        height: 280,
        backgroundColor: 'transparent',
      },
      title: { text: '' },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: { color: 'rgba(0, 0, 0, 0.1)', width: 2 },
        formatter: function() {
          return `<b>${this.point.name}</b><br/>${this.percentage.toFixed(1)}% (${this.y} קק״ל)`;
        },
      },
      plotOptions: {
        pie: {
          innerSize: '60%',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b><br/>{point.percentage:.1f}%',
            style: {
              fontFamily: 'Heebo, system-ui, sans-serif',
              fontSize: '11px',
            },
            distance: 15,
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
          fontFamily: 'Heebo, system-ui, sans-serif',
          fontSize: '11px',
        },
      },
      series: [
        {
          type: 'pie',
          name: 'קלוריות',
          data: [
            { name: 'חלבון', y: proteinCalories, color: MACRO_COLORS.protein },
            { name: 'פחמימות', y: carbsCalories, color: MACRO_COLORS.carbs },
            { name: 'שומן', y: fatCalories, color: MACRO_COLORS.fat },
          ],
        },
      ],
    };
  }, [targets]);

  // Highcharts Column Chart for TDEE Comparison
  const columnChartOptions = useMemo((): Highcharts.Options => {
    const targetCalories = targets.calories || 0;
    
    return {
      chart: {
        type: 'column',
        height: 280,
        backgroundColor: 'transparent',
      },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: {
        categories: ['קלוריות תחזוקה (TDEE)', 'קלוריות מטרה'],
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      yAxis: {
        title: {
          text: 'קלוריות',
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
        labels: {
          style: {
            fontFamily: 'Heebo, system-ui, sans-serif',
            fontSize: '11px',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        formatter: function() {
          return `<b>${this.x}</b><br/>${this.y} קק״ל`;
        },
      },
      plotOptions: {
        column: {
          dataLabels: {
            enabled: true,
            format: '{y} קק״ל',
            style: {
              fontFamily: 'Heebo, system-ui, sans-serif',
              fontSize: '11px',
            },
          },
          colorByPoint: true,
          colors: ['#3b82f6', '#22c55e'],
        },
      },
      series: [
        {
          type: 'column',
          name: 'קלוריות',
          data: [tdee, targetCalories],
        },
      ],
    };
  }, [tdee, targets.calories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = getNutritionData(mode);
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
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: number;
    onChange: (value: number) => void;
    unit: string;
    color: string;
  }) => (
    <Card className="border-2 hover:border-opacity-80 transition-colors rounded-xl shadow-sm" style={{ borderColor: color }}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <CardTitle className="text-xs font-semibold">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="text-lg font-bold text-center h-8 rounded-lg"
            dir="ltr"
            min="0"
          />
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4">
          {/* Top Row: Name and Description (1/3 and 2/3 split) */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold mb-1.5 block text-right">
                {mode === 'template' ? 'שם התבנית' : 'שם התוכנית'}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode === 'template' ? 'לדוגמה: תבנית חיטוב' : 'שם התוכנית'}
                required
                className="text-sm h-9 rounded-xl"
                dir="rtl"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description" className="text-xs font-semibold mb-1.5 block text-right">
                תיאור
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור התבנית או התוכנית..."
                className="text-sm h-9 rounded-xl"
                dir="rtl"
              />
            </div>
          </div>

          {/* Main Data Section: 3-Column Grid with Visual Partition */}
          <div className="grid grid-cols-3 gap-4">
            {/* Column 1: Biometrics & Activity Level/Goals (Input Section) */}
            <div className="space-y-4 bg-slate-50/30 rounded-xl p-4">
              {/* Biometric Data Card */}
              <Card className="rounded-xl shadow-sm border">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-right">
                    <Calculator className="h-3.5 w-3.5" />
                    נתונים ביומטריים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 px-4 pb-3">
                  {/* Compact horizontal inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="calc-weight" className="text-xs w-16 text-right flex-shrink-0">
                        משקל (ק"ג)
                      </Label>
                      <Input
                        id="calc-weight"
                        type="number"
                        value={calculatorInputs.weight || ''}
                        onChange={(e) => setCalculatorInput('weight', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-7 text-xs rounded-lg flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="calc-height" className="text-xs w-16 text-right flex-shrink-0">
                        גובה (ס"מ)
                      </Label>
                      <Input
                        id="calc-height"
                        type="number"
                        value={calculatorInputs.height || ''}
                        onChange={(e) => setCalculatorInput('height', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-7 text-xs rounded-lg flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="calc-age" className="text-xs w-16 text-right flex-shrink-0">
                        גיל
                      </Label>
                      <Input
                        id="calc-age"
                        type="number"
                        value={calculatorInputs.age || ''}
                        onChange={(e) => setCalculatorInput('age', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-7 text-xs rounded-lg flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="calc-gender" className="text-xs w-16 text-right flex-shrink-0">
                        מין
                      </Label>
                      <Select
                        value={calculatorInputs.gender}
                        onValueChange={(value: 'male' | 'female') => setCalculatorInput('gender', value)}
                      >
                        <SelectTrigger id="calc-gender" className="h-7 text-xs rounded-lg flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="male">זכר</SelectItem>
                          <SelectItem value="female">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Navy Method Measurements */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 justify-end">
                      <Label className="text-xs font-semibold text-right">מדידות גוף (Navy)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs" side="left">
                          <p className="text-xs">שיטת Navy לחישוב אחוז שומן</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="calc-waist" className="text-xs w-20 text-right flex-shrink-0">
                          מותן (ס"מ)
                        </Label>
                        <Input
                          id="calc-waist"
                          type="number"
                          value={calculatorInputs.waist || ''}
                          onChange={(e) => setCalculatorInput('waist', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="0"
                          className="h-7 text-xs rounded-lg flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="calc-neck" className="text-xs w-20 text-right flex-shrink-0">
                          צוואר (ס"מ)
                        </Label>
                        <Input
                          id="calc-neck"
                          type="number"
                          value={calculatorInputs.neck || ''}
                          onChange={(e) => setCalculatorInput('neck', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="0"
                          className="h-7 text-xs rounded-lg flex-1"
                        />
                      </div>
                      {calculatorInputs.gender === 'female' && (
                        <div className="col-span-2 flex items-center gap-2">
                          <Label htmlFor="calc-hip" className="text-xs w-20 text-right flex-shrink-0">
                            אגן (ס"מ)
                          </Label>
                          <Input
                            id="calc-hip"
                            type="number"
                            value={calculatorInputs.hip || ''}
                            onChange={(e) => setCalculatorInput('hip', parseFloat(e.target.value) || 0)}
                            dir="ltr"
                            min="0"
                            className="h-7 text-xs rounded-lg flex-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Level & Goals Card */}
              <Card className="rounded-xl shadow-sm border">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-right">
                    <Activity className="h-3.5 w-3.5" />
                    רמת פעילות ומטרות
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 justify-end">
                      <Label className="text-xs font-semibold text-right">רמת פעילות (PAL)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs" side="left">
                          <p className="text-xs">Physical Activity Level</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={calculatorInputs.pal.toString()}
                      onValueChange={(value) => setCalculatorInput('pal', parseFloat(value))}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {PAL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-semibold text-right">גרעון/עודף קלורי (%)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs" side="left">
                            <p className="text-xs">אחוז גרעון או עודף קלורי</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs font-bold">{calculatorInputs.caloricDeficitPercent > 0 ? '-' : '+'}{Math.abs(calculatorInputs.caloricDeficitPercent)}%</span>
                    </div>
                    <Slider
                      value={[calculatorInputs.caloricDeficitPercent]}
                      onValueChange={([value]) => setCalculatorInput('caloricDeficitPercent', value)}
                      min={-20}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>+20%</span>
                      <span>0%</span>
                      <span>-20%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 2: Activity Table (The Engine) */}
            <div className="bg-white rounded-xl p-4">
              <Card className="rounded-xl shadow-sm border h-full">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 text-right">
                      <Activity className="h-3.5 w-3.5" />
                      פעילות גופנית (METS)
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addActivityEntry}
                      className="h-6 text-[10px] px-2 rounded-lg"
                    >
                      <Plus className="h-3 w-3 ml-1" />
                      הוסף
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-2">
                    <div className="max-h-[320px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-7 text-[10px] text-right p-1.5">סוג פעילות</TableHead>
                            <TableHead className="h-7 text-[10px] w-16 text-center p-1.5">
                              METS
                            </TableHead>
                            <TableHead className="h-7 text-[10px] w-20 text-center p-1.5">דקות/שבוע</TableHead>
                            <TableHead className="h-7 text-[10px] w-8 p-1.5"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityEntries.map((entry) => {
                            const weeklyEE = entry.mets * calculatorInputs.weight * (entry.minutesPerWeek / 60);
                            return (
                              <TableRow key={entry.id}>
                                <TableCell className="p-1.5">
                                  <Input
                                    value={entry.activityType}
                                    onChange={(e) => updateActivityEntry(entry.id, { activityType: e.target.value })}
                                    placeholder="פעילות"
                                    className="h-6 text-xs"
                                    dir="rtl"
                                  />
                                </TableCell>
                                <TableCell className="p-1.5">
                                  <Input
                                    type="number"
                                    value={entry.mets || ''}
                                    onChange={(e) => updateActivityEntry(entry.id, { mets: parseFloat(e.target.value) || 0 })}
                                    dir="ltr"
                                    className="h-6 text-xs text-center"
                                    min="0"
                                    step="0.1"
                                  />
                                </TableCell>
                                <TableCell className="p-1.5">
                                  <Input
                                    type="number"
                                    value={entry.minutesPerWeek || ''}
                                    onChange={(e) => updateActivityEntry(entry.id, { minutesPerWeek: parseInt(e.target.value) || 0 })}
                                    dir="ltr"
                                    className="h-6 text-xs text-center"
                                    min="0"
                                  />
                                </TableCell>
                                <TableCell className="p-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeActivityEntry(entry.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex flex-col gap-1 pt-2 border-t text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">סה״כ דקות:</span>
                        <span className="font-semibold">{totalWeeklyMinutes}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">הוצאה יומית:</span>
                        <span className="font-semibold text-green-600">{exerciseEE} קק״ל</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 3: Macro Targets & Calculated Metrics (Results Section) */}
            <div className="space-y-4 bg-slate-50/30 rounded-xl p-4">
              {/* Macro Targets Card */}
              <Card className="rounded-xl shadow-sm border">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-right">
                    <Target className="h-3.5 w-3.5" />
                    יעדי מקרו-נוטריאנטים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-3">
                  {/* Grams per KG Inputs - Compact */}
                  <div className="space-y-2 p-2 bg-muted/30 rounded-lg">
                    <Label className="text-[10px] font-semibold text-right block">גרם/ק"ג משקל</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <Label className="text-[10px] mb-0.5 block text-center">חלבון</Label>
                        <Input
                          type="number"
                          value={calculatorInputs.proteinPerKg}
                          onChange={(e) => setCalculatorInput('proteinPerKg', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="1.5"
                          max="3.0"
                          step="0.1"
                          className="h-6 text-xs text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] mb-0.5 block text-center">שומן</Label>
                        <Input
                          type="number"
                          value={calculatorInputs.fatPerKg}
                          onChange={(e) => setCalculatorInput('fatPerKg', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          className="h-6 text-xs text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] mb-0.5 block text-center">פחמימות</Label>
                        <Input
                          type="number"
                          value={calculatorInputs.carbsPerKg}
                          onChange={(e) => setCalculatorInput('carbsPerKg', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="1.0"
                          max="4.0"
                          step="0.1"
                          className="h-6 text-xs text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Final Target Cards - 2x3 Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <MacroInputCard
                      label="קלוריות"
                      icon={Flame}
                      value={targets.calories}
                      onChange={(val) => setTarget('calories', val)}
                      unit="קק״ל"
                      color={MACRO_COLORS.calories}
                    />
                    <MacroInputCard
                      label="חלבון"
                      icon={Beef}
                      value={targets.protein}
                      onChange={(val) => setTarget('protein', val)}
                      unit="גרם"
                      color={MACRO_COLORS.protein}
                    />
                    <MacroInputCard
                      label="פחמימות"
                      icon={Wheat}
                      value={targets.carbs}
                      onChange={(val) => setTarget('carbs', val)}
                      unit="גרם"
                      color={MACRO_COLORS.carbs}
                    />
                    <MacroInputCard
                      label="שומן"
                      icon={Droplets}
                      value={targets.fat}
                      onChange={(val) => setTarget('fat', val)}
                      unit="גרם"
                      color={MACRO_COLORS.fat}
                    />
                    <MacroInputCard
                      label="סיבים"
                      icon={Leaf}
                      value={targets.fiber}
                      onChange={(val) => setTarget('fiber', val)}
                      unit="גרם"
                      color={MACRO_COLORS.fiber}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Calculated Metrics Card */}
              <Card className="rounded-xl shadow-sm border">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm text-right">מדדים מחושבים</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200/50">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">% שומן</Label>
                      <p className="text-lg font-bold text-blue-700">{bodyFatPercent !== null ? bodyFatPercent.toFixed(1) : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-200/50">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">LBM (ק"ג)</Label>
                      <p className="text-lg font-bold text-purple-700">{lbm !== null ? lbm.toFixed(1) : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg border border-amber-200/50">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">BMR</Label>
                      <p className="text-lg font-bold text-amber-700">{bmrResults.average}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">קק״ל/יום</p>
                    </div>
                    <div className="text-center p-2 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg border border-green-200/50">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">TDEE</Label>
                      <p className="text-lg font-bold text-green-700">{tdee}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">קק״ל/יום</p>
                    </div>
                  </div>
                  
                  {/* BMR Formula Details */}
                  <div className="mt-2 pt-2 border-t grid grid-cols-3 gap-1.5">
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">MSJ</p>
                      <p className="text-xs font-semibold">{bmrResults.mifflinStJeor}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">HB</p>
                      <p className="text-xs font-semibold">{bmrResults.harrisBenedict}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">KM</p>
                      <p className="text-xs font-semibold">{bmrResults.katchMcArdle || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Visual Analysis Section: Charts Side-by-Side */}
          <Card className="rounded-xl shadow-sm border">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2 text-right">
                <BarChart3 className="h-4 w-4" />
                סיכום ויזואלי של התכנית
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={donutChartOptions}
                    containerProps={{ style: { height: '100%', width: '100%' } }}
                  />
                </div>
                <div>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={columnChartOptions}
                    containerProps={{ style: { height: '100%', width: '100%' } }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-white p-4 flex gap-3 flex-shrink-0" dir="rtl">
          <Button
            type="submit"
            className="flex-1 h-10 text-sm bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-xl font-semibold"
            disabled={isSubmitting || !name.trim()}
          >
            שמור {mode === 'template' ? 'תבנית' : 'תוכנית'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-10 text-sm rounded-xl font-semibold"
          >
            ביטול
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
};
