/**
 * DailyCheckInView Component - Luxury Daily Check-in (19 Fields)
 * 
 * Complete daily check-in form with all 19 parameters organized in a premium single-screen layout.
 * - Physical: 6 measurements
 * - Activity: 4 metrics
 * - Nutrition/Hydration: 4 fields
 * - Well-being: 3 scales (1-10)
 * - Rest: 1 field
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Activity,
  Footprints,
  UtensilsCrossed,
  TrendingUp,
  Scale,
  Droplet,
  Moon,
  Ruler,
  Plus,
  Minus,
  FileText,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useAppSelector } from '@/store/hooks';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DailyCheckInViewProps {
  customerId: string | null;
}

// Sleek Minimalist Numeric Input Cell - Horizontal Layout (Label + Input on same line) - Enhanced Visibility
const MinimalistInputCell = React.forwardRef<HTMLInputElement, {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}>(({ label, value, onChange, suffix, min, max, step = 1, onKeyDown }, ref) => {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-200" dir="rtl">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xs uppercase tracking-widest text-black font-semibold whitespace-nowrap">
          {label}
        </span>
        <input
          ref={ref}
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? null : parseFloat(val));
          }}
          onKeyDown={onKeyDown}
          min={min}
          max={max}
          step={step}
          className="flex-1 bg-transparent border-0 text-base font-bold text-black focus:outline-none text-right h-7 px-0"
          dir="ltr"
          placeholder="—"
          style={{ textAlign: 'right' }}
        />
      </div>
      <span className="text-xs text-black ml-3 flex-shrink-0 font-medium">{suffix}</span>
    </div>
  );
});
MinimalistInputCell.displayName = 'MinimalistInputCell';

// Stepper Component for Water/Sleep - Enhanced Visibility - Matches MinimalistInputCell Style
const StepperInput = React.forwardRef<HTMLInputElement, {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}>(({ label, value, onChange, suffix, min = 0, max, step = 0.25, onKeyDown }, ref) => {
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
    <div className="flex items-center justify-between py-2.5 border-b border-gray-200" dir="rtl">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xs uppercase tracking-widest text-black font-semibold whitespace-nowrap">
          {label}
        </span>
        <div className="flex items-center gap-1 flex-1">
          <input
            ref={ref}
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === '' ? null : parseFloat(val));
            }}
            onKeyDown={onKeyDown}
            min={min}
            max={max}
            step={step}
            className="flex-1 bg-transparent border-0 text-base font-bold text-black focus:outline-none text-right h-7 px-0"
            dir="ltr"
            placeholder="—"
            style={{ textAlign: 'right' }}
          />
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={numValue <= min}
              className="h-6 w-6 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50 hover:border-[#5B6FB9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="h-3 w-3 text-black" />
            </button>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={max !== undefined && numValue >= max}
              className="h-6 w-6 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50 hover:border-[#5B6FB9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-3 w-3 text-black" />
            </button>
          </div>
        </div>
      </div>
      <span className="text-xs text-black ml-3 flex-shrink-0 font-medium">{suffix}</span>
    </div>
  );
});
StepperInput.displayName = 'StepperInput';

// Ultra-Thin Luxury Slider (Label left, value right, line middle) - Enhanced Visibility
const LuxurySlider: React.FC<{
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}> = ({ label, value, onChange, min = 1, max = 10 }) => {
  const sliderValue = value ?? 5;
  
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-200" dir="rtl">
      {/* Label on right (RTL - visual right) */}
      <div className="w-28 text-right flex-shrink-0">
        <span className="text-xs uppercase tracking-widest text-black font-semibold">
          {label}
        </span>
      </div>
      {/* Ultra-thin slider in middle */}
      <div className="flex-1 relative h-1">
        <Slider
          value={[sliderValue]}
          onValueChange={([val]) => onChange(val)}
          min={min}
          max={max}
          step={1}
          className="h-1 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#5B6FB9]"
        />
      </div>
      {/* Value on left (RTL - visual left) */}
      <div className="w-10 text-left flex-shrink-0">
        <span className="text-lg font-bold text-black">{sliderValue}</span>
      </div>
    </div>
  );
};

// Premium Toggle Switch - Enhanced Visibility
const PremiumToggle: React.FC<{
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ label, checked, onCheckedChange }) => {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-200" dir="rtl">
      <span className="text-xs uppercase tracking-widest text-black font-semibold">
        {label}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-[#5B6FB9] h-6 w-11 [&_[role=switch]]:h-6 [&_[role=switch]]:w-11"
      />
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

  const { activeLead, checkIns } = useAppSelector((state) => state.client);

  // Get goals from daily_protocol
  const dailyProtocol = activeLead?.daily_protocol || {};
  const stepsGoal = dailyProtocol.stepsGoal || 10000;
  const caloriesGoal = dailyProtocol.caloriesGoal || 2000;
  const proteinGoal = dailyProtocol.proteinGoal || 150;

  // All 19 Fields State
  // Physical (6)
  const [weight, setWeight] = useState<number | null>(null);
  const [bellyCircumference, setBellyCircumference] = useState<number | null>(null);
  const [waistCircumference, setWaistCircumference] = useState<number | null>(null);
  const [thighCircumference, setThighCircumference] = useState<number | null>(null);
  const [armCircumference, setArmCircumference] = useState<number | null>(null);
  const [neckCircumference, setNeckCircumference] = useState<number | null>(null);
  
  // Activity (4)
  const [stepsActual, setStepsActual] = useState<number | null>(null);
  const [exercisesCount, setExercisesCount] = useState<number | null>(null);
  const [cardioAmount, setCardioAmount] = useState<number | null>(null);
  const [intervalsCount, setIntervalsCount] = useState<number | null>(null);
  
  // Nutrition/Hydration (4)
  const [caloriesDaily, setCaloriesDaily] = useState<number | null>(null);
  const [proteinDaily, setProteinDaily] = useState<number | null>(null);
  const [fiberDaily, setFiberDaily] = useState<number | null>(null);
  const [waterAmount, setWaterAmount] = useState<number | null>(null);
  
  // Well-being (3)
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [hungerLevel, setHungerLevel] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  
  // Rest (1)
  const [sleepHours, setSleepHours] = useState<number | null>(null);

  // Workout completed (for progress calculation)
  const [workoutCompleted, setWorkoutCompleted] = useState<boolean>(false);

  // Notes
  const [notes, setNotes] = useState<string>('');

  // Input refs for Enter key navigation (order matches visual order)
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Handle Enter key to move to next field
  const handleKeyDown = (currentIndex: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < inputRefs.current.length && inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
        inputRefs.current[nextIndex]?.select();
      }
    }
  };

  // Auto-focus first input field on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  // Auto-fill from today's check-in
  useEffect(() => {
    if (todayCheckIn) {
      // Physical
      setWeight(todayCheckIn.weight ?? null);
      setBellyCircumference(todayCheckIn.belly_circumference ?? null);
      setWaistCircumference(todayCheckIn.waist_circumference ?? null);
      setThighCircumference(todayCheckIn.thigh_circumference ?? null);
      setArmCircumference(todayCheckIn.arm_circumference ?? null);
      setNeckCircumference(todayCheckIn.neck_circumference ?? null);
      // Activity
      setStepsActual(todayCheckIn.steps_actual ?? null);
      setExercisesCount(todayCheckIn.exercises_count ?? null);
      setCardioAmount(todayCheckIn.cardio_amount ?? null);
      setIntervalsCount(todayCheckIn.intervals_count ?? null);
      // Nutrition/Hydration
      setCaloriesDaily(todayCheckIn.calories_daily ?? null);
      setProteinDaily(todayCheckIn.protein_daily ?? null);
      setFiberDaily(todayCheckIn.fiber_daily ?? null);
      setWaterAmount(todayCheckIn.water_amount ?? null);
      // Well-being
      setStressLevel(todayCheckIn.stress_level ?? null);
      setHungerLevel(todayCheckIn.hunger_level ?? null);
      setEnergyLevel(todayCheckIn.energy_level ?? null);
      // Rest
      setSleepHours(todayCheckIn.sleep_hours ?? null);
      // Workout
      setWorkoutCompleted(todayCheckIn.workout_completed ?? false);
      // Notes
      setNotes(todayCheckIn.notes ?? '');
    }
  }, [todayCheckIn]);


  // Validation
  const isFormValid = useMemo(() => {
    // All fields are optional, but we can add validation rules here if needed
    // For example: weight cannot be 0, scales must be 1-10
    if (weight !== null && weight <= 0) return false;
    if (stressLevel !== null && (stressLevel < 1 || stressLevel > 10)) return false;
    if (hungerLevel !== null && (hungerLevel < 1 || hungerLevel > 10)) return false;
    if (energyLevel !== null && (energyLevel < 1 || energyLevel > 10)) return false;
    return true;
  }, [weight, stressLevel, hungerLevel, energyLevel]);

  const handleSubmit = () => {
    if (!isFormValid) return;

    submitCheckIn({
      // Physical (6)
      weight,
      belly_circumference: bellyCircumference,
      waist_circumference: waistCircumference,
      thigh_circumference: thighCircumference,
      arm_circumference: armCircumference,
      neck_circumference: neckCircumference,
      // Activity (4)
      steps_actual: stepsActual,
      exercises_count: exercisesCount,
      cardio_amount: cardioAmount,
      intervals_count: intervalsCount,
      // Nutrition/Hydration (4)
      calories_daily: caloriesDaily,
      protein_daily: proteinDaily,
      fiber_daily: fiberDaily,
      water_amount: waterAmount,
      // Well-being (3)
      stress_level: stressLevel,
      hunger_level: hungerLevel,
      energy_level: energyLevel,
      // Rest (1)
      sleep_hours: sleepHours,
      // Workout
      workout_completed: workoutCompleted,
      // Notes
      notes: notes.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#5B6FB9] mb-2"></div>
          <p className="text-xs text-black">טוען...</p>
        </div>
      </div>
    );
  }

  const today = format(new Date(), 'd בMMMM', { locale: he });

  return (
    <div className="flex flex-col bg-white" dir="rtl">
      {/* Header - Enhanced */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-black">דיווח יומי - {today}</h1>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="h-8 text-xs px-4 font-semibold bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white disabled:opacity-50"
          >
            {isSubmitting ? 'שומר...' : 'שמור דיווח'}
          </Button>
        </div>
      </div>

      {/* Main Content - Clean Checklist Only */}
      <div className="px-3 pt-3 pb-0">
        <div className="h-full flex flex-col gap-3">
          {/* All 19 Metrics - 4-Column Grid (Desktop) / 2-Column (Mobile) - Enhanced */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
            {/* Physical Measurements - מדדי גוף (6 fields) */}
            <Card className="p-4 border border-slate-200 bg-white shadow-sm" dir="rtl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-2" dir="rtl">
                  <Scale className="h-5 w-5 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-widest text-black font-bold">מדדי גוף</span>
                </div>
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[0] = el)}
                  label="משקל"
                  value={weight}
                  onChange={setWeight}
                  suffix="ק״ג"
                  min={0}
                  step={0.1}
                  onKeyDown={handleKeyDown(0)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[1] = el)}
                  label="היקף בטן"
                  value={bellyCircumference}
                  onChange={setBellyCircumference}
                  suffix="ס״מ"
                  min={0}
                  onKeyDown={handleKeyDown(1)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[2] = el)}
                  label="היקף מותן"
                  value={waistCircumference}
                  onChange={setWaistCircumference}
                  suffix="ס״מ"
                  min={0}
                  onKeyDown={handleKeyDown(2)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[3] = el)}
                  label="היקף ירכיים"
                  value={thighCircumference}
                  onChange={setThighCircumference}
                  suffix="ס״מ"
                  min={0}
                  onKeyDown={handleKeyDown(3)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[4] = el)}
                  label="היקף יד"
                  value={armCircumference}
                  onChange={setArmCircumference}
                  suffix="ס״מ"
                  min={0}
                  onKeyDown={handleKeyDown(4)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[5] = el)}
                  label="היקף צוואר"
                  value={neckCircumference}
                  onChange={setNeckCircumference}
                  suffix="ס״מ"
                  min={0}
                  onKeyDown={handleKeyDown(5)}
                />
              </div>
            </Card>

            {/* Activity - פעילות (4 fields) */}
            <Card className="p-4 border border-slate-200 bg-white shadow-sm" dir="rtl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-2" dir="rtl">
                  <Activity className="h-5 w-5 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-widest text-black font-bold">פעילות</span>
                </div>
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[6] = el)}
                  label="מס' צעדים יומי"
                  value={stepsActual}
                  onChange={setStepsActual}
                  suffix="צעדים"
                  min={0}
                  onKeyDown={handleKeyDown(6)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[7] = el)}
                  label="כמה תרגילים עשית"
                  value={exercisesCount}
                  onChange={setExercisesCount}
                  suffix="תרגילים"
                  min={0}
                  onKeyDown={handleKeyDown(7)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[8] = el)}
                  label="כמה אירובי עשית"
                  value={cardioAmount}
                  onChange={setCardioAmount}
                  suffix="דקות"
                  min={0}
                  onKeyDown={handleKeyDown(8)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[9] = el)}
                  label="כמה אינטרוולים"
                  value={intervalsCount}
                  onChange={setIntervalsCount}
                  suffix="אינטרוולים"
                  min={0}
                  onKeyDown={handleKeyDown(9)}
                />
              </div>
            </Card>

            {/* Nutrition/Hydration - תזונה (4 fields) */}
            <Card className="p-4 border border-slate-200 bg-white shadow-sm" dir="rtl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-2" dir="rtl">
                  <UtensilsCrossed className="h-5 w-5 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-widest text-black font-bold">תזונה</span>
                </div>
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[10] = el)}
                  label="קלוריות יומי"
                  value={caloriesDaily}
                  onChange={setCaloriesDaily}
                  suffix="קק״ל"
                  min={0}
                  onKeyDown={handleKeyDown(10)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[11] = el)}
                  label="חלבון יומי"
                  value={proteinDaily}
                  onChange={setProteinDaily}
                  suffix="גרם"
                  min={0}
                  onKeyDown={handleKeyDown(11)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[12] = el)}
                  label="סיבים יומי"
                  value={fiberDaily}
                  onChange={setFiberDaily}
                  suffix="גרם"
                  min={0}
                  onKeyDown={handleKeyDown(12)}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[13] = el)}
                  label="כמה מים שתית"
                  value={waterAmount}
                  onChange={setWaterAmount}
                  suffix="ליטר"
                  min={0}
                  max={10}
                  step={0.25}
                  onKeyDown={handleKeyDown(13)}
                />
              </div>
            </Card>

            {/* Well-being & Rest - בריאות (4 fields) */}
            <Card className="p-4 border border-slate-200 bg-white shadow-sm" dir="rtl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-2" dir="rtl">
                  <Moon className="h-5 w-5 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-widest text-black font-bold">בריאות</span>
                </div>
                <LuxurySlider
                  label="רמת הלחץ היומי"
                  value={stressLevel}
                  onChange={setStressLevel}
                  min={1}
                  max={10}
                />
                <LuxurySlider
                  label="רמת הרעב שלך"
                  value={hungerLevel}
                  onChange={setHungerLevel}
                  min={1}
                  max={10}
                />
                <LuxurySlider
                  label="רמת האנרגיה שלך"
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  min={1}
                  max={10}
                />
                <MinimalistInputCell
                  ref={(el) => (inputRefs.current[14] = el)}
                  label="כמה שעות ישנת"
                  value={sleepHours}
                  onChange={setSleepHours}
                  suffix="שעות"
                  min={0}
                  max={24}
                  step={0.5}
                  onKeyDown={handleKeyDown(14)}
                />
              </div>
            </Card>
          </div>

          {/* Notes Section */}
          <Card className="p-4 border border-slate-200 bg-white shadow-sm flex-shrink-0" dir="rtl">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 flex-shrink-0" dir="rtl">
                <FileText className="h-5 w-5 text-[#5B6FB9]" />
                <span className="text-sm uppercase tracking-widest text-black font-bold">הערות (אופציונלי)</span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הוסף הערות על היום שלך, איך הרגשת, מה היו האתגרים, או כל דבר אחר שתרצה לשתף..."
                dir="rtl"
                rows={2}
                className="text-sm border-slate-200 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]/20 resize-none text-black min-h-[60px] max-h-[60px]"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
