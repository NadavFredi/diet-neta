/**
 * DailyCheckInView Component - Luxury Daily Check-in
 * 
 * Comprehensive daily check-in form with 19 metrics organized in a premium single-screen layout.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Target,
  TrendingUp,
  Activity,
  Footprints,
  UtensilsCrossed,
  Scale,
  Ruler,
  Flame,
  Droplet,
  Moon,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DailyCheckInViewProps {
  customerId: string | null;
}

// Helper component for numeric input with suffix
const NumberInputWithSuffix: React.FC<{
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  icon?: React.ReactNode;
}> = ({ id, label, value, onChange, suffix, placeholder, min, max, step = 1, icon }) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        {icon && <span className="h-3.5 w-3.5">{icon}</span>}
        {label}
      </Label>
      <div className="relative flex items-center">
        <Input
          id={id}
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? null : parseFloat(val));
          }}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="pr-12 text-sm h-9 border-gray-200 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]/20"
          dir="ltr"
        />
        <span className="absolute right-3 text-xs text-gray-500 font-medium">{suffix}</span>
      </div>
    </div>
  );
};

// Helper component for stepper (+/- buttons)
const StepperInput: React.FC<{
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
  icon?: React.ReactNode;
}> = ({ id, label, value, onChange, suffix, min = 0, max, step = 0.25, icon }) => {
  const numValue = value ?? 0;
  
  const handleIncrement = () => {
    const newValue = Math.min(numValue + step, max ?? Infinity);
    onChange(newValue);
  };
  
  const handleDecrement = () => {
    const newValue = Math.max(numValue - step, min);
    onChange(newValue > min ? newValue : null);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        {icon && <span className="h-3.5 w-3.5">{icon}</span>}
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-gray-200 hover:bg-gray-50"
          onClick={handleDecrement}
          disabled={numValue <= min}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="relative flex-1">
          <Input
            id={id}
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === '' ? null : parseFloat(val));
            }}
            min={min}
            max={max}
            step={step}
            className="pr-12 text-center text-sm h-9 border-gray-200 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]/20"
            dir="ltr"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">{suffix}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-gray-200 hover:bg-gray-50"
          onClick={handleIncrement}
          disabled={max !== undefined && numValue >= max}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

// Helper component for 1-10 scale slider
const ScaleSlider: React.FC<{
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  icon?: React.ReactNode;
}> = ({ id, label, value, onChange, icon }) => {
  const sliderValue = value ?? 5;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        {icon && <span className="h-3.5 w-3.5">{icon}</span>}
        {label}
      </Label>
      <div className="space-y-1.5">
        <Slider
          id={id}
          value={[sliderValue]}
          onValueChange={([val]) => onChange(val)}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>1</span>
          <span className="text-base font-semibold text-[#5B6FB9]">{sliderValue}</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
};

export const DailyCheckInView: React.FC<DailyCheckInViewProps> = ({ customerId }) => {
  const {
    todayCheckIn,
    isLoading,
    isSubmitting,
    submitCheckIn,
    complianceStats,
  } = useDailyCheckIn(customerId);

  // Physical measurements (6 fields)
  const [weight, setWeight] = useState<number | null>(null);
  const [bellyCircumference, setBellyCircumference] = useState<number | null>(null);
  const [waistCircumference, setWaistCircumference] = useState<number | null>(null);
  const [thighCircumference, setThighCircumference] = useState<number | null>(null);
  const [armCircumference, setArmCircumference] = useState<number | null>(null);
  const [neckCircumference, setNeckCircumference] = useState<number | null>(null);

  // Activity metrics (4 fields)
  const [stepsActual, setStepsActual] = useState<number | null>(null);
  const [exercisesCount, setExercisesCount] = useState<number | null>(null);
  const [cardioAmount, setCardioAmount] = useState<number | null>(null);
  const [intervalsCount, setIntervalsCount] = useState<number | null>(null);

  // Nutrition and Hydration (4 fields)
  const [caloriesDaily, setCaloriesDaily] = useState<number | null>(null);
  const [proteinDaily, setProteinDaily] = useState<number | null>(null);
  const [fiberDaily, setFiberDaily] = useState<number | null>(null);
  const [waterAmount, setWaterAmount] = useState<number | null>(null);

  // Well-being scales (3 fields)
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [hungerLevel, setHungerLevel] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);

  // Rest (1 field)
  const [sleepHours, setSleepHours] = useState<number | null>(null);

  // Notes
  const [notes, setNotes] = useState('');

  // Auto-fill from today's check-in
  useEffect(() => {
    if (todayCheckIn) {
      setWeight(todayCheckIn.weight ?? null);
      setBellyCircumference(todayCheckIn.belly_circumference ?? null);
      setWaistCircumference(todayCheckIn.waist_circumference ?? null);
      setThighCircumference(todayCheckIn.thigh_circumference ?? null);
      setArmCircumference(todayCheckIn.arm_circumference ?? null);
      setNeckCircumference(todayCheckIn.neck_circumference ?? null);
      setStepsActual(todayCheckIn.steps_actual ?? null);
      setExercisesCount(todayCheckIn.exercises_count ?? null);
      setCardioAmount(todayCheckIn.cardio_amount ?? null);
      setIntervalsCount(todayCheckIn.intervals_count ?? null);
      setCaloriesDaily(todayCheckIn.calories_daily ?? null);
      setProteinDaily(todayCheckIn.protein_daily ?? null);
      setFiberDaily(todayCheckIn.fiber_daily ?? null);
      setWaterAmount(todayCheckIn.water_amount ?? null);
      setStressLevel(todayCheckIn.stress_level ?? null);
      setHungerLevel(todayCheckIn.hunger_level ?? null);
      setEnergyLevel(todayCheckIn.energy_level ?? null);
      setSleepHours(todayCheckIn.sleep_hours ?? null);
      setNotes(todayCheckIn.notes ?? '');
    }
  }, [todayCheckIn]);

  // Validation
  const isFormValid = () => {
    // All fields are optional, but we can add validation rules here if needed
    // For example, ensure scales are within 1-10 range (handled by slider)
    return true;
  };

  const handleSubmit = () => {
    if (!isFormValid()) return;

    submitCheckIn({
      // Physical measurements
      weight,
      belly_circumference: bellyCircumference,
      waist_circumference: waistCircumference,
      thigh_circumference: thighCircumference,
      arm_circumference: armCircumference,
      neck_circumference: neckCircumference,
      // Activity metrics
      steps_actual: stepsActual,
      exercises_count: exercisesCount,
      cardio_amount: cardioAmount,
      intervals_count: intervalsCount,
      // Nutrition and Hydration
      calories_daily: caloriesDaily,
      protein_daily: proteinDaily,
      fiber_daily: fiberDaily,
      water_amount: waterAmount,
      // Well-being scales
      stress_level: stressLevel,
      hunger_level: hungerLevel,
      energy_level: energyLevel,
      // Rest
      sleep_hours: sleepHours,
      // Notes
      notes: notes.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-slate-200">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#5B6FB9] mb-2"></div>
            <p className="text-sm text-gray-600">טוען דיווח יומי...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with Stats */}
      <Card className="border border-gray-200 bg-gradient-to-br from-[#5B6FB9]/5 to-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#5B6FB9]" />
            דיווח יומי - {today}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Workout Card */}
            <div className="bg-white rounded-lg py-3 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <Activity className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">אימון</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.workout}%</span>
            </div>
            
            {/* Steps Card */}
            <div className="bg-white rounded-lg py-3 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <Footprints className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">צעדים</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.steps}%</span>
            </div>
            
            {/* Nutrition Card */}
            <div className="bg-white rounded-lg py-3 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <UtensilsCrossed className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">תזונה</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.nutrition}%</span>
            </div>
            
            {/* Overall Card */}
            <div className="bg-white rounded-lg py-3 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <TrendingUp className="h-5 w-5 text-[#5B6FB9] flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">כללי</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.overall}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-In Form - Luxury Grid Layout */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Physical Measurements (מדדי גוף) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                <Scale className="h-4 w-4 text-[#5B6FB9]" />
                <h3 className="text-base font-semibold text-gray-900">מדדי גוף</h3>
              </div>
              <NumberInputWithSuffix
                id="weight"
                label="משקל"
                value={weight}
                onChange={setWeight}
                suffix="ק״ג"
                min={0}
                step={0.1}
                icon={<Scale className="h-3.5 w-3.5 text-gray-500" />}
              />
              <NumberInputWithSuffix
                id="belly"
                label="היקף בטן"
                value={bellyCircumference}
                onChange={setBellyCircumference}
                suffix="ס״מ"
                min={0}
                icon={<Ruler className="h-3.5 w-3.5 text-gray-500" />}
              />
              <NumberInputWithSuffix
                id="waist"
                label="היקף מותן"
                value={waistCircumference}
                onChange={setWaistCircumference}
                suffix="ס״מ"
                min={0}
                icon={<Ruler className="h-3.5 w-3.5 text-gray-500" />}
              />
              <NumberInputWithSuffix
                id="thigh"
                label="היקף ירכיים"
                value={thighCircumference}
                onChange={setThighCircumference}
                suffix="ס״מ"
                min={0}
                icon={<Ruler className="h-3.5 w-3.5 text-gray-500" />}
              />
              <NumberInputWithSuffix
                id="arm"
                label="היקף יד"
                value={armCircumference}
                onChange={setArmCircumference}
                suffix="ס״מ"
                min={0}
                icon={<Ruler className="h-3.5 w-3.5 text-gray-500" />}
              />
              <NumberInputWithSuffix
                id="neck"
                label="היקף צוואר"
                value={neckCircumference}
                onChange={setNeckCircumference}
                suffix="ס״מ"
                min={0}
                icon={<Ruler className="h-3.5 w-3.5 text-gray-500" />}
              />
            </div>

            {/* Column 2: Activity & Nutrition */}
            <div className="space-y-6">
              {/* Activity Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-900">פעילות</h3>
                </div>
                <NumberInputWithSuffix
                  id="steps"
                  label="מס' צעדים יומי"
                  value={stepsActual}
                  onChange={setStepsActual}
                  suffix="צעדים"
                  min={0}
                  icon={<Footprints className="h-3.5 w-3.5 text-green-600" />}
                />
                <NumberInputWithSuffix
                  id="exercises"
                  label="כמה תרגילים עשית"
                  value={exercisesCount}
                  onChange={setExercisesCount}
                  suffix="תרגילים"
                  min={0}
                  icon={<Activity className="h-3.5 w-3.5 text-blue-600" />}
                />
                <NumberInputWithSuffix
                  id="cardio"
                  label="כמה אירובי עשית"
                  value={cardioAmount}
                  onChange={setCardioAmount}
                  suffix="דקות"
                  min={0}
                  icon={<Activity className="h-3.5 w-3.5 text-red-600" />}
                />
                <NumberInputWithSuffix
                  id="intervals"
                  label="כמה אינטרוולים"
                  value={intervalsCount}
                  onChange={setIntervalsCount}
                  suffix="אינטרוולים"
                  min={0}
                  icon={<Activity className="h-3.5 w-3.5 text-purple-600" />}
                />
              </div>

              {/* Nutrition & Hydration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-gray-900">תזונה</h3>
                </div>
                <NumberInputWithSuffix
                  id="calories"
                  label="קלוריות יומי"
                  value={caloriesDaily}
                  onChange={setCaloriesDaily}
                  suffix="קק״ל"
                  min={0}
                  icon={<Flame className="h-3.5 w-3.5 text-orange-600" />}
                />
                <NumberInputWithSuffix
                  id="protein"
                  label="חלבון יומי"
                  value={proteinDaily}
                  onChange={setProteinDaily}
                  suffix="גרם"
                  min={0}
                  icon={<UtensilsCrossed className="h-3.5 w-3.5 text-orange-600" />}
                />
                <NumberInputWithSuffix
                  id="fiber"
                  label="סיבים יומי"
                  value={fiberDaily}
                  onChange={setFiberDaily}
                  suffix="גרם"
                  min={0}
                  icon={<UtensilsCrossed className="h-3.5 w-3.5 text-green-600" />}
                />
                <StepperInput
                  id="water"
                  label="כמה מים שתית"
                  value={waterAmount}
                  onChange={setWaterAmount}
                  suffix="ליטר"
                  min={0}
                  max={10}
                  step={0.25}
                  icon={<Droplet className="h-3.5 w-3.5 text-blue-600" />}
                />
              </div>
            </div>

            {/* Column 3: Well-being, Rest & Notes */}
            <div className="space-y-6">
              {/* Well-being Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <TrendingUp className="h-4 w-4 text-[#5B6FB9]" />
                  <h3 className="text-base font-semibold text-gray-900">Wellness</h3>
                </div>
                <ScaleSlider
                  id="stress"
                  label="רמת הלחץ היומי"
                  value={stressLevel}
                  onChange={setStressLevel}
                  icon={<AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                />
                <ScaleSlider
                  id="hunger"
                  label="רמת הרעב שלך"
                  value={hungerLevel}
                  onChange={setHungerLevel}
                  icon={<UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />}
                />
                <ScaleSlider
                  id="energy"
                  label="רמת האנרגיה שלך"
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  icon={<Flame className="h-3.5 w-3.5 text-yellow-500" />}
                />
              </div>

              {/* Rest Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Moon className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-base font-semibold text-gray-900">מנוחה</h3>
                </div>
                <StepperInput
                  id="sleep"
                  label="כמה שעות ישנת"
                  value={sleepHours}
                  onChange={setSleepHours}
                  suffix="שעות"
                  min={0}
                  max={24}
                  step={0.5}
                  icon={<Moon className="h-3.5 w-3.5 text-indigo-600" />}
                />
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-gray-500" />
                  הערות (אופציונלי)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הוסף הערות על היום שלך, איך הרגשת, מה היו האתגרים, או כל דבר אחר שתרצה לשתף..."
                  className="min-h-[120px] text-sm border-gray-200 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]/20 resize-none"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* Fixed Footer with Submit Button */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid()}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white px-8 py-2.5 text-sm font-medium shadow-sm"
            >
              {isSubmitting ? 'שומר...' : 'שמור דיווח'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
