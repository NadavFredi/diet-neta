import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
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
  Lock,
  Unlock,
  Footprints,
  Dumbbell,
  Pill,
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
    manualOverride,
    manualFields,
    calculatorInputs,
    activityEntries,
    calculatorOpen,
    setName,
    setDescription,
    setTarget,
    setManualOverride,
    setManualField,
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
  
  // Local state for input values to prevent focus loss while typing
  const [localInputValues, setLocalInputValues] = useState<Record<string, { mets?: string; minutes?: string }>>({});
  
  // Initialize local input values from activityEntries (only when entries are added/removed, not on value changes)
  useEffect(() => {
    setLocalInputValues((prev) => {
      const newLocalValues: Record<string, { mets?: string; minutes?: string }> = {};
      let hasNewEntries = false;
      
      activityEntries.forEach((entry) => {
        // Only initialize if this entry doesn't have local state yet (new entry or first load)
        if (!prev[entry.id]) {
          hasNewEntries = true;
          const metsVal = entry.mets != null && typeof entry.mets === 'number' && !isNaN(entry.mets) ? String(entry.mets) : '';
          const minutesVal = entry.minutesPerWeek != null && typeof entry.minutesPerWeek === 'number' && !isNaN(entry.minutesPerWeek) ? String(entry.minutesPerWeek) : '';
          newLocalValues[entry.id] = { mets: metsVal, minutes: minutesVal };
        } else {
          // Keep existing local state (preserves values being typed)
          newLocalValues[entry.id] = prev[entry.id];
        }
      });
      
      // Only update if there are new entries or entries were removed
      if (hasNewEntries || Object.keys(prev).length !== activityEntries.length) {
        return newLocalValues;
      }
      return prev;
    });
  }, [activityEntries.length, activityEntries.map(e => e.id).join(',')]); // Only update when entries are added/removed, not on value changes

  // Auto-apply calculated values when inputs change (only if not manually overridden)
  useEffect(() => {
    // Only auto-apply if at least one field is not manually overridden
    const hasAutoFields = !manualOverride.calories || !manualOverride.protein || 
                         !manualOverride.carbs || !manualOverride.fat || !manualOverride.fiber;
    
    if (hasAutoFields) {
      const timer = setTimeout(() => {
        if (calculatorInputs.weight > 0 && calculatorInputs.height > 0 && calculatorInputs.age > 0) {
          applyCalculatedValues();
        }
      }, AUTO_APPLY_THRESHOLD);

      return () => clearTimeout(timer);
    }
  }, [
    calculatorInputs.weight,
    calculatorInputs.height,
    calculatorInputs.age,
    calculatorInputs.gender,
    calculatorInputs.pal,
    calculatorInputs.caloricDeficitPercent,
    calculatorInputs.caloricDeficitCalories,
    calculatorInputs.caloricDeficitMode,
    calculatorInputs.proteinPerKg,
    calculatorInputs.fatPerKg,
    calculatorInputs.carbsPerKg,
    activityEntries,
    applyCalculatedValues,
    manualOverride,
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

  // Highcharts Donut Chart for Macro Distribution (Compact for grid)
  const donutChartOptions = useMemo((): Highcharts.Options => {
    const proteinCalories = (targets.protein || 0) * 4;
    const carbsCalories = (targets.carbs || 0) * 4;
    const fatCalories = (targets.fat || 0) * 9;
    const total = proteinCalories + carbsCalories + fatCalories;

    if (total === 0) {
      return {
        chart: { type: 'pie', height: 220, backgroundColor: 'transparent' },
        title: { text: '' },
        series: [{ type: 'pie', data: [] }],
        credits: { enabled: false },
      };
    }

    return {
      chart: {
        type: 'pie',
        height: 250, // Fixed height that will scale with container
        backgroundColor: 'transparent',
      },
      title: {
        text: 'סיכום ויזואלי',
        style: {
          fontSize: '12px',
          fontWeight: '600',
          fontFamily: 'Heebo, system-ui, sans-serif',
        },
      },
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
              fontSize: '10px',
            },
            distance: 12,
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
          fontSize: '10px',
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

  // Column chart removed - space used for better grid layout

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent forms
    setIsSubmitting(true);
    try {
      // Save any pending local input values before submitting
      // This ensures values typed but not yet saved (via Enter) are persisted
      const pendingUpdates: Array<{ id: string; updates: Partial<ActivityEntry> }> = [];
      
      Object.entries(localInputValues).forEach(([entryId, localValues]) => {
        const entry = activityEntries.find(e => e.id === entryId);
        if (entry) {
          const updates: Partial<ActivityEntry> = {};
          if (localValues.mets !== undefined) {
            const metsVal = localValues.mets.trim();
            const numVal = metsVal === '' ? 0 : parseFloat(metsVal);
            const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
            if (finalVal !== entry.mets) {
              updates.mets = finalVal;
            }
          }
          if (localValues.minutes !== undefined) {
            const minutesVal = localValues.minutes.trim();
            const numVal = minutesVal === '' ? 0 : parseInt(minutesVal, 10);
            const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
            if (finalVal !== entry.minutesPerWeek) {
              updates.minutesPerWeek = finalVal;
            }
          }
          if (Object.keys(updates).length > 0) {
            pendingUpdates.push({ id: entryId, updates });
          }
        }
      });
      
      // Apply all pending updates
      pendingUpdates.forEach(({ id, updates }) => {
        updateActivityEntry(id, updates);
      });
      
      // Small delay to ensure state updates are applied
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const data = getNutritionData(mode);
      if (mode === 'template' && data.templateData) {
        onSave(data.templateData);
      } else if (mode === 'user' && data.userData) {
        onSave(data.userData);
      } else {
        throw new Error('Invalid data structure');
      }
    } catch (error: any) {
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
    isManual,
    onLockToggle,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: number;
    onChange: (value: number) => void;
    unit: string;
    color: string;
    isManual?: boolean;
    onLockToggle?: () => void;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localValue, setLocalValue] = useState<string>(value != null ? String(value) : '');
    
    // Sync local value when prop value changes (but not while user is typing)
    useEffect(() => {
      if (document.activeElement !== inputRef.current) {
        setLocalValue(value != null ? String(value) : '');
      }
    }, [value]);
    
    const handleLockToggle = () => {
      // Save current input value when lock is clicked
      if (inputRef.current) {
        const val = inputRef.current.value.trim();
        const numVal = val === '' ? 0 : parseFloat(val);
        const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
        onChange(finalVal);
        setLocalValue(finalVal === 0 ? '' : String(finalVal));
      }
      if (onLockToggle) {
        onLockToggle();
      }
    };
    
    return (
    <Card className={cn(
      "border border-slate-200 hover:border-opacity-80 transition-colors rounded-2xl shadow-sm flex flex-col",
      isManual && "ring-2 ring-amber-400/50"
    )} style={{ borderColor: color }}>
      <CardHeader className="pb-1.5 pt-2 px-2.5 flex-shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1">
            <div className="p-0.5 rounded" style={{ backgroundColor: `${color}15` }}>
              <Icon className="h-3 w-3" style={{ color }} />
            </div>
            <CardTitle className="text-lg font-semibold">{label}</CardTitle>
          </div>
          {onLockToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLockToggle}
                  className="h-6 w-6 p-0"
                >
                  {isManual ? (
                    <Lock className="h-3 w-3 text-amber-600" />
                  ) : (
                    <Unlock className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isManual ? 'נלחץ ידנית - לחץ לשחרור' : 'חישוב אוטומטי - לחץ לנעילה'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2.5 pb-2.5 pt-0 flex-1 flex items-center">
        <div className="flex items-center gap-1.5 w-full">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={(e) => {
              const val = (e.target as HTMLInputElement).value;
              // Allow empty string, numbers, and decimal point while typing
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                // Update local state only (no parent re-render)
                setLocalValue(val);
              }
            }}
            onKeyDown={(e) => {
              // Save on Enter key
              if (e.key === 'Enter') {
                e.preventDefault();
                const target = e.target as HTMLInputElement;
                const val = target.value.trim();
                const numVal = val === '' ? 0 : parseFloat(val);
                const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
                onChange(finalVal);
                setLocalValue(finalVal === 0 ? '' : String(finalVal));
                target.blur();
              }
            }}
            onBlur={(e) => {
              // Don't save on blur - restore original value
              setLocalValue(value != null ? String(value) : '');
            }}
            className="text-xl font-bold text-center h-12 rounded-lg flex-1"
            dir="ltr"
            placeholder="0"
          />
          <span className="text-base font-semibold text-muted-foreground whitespace-nowrap">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-slate-50/50 min-h-0">
          {/* Top Row: Name and Description */}
          <div className="grid grid-cols-3 gap-3 mb-3 flex-shrink-0">
            <div>
              <Label htmlFor="name" className="text-base font-semibold mb-2 block text-right">
                {mode === 'template' ? 'שם התבנית' : 'שם התוכנית'}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode === 'template' ? 'לדוגמה: תבנית חיטוב' : 'שם התוכנית'}
                required
                className="text-base h-11 rounded-3xl"
                dir="rtl"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description" className="text-base font-semibold mb-2 block text-right">
                תיאור
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור התבנית או התוכנית..."
                className="text-base h-11 rounded-3xl"
                dir="rtl"
              />
            </div>
          </div>

          {/* Main 3-Column Bento Grid - Fine Grid Layout */}
          <div className="grid grid-cols-3 gap-3 min-h-[600px] auto-rows-fr">
            {/* Right Column: Biometrics + Chart */}
            <div className="flex flex-col gap-3 min-h-0">
              {/* Biometric Data Card */}
              <Card className="rounded-3xl border border-slate-200 shadow-sm flex-shrink-0">
                <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-1.5 text-right">
                    <Calculator className="h-4 w-4 text-[#5B6FB9]" />
                    נתונים ביומטריים
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 flex flex-col space-y-2">
                  {/* Horizontal Layout: Label Right, Input Left */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="calc-weight" className="text-base font-medium text-right flex-shrink-0 w-24">
                        משקל (ק"ג)
                      </Label>
                      <Input
                        id="calc-weight"
                        type="number"
                        value={calculatorInputs.weight || ''}
                        onChange={(e) => setCalculatorInput('weight', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-9 text-base rounded-lg flex-1"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="calc-height" className="text-base font-medium text-right flex-shrink-0 w-24">
                        גובה (ס"מ)
                      </Label>
                      <Input
                        id="calc-height"
                        type="number"
                        value={calculatorInputs.height || ''}
                        onChange={(e) => setCalculatorInput('height', parseFloat(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-9 text-base rounded-lg flex-1"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="calc-age" className="text-base font-medium text-right flex-shrink-0 w-24">
                        גיל
                      </Label>
                      <Input
                        id="calc-age"
                        type="number"
                        value={calculatorInputs.age || ''}
                        onChange={(e) => setCalculatorInput('age', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        min="1"
                        className="h-9 text-base rounded-lg flex-1"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="calc-gender" className="text-base font-medium text-right flex-shrink-0 w-24">
                        מין
                      </Label>
                      <Select
                        value={calculatorInputs.gender}
                        onValueChange={(value: 'male' | 'female') => setCalculatorInput('gender', value)}
                      >
                        <SelectTrigger id="calc-gender" className="h-9 text-base rounded-lg flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="male">זכר</SelectItem>
                          <SelectItem value="female">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="my-1.5" />

                  {/* Navy Method Measurements */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 justify-end">
                      <Label className="text-sm font-semibold text-right">מדידות גוף (Navy)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs" side="left">
                          <p className="text-base">שיטת Navy לחישוב אחוז שומן</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="calc-waist" className="text-base font-medium text-right flex-shrink-0 w-24">
                          מותן (ס"מ)
                        </Label>
                        <Input
                          id="calc-waist"
                          type="number"
                          value={calculatorInputs.waist || ''}
                          onChange={(e) => setCalculatorInput('waist', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="0"
                          className="h-9 text-base rounded-lg flex-1"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="calc-neck" className="text-base font-medium text-right flex-shrink-0 w-24">
                          צוואר (ס"מ)
                        </Label>
                        <Input
                          id="calc-neck"
                          type="number"
                          value={calculatorInputs.neck || ''}
                          onChange={(e) => setCalculatorInput('neck', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="0"
                          className="h-9 text-base rounded-lg flex-1"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="calc-hip" className="text-base font-medium text-right flex-shrink-0 w-24">
                          היקף אגן (ס"מ)
                        </Label>
                        <Input
                          id="calc-hip"
                          type="number"
                          value={calculatorInputs.hip || ''}
                          onChange={(e) => setCalculatorInput('hip', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="0"
                          className="h-9 text-base rounded-lg flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Donut Chart (Macro Distribution) - Moved to right column below biometrics */}
              <Card className="rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-1.5 text-right">
                    <BarChart3 className="h-4 w-4 text-[#5B6FB9]" />
                    סיכום ויזואלי
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '200px' }}>
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={donutChartOptions}
                      containerProps={{ 
                        style: { 
                          height: '100%', 
                          width: '100%',
                        } 
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column: Activity Level + METS Table */}
            <div className="flex flex-col gap-3 min-h-0">
              {/* Activity Level & Goals Card - Moved here, same level as METS */}
              <Card className="rounded-3xl border border-slate-200 shadow-sm flex-shrink-0">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-1.5 text-right">
                    <Activity className="h-4 w-4 text-[#5B6FB9]" />
                    רמת פעילות ומטרות
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 justify-end">
                      <Label className="text-base font-semibold text-right">רמת פעילות (PAL)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs" side="left">
                          <p className="text-base">Physical Activity Level</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={calculatorInputs.pal.toString()}
                      onValueChange={(value) => setCalculatorInput('pal', parseFloat(value))}
                    >
                      <SelectTrigger className="h-10 text-base rounded-lg">
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-base font-semibold text-right">
                          {calculatorInputs.caloricDeficitMode === 'percent' 
                            ? 'גרעון/עודף קלורי (%)' 
                            : 'גרעון/עודף קלורי (קק"ל)'}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs" side="left">
                            <p className="text-sm">
                              {calculatorInputs.caloricDeficitMode === 'percent'
                                ? 'אחוז גרעון או עודף קלורי'
                                : 'כמות קלוריות להוספה או הפחתה'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium transition-colors",
                          calculatorInputs.caloricDeficitMode === 'percent' 
                            ? "text-foreground font-semibold" 
                            : "text-muted-foreground"
                        )}>
                          אחוז
                        </span>
                        <div dir="ltr" className="inline-block">
                          <Switch
                            checked={calculatorInputs.caloricDeficitMode === 'calories'}
                            onCheckedChange={(checked) => {
                              setCalculatorInput('caloricDeficitMode', checked ? 'calories' : 'percent');
                            }}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-medium transition-colors",
                          calculatorInputs.caloricDeficitMode === 'calories' 
                            ? "text-foreground font-semibold" 
                            : "text-muted-foreground"
                        )}>
                          קלוריות
                        </span>
                      </div>
                    </div>
                    
                    {calculatorInputs.caloricDeficitMode === 'percent' ? (
                      <>
                        <div className="mb-2">
                          <span className="text-sm font-bold">
                            {calculatorInputs.caloricDeficitPercent > 0 ? '+' : ''}
                            {calculatorInputs.caloricDeficitPercent}%
                          </span>
                        </div>
                        <div dir="ltr" className="w-full">
                          <Slider
                            value={[calculatorInputs.caloricDeficitPercent]}
                            onValueChange={([value]) => setCalculatorInput('caloricDeficitPercent', value)}
                            min={-20}
                            max={20}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1" dir="ltr">
                          <span>-20%</span>
                          <span>0%</span>
                          <span>+20%</span>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={calculatorInputs.caloricDeficitCalories || ''}
                            onChange={(e) => setCalculatorInput('caloricDeficitCalories', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            dir="ltr"
                            className="h-9 text-sm"
                            min="-2000"
                            max="2000"
                            step="10"
                          />
                          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">קק"ל</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {calculatorInputs.caloricDeficitCalories > 0 
                            ? `+${calculatorInputs.caloricDeficitCalories} קק"ל (עודף)` 
                            : calculatorInputs.caloricDeficitCalories < 0
                            ? `${calculatorInputs.caloricDeficitCalories} קק"ל (גרעון)`
                            : '0 קק"ל (ללא שינוי)'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Physical Activity (METS) Table */}
              <Card className="rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0">
                <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-1.5 text-right">
                      <Activity className="h-4 w-4 text-[#5B6FB9]" />
                      פעילות גופנית (METS)
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addActivityEntry}
                      className="h-8 text-xs px-3 rounded-lg"
                    >
                      <Plus className="h-3 w-3 ml-1" />
                      הוסף
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="h-9 text-sm text-right p-2">סוג פעילות</TableHead>
                          <TableHead className="h-9 text-sm text-center p-2" style={{ minWidth: '80px', width: '80px' }}>METS</TableHead>
                          <TableHead className="h-9 text-sm text-center p-2" style={{ minWidth: '100px', width: '100px' }}>דקות/שבוע</TableHead>
                          <TableHead className="h-9 text-sm w-8 p-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityEntries.map((entry) => {
                          // Use local state for input values to prevent focus loss while typing
                          const metsDisplayValue = localInputValues[entry.id]?.mets ?? 
                            (entry.mets != null && typeof entry.mets === 'number' && !isNaN(entry.mets) ? String(entry.mets) : '');
                          const minutesDisplayValue = localInputValues[entry.id]?.minutes ?? 
                            (entry.minutesPerWeek != null && typeof entry.minutesPerWeek === 'number' && !isNaN(entry.minutesPerWeek) ? String(entry.minutesPerWeek) : '');
                          
                          return (
                          <TableRow key={entry.id}>
                            <TableCell className="p-2">
                              <Input
                                value={entry.activityType}
                                onChange={(e) => updateActivityEntry(entry.id, { activityType: e.target.value })}
                                placeholder="פעילות"
                                className="h-8 text-sm"
                                dir="rtl"
                              />
                            </TableCell>
                            <TableCell className="p-2" style={{ minWidth: '80px', width: '80px' }}>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={metsDisplayValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow empty string, numbers, and decimal point while typing
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    // Update local state only (no re-render of parent)
                                    setLocalInputValues((prev) => ({
                                      ...prev,
                                      [entry.id]: { ...prev[entry.id], mets: val }
                                    }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Save on Enter key
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const target = e.target as HTMLInputElement;
                                    const val = target.value.trim();
                                    const numVal = val === '' ? 0 : parseFloat(val);
                                    const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
                                    // Save to parent state immediately
                                    updateActivityEntry(entry.id, { mets: finalVal });
                                    // Update local state to match saved value
                                    setLocalInputValues((prev) => ({
                                      ...prev,
                                      [entry.id]: { ...prev[entry.id], mets: finalVal === 0 ? '' : String(finalVal) }
                                    }));
                                    target.blur();
                                  }
                                }}
                                onBlur={(e) => {
                                  // On blur, if value changed but wasn't saved (no Enter), save it
                                  const target = e.target as HTMLInputElement;
                                  const val = target.value.trim();
                                  const numVal = val === '' ? 0 : parseFloat(val);
                                  const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
                                  // Check if value differs from current entry value
                                  if (finalVal !== entry.mets) {
                                    updateActivityEntry(entry.id, { mets: finalVal });
                                    setLocalInputValues((prev) => ({
                                      ...prev,
                                      [entry.id]: { ...prev[entry.id], mets: finalVal === 0 ? '' : String(finalVal) }
                                    }));
                                  }
                                }}
                                dir="ltr"
                                className="h-8 text-sm text-center w-full"
                                style={{ minWidth: '60px' }}
                                placeholder="0.0"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={minutesDisplayValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow only digits while typing
                                  if (val === '' || /^\d+$/.test(val)) {
                                    // Update local state only (no re-render of parent)
                                    setLocalInputValues((prev) => ({
                                      ...prev,
                                      [entry.id]: { ...prev[entry.id], minutes: val }
                                    }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Save on Enter key
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const target = e.target as HTMLInputElement;
                                    const val = target.value.trim();
                                    const numVal = val === '' ? 0 : parseInt(val, 10);
                                    const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
                                    // Save to parent state immediately
                                    updateActivityEntry(entry.id, { minutesPerWeek: finalVal });
                                    // Update local state to match saved value
                                    setLocalInputValues((prev) => ({
                                      ...prev,
                                      [entry.id]: { ...prev[entry.id], minutes: finalVal === 0 ? '' : String(finalVal) }
                                    }));
                                    target.blur();
                                  }
                                }}
                                onBlur={(e) => {
                                  // On blur, if value changed but wasn't saved (no Enter), save it
                                  const target = e.target as HTMLInputElement;
                                  const val = target.value.trim();
                                  const numVal = val === '' ? 0 : parseInt(val, 10);
                                  const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
                                  // Check if value differs from current entry value
                                  if (finalVal !== entry.minutesPerWeek) {
                                    updateActivityEntry(entry.id, { minutesPerWeek: finalVal });
                                    setLocalInputValues((prev) => ({
                                      ...prev,
                                      [entry.id]: { ...prev[entry.id], minutes: finalVal === 0 ? '' : String(finalVal) }
                                    }));
                                  }
                                }}
                                dir="ltr"
                                className="h-8 text-sm text-center"
                                placeholder="0"
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
                  <div className="flex flex-col gap-1.5 pt-2 border-t text-sm flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">סה״כ דקות:</span>
                      <span className="font-semibold">{totalWeeklyMinutes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">הוצאה יומית:</span>
                      <span className="font-semibold text-green-600">{exerciseEE} קק״ל</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Left Column: Output & Results (Macro Targets + Calculated Metrics) */}
            <div className="flex flex-col gap-3 min-h-0">
              {/* Macro Targets Card */}
              <Card className="rounded-3xl border border-slate-200 shadow-sm flex-shrink-0">
                <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-right">
                    <Target className="h-4 w-4 text-[#5B6FB9]" />
                    יעדי מקרו-נוטריאנטים
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 flex flex-col space-y-2.5">
                  {/* Grams per KG Inputs */}
                  <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-lg flex-shrink-0">
                    <Label className="text-sm font-semibold text-right block mb-1.5">גרם/ק"ג משקל</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-sm mb-1 block text-center">חלבון</Label>
                        <Input
                          type="number"
                          value={calculatorInputs.proteinPerKg}
                          onChange={(e) => setCalculatorInput('proteinPerKg', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="1.5"
                          max="3.0"
                          step="0.1"
                          className="h-9 text-sm text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block text-center">שומן</Label>
                        <Input
                          type="number"
                          value={calculatorInputs.fatPerKg}
                          onChange={(e) => setCalculatorInput('fatPerKg', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          className="h-9 text-sm text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block text-center">פחמימות</Label>
                        <Input
                          type="number"
                          value={calculatorInputs.carbsPerKg}
                          onChange={(e) => setCalculatorInput('carbsPerKg', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          min="1.0"
                          max="4.0"
                          step="0.1"
                          className="h-9 text-sm text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Final Target Cards - 3 columns Grid */}
                  <div className="grid grid-cols-3 gap-2 flex-shrink-0">
                    <MacroInputCard
                      label="קלוריות"
                      icon={Flame}
                      value={targets.calories}
                      onChange={(val) => setTarget('calories', val, true)}
                      unit="קק״ל"
                      color={MACRO_COLORS.calories}
                      isManual={manualOverride.calories}
                      onLockToggle={() => setManualOverride('calories', !manualOverride.calories)}
                    />
                    <MacroInputCard
                      label="חלבון"
                      icon={Beef}
                      value={targets.protein}
                      onChange={(val) => setTarget('protein', val, true)}
                      unit="גרם"
                      color={MACRO_COLORS.protein}
                      isManual={manualOverride.protein}
                      onLockToggle={() => setManualOverride('protein', !manualOverride.protein)}
                    />
                    <MacroInputCard
                      label="פחמימות"
                      icon={Wheat}
                      value={targets.carbs}
                      onChange={(val) => setTarget('carbs', val, true)}
                      unit="גרם"
                      color={MACRO_COLORS.carbs}
                      isManual={manualOverride.carbs}
                      onLockToggle={() => setManualOverride('carbs', !manualOverride.carbs)}
                    />
                    <MacroInputCard
                      label="שומן"
                      icon={Droplets}
                      value={targets.fat}
                      onChange={(val) => setTarget('fat', val, true)}
                      unit="גרם"
                      color={MACRO_COLORS.fat}
                      isManual={manualOverride.fat}
                      onLockToggle={() => setManualOverride('fat', !manualOverride.fat)}
                    />
                    <MacroInputCard
                      label="סיבים"
                      icon={Leaf}
                      value={targets.fiber}
                      onChange={(val) => setTarget('fiber', val, true)}
                      unit="גרם"
                      color={MACRO_COLORS.fiber}
                      isManual={manualOverride.fiber}
                      onLockToggle={() => setManualOverride('fiber', !manualOverride.fiber)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Calculated Metrics Card */}
              <Card className="rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0">
                  <CardTitle className="text-base font-semibold text-right">מדדים מחושבים</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                    <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-sm text-muted-foreground mb-0.5 block">% שומן</Label>
                      <p className="text-xl font-bold text-blue-700">{bodyFatPercent !== null ? bodyFatPercent.toFixed(1) : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                      <Label className="text-sm text-muted-foreground mb-0.5 block">LBM (ק"ג)</Label>
                      <p className="text-xl font-bold text-purple-700">{lbm !== null ? lbm.toFixed(1) : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <Label className="text-sm text-muted-foreground mb-0.5 block">BMR</Label>
                      <p className="text-xl font-bold text-amber-700">{bmrResults.average}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">קק״ל/יום</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                      <Label className="text-sm text-muted-foreground mb-0.5 block">TDEE</Label>
                      <p className="text-xl font-bold text-green-700">{tdee}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">קק״ל/יום</p>
                    </div>
                  </div>
                  
                  {/* BMR Formula Details */}
                  <div className="mt-1.5 pt-1.5 border-t grid grid-cols-3 gap-1.5 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">MSJ</p>
                      <p className="text-base font-semibold">{bmrResults.mifflinStJeor}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">HB</p>
                      <p className="text-base font-semibold">{bmrResults.harrisBenedict}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">KM</p>
                      <p className="text-base font-semibold">{bmrResults.katchMcArdle || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer Actions - Compact */}
        <div className="border-t bg-white px-4 py-3 flex gap-3 flex-shrink-0" dir="rtl">
          <Button
            type="submit"
            className="h-9 text-sm bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-3xl font-semibold px-6"
            disabled={isSubmitting || !name.trim()}
          >
            שמור {mode === 'template' ? 'תבנית' : 'תוכנית'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 text-sm rounded-3xl font-semibold px-6"
          >
            ביטול
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
};
