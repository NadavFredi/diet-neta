/**
 * DailyCheckInView Component - Luxury Daily Check-in with Accordions (19 Fields)
 * 
 * Complete daily check-in form with all 19 parameters organized in 4 accordions.
 * - מדדי גוף (Physical): 6 measurements
 * - פעילות (Activity): 4 metrics
 * - תזונה (Nutrition): 4 fields
 * - בריאות (Wellness): 4 fields (3 scales + sleep)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Activity,
  UtensilsCrossed,
  Scale,
  Moon,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useAppSelector } from '@/store/hooks';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DailyCheckInViewProps {
  customerId: string | null;
  onMultiDayClick?: () => void;
}

// Sleek Minimalist Numeric Input Cell - Horizontal Layout (Label + Input on same line)
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
    <div className="flex flex-col gap-2" dir="rtl">
      <span className="text-xs uppercase tracking-wider text-slate-600 font-semibold">
        {label}
      </span>
      <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200 focus-within:border-[#5B6FB9] transition-colors">
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
          className="flex-1 bg-transparent border-0 text-lg font-bold text-black focus:outline-none text-right h-8 px-0 placeholder:text-slate-300"
          dir="ltr"
          placeholder="—"
          style={{ textAlign: 'right' }}
        />
        <span className="text-sm text-slate-500 ml-3 flex-shrink-0 font-medium">{suffix}</span>
      </div>
    </div>
  );
});
MinimalistInputCell.displayName = 'MinimalistInputCell';

// Ultra-Thin Luxury Slider (Label left, value right, line middle)
const LuxurySlider: React.FC<{
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}> = ({ label, value, onChange, min = 1, max = 10 }) => {
  const sliderValue = value ?? 5;
  
  return (
    <div className="flex flex-col gap-3" dir="rtl">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-600 font-semibold">
          {label}
        </span>
        <span className="text-xl font-bold text-black">{sliderValue}</span>
      </div>
      <div className="relative h-2 pb-2 border-b-2 border-slate-200 focus-within:border-[#5B6FB9] transition-colors">
        <Slider
          value={[sliderValue]}
          onValueChange={([val]) => onChange(val)}
          min={min}
          max={max}
          step={1}
          className="h-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#5B6FB9] [&_[role=slider]]:shadow-md"
        />
      </div>
    </div>
  );
};

export const DailyCheckInView: React.FC<DailyCheckInViewProps> = ({ customerId, onMultiDayClick }) => {
  const { selectedDate } = useAppSelector((state) => state.client);
  const {
    selectedCheckIn,
    isLoading,
    isSubmitting,
    submitCheckIn,
    complianceStats,
  } = useDailyCheckIn(customerId, selectedDate);

  const { activeLead } = useAppSelector((state) => state.client);

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

  // Accordion state - all expanded by default
  const [openAccordions, setOpenAccordions] = useState<string[]>(['body', 'activity', 'nutrition', 'wellness']);

  // Input refs for Enter key navigation
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

  // Auto-fill from selected date's check-in
  useEffect(() => {
    if (selectedCheckIn) {
      // Physical
      setWeight(selectedCheckIn.weight ?? null);
      setBellyCircumference(selectedCheckIn.belly_circumference ?? null);
      setWaistCircumference(selectedCheckIn.waist_circumference ?? null);
      setThighCircumference(selectedCheckIn.thigh_circumference ?? null);
      setArmCircumference(selectedCheckIn.arm_circumference ?? null);
      setNeckCircumference(selectedCheckIn.neck_circumference ?? null);
      // Activity
      setStepsActual(selectedCheckIn.steps_actual ?? null);
      setExercisesCount(selectedCheckIn.exercises_count ?? null);
      setCardioAmount(selectedCheckIn.cardio_amount ?? null);
      setIntervalsCount(selectedCheckIn.intervals_count ?? null);
      // Nutrition/Hydration
      setCaloriesDaily(selectedCheckIn.calories_daily ?? null);
      setProteinDaily(selectedCheckIn.protein_daily ?? null);
      setFiberDaily(selectedCheckIn.fiber_daily ?? null);
      setWaterAmount(selectedCheckIn.water_amount ?? null);
      // Well-being
      setStressLevel(selectedCheckIn.stress_level ?? null);
      setHungerLevel(selectedCheckIn.hunger_level ?? null);
      setEnergyLevel(selectedCheckIn.energy_level ?? null);
      // Rest
      setSleepHours(selectedCheckIn.sleep_hours ?? null);
      // Workout
      setWorkoutCompleted(selectedCheckIn.workout_completed ?? false);
      // Notes
      setNotes(selectedCheckIn.notes ?? '');
    } else {
      // Reset all fields if no check-in exists
      setWeight(null);
      setBellyCircumference(null);
      setWaistCircumference(null);
      setThighCircumference(null);
      setArmCircumference(null);
      setNeckCircumference(null);
      setStepsActual(null);
      setExercisesCount(null);
      setCardioAmount(null);
      setIntervalsCount(null);
      setCaloriesDaily(null);
      setProteinDaily(null);
      setFiberDaily(null);
      setWaterAmount(null);
      setStressLevel(null);
      setHungerLevel(null);
      setEnergyLevel(null);
      setSleepHours(null);
      setWorkoutCompleted(false);
      setNotes('');
    }
  }, [selectedCheckIn]);

  // Validation
  const isFormValid = useMemo(() => {
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

  const displayDate = selectedDate 
    ? format(new Date(selectedDate), 'd בMMMM yyyy', { locale: he })
    : format(new Date(), 'd בMMMM yyyy', { locale: he });

  return (
    <div className="flex flex-col bg-white h-full" dir="rtl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-black">דיווח יומי - {displayDate}</h1>
          <div className="flex items-center gap-3">
            {onMultiDayClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMultiDayClick}
                className="text-sm border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9] hover:text-white h-9"
              >
                דיווח מרובה ימים
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className="h-9 text-sm px-5 font-semibold bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'שומר...' : 'שמור דיווח'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Accordions */}
      <div className="px-6 pt-6 pb-6 flex-1 overflow-y-auto min-h-0">
        <Accordion 
          type="multiple" 
          value={openAccordions} 
          onValueChange={setOpenAccordions}
          className="space-y-3"
        >
          {/* מדדי גוף - Physical Measurements */}
          <AccordionItem value="body" className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline bg-white hover:bg-slate-50 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <Scale className="h-5 w-5 text-[#5B6FB9]" />
                <span className="text-sm uppercase tracking-widest text-black font-bold">מדדי גוף</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
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
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[1] = el)}
                    label="היקף בטן"
                    value={bellyCircumference}
                    onChange={setBellyCircumference}
                    suffix="ס״מ"
                    min={0}
                    onKeyDown={handleKeyDown(1)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[2] = el)}
                    label="היקף מותן"
                    value={waistCircumference}
                    onChange={setWaistCircumference}
                    suffix="ס״מ"
                    min={0}
                    onKeyDown={handleKeyDown(2)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[3] = el)}
                    label="היקף ירכיים"
                    value={thighCircumference}
                    onChange={setThighCircumference}
                    suffix="ס״מ"
                    min={0}
                    onKeyDown={handleKeyDown(3)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[4] = el)}
                    label="היקף יד"
                    value={armCircumference}
                    onChange={setArmCircumference}
                    suffix="ס״מ"
                    min={0}
                    onKeyDown={handleKeyDown(4)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* פעילות - Activity */}
          <AccordionItem value="activity" className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline bg-white hover:bg-slate-50 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-[#5B6FB9]" />
                <span className="text-sm uppercase tracking-widest text-black font-bold">פעילות</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[6] = el)}
                    label="מס' צעדים יומי"
                    value={stepsActual}
                    onChange={setStepsActual}
                    suffix="צעדים"
                    min={0}
                    onKeyDown={handleKeyDown(6)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[7] = el)}
                    label="כמה תרגילים עשית"
                    value={exercisesCount}
                    onChange={setExercisesCount}
                    suffix="תרגילים"
                    min={0}
                    onKeyDown={handleKeyDown(7)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[8] = el)}
                    label="כמה אירובי עשית"
                    value={cardioAmount}
                    onChange={setCardioAmount}
                    suffix="דקות"
                    min={0}
                    onKeyDown={handleKeyDown(8)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* תזונה - Nutrition */}
          <AccordionItem value="nutrition" className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline bg-white hover:bg-slate-50 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-5 w-5 text-[#5B6FB9]" />
                <span className="text-sm uppercase tracking-widest text-black font-bold">תזונה</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[10] = el)}
                    label="קלוריות יומי"
                    value={caloriesDaily}
                    onChange={setCaloriesDaily}
                    suffix="קק״ל"
                    min={0}
                    onKeyDown={handleKeyDown(10)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[11] = el)}
                    label="חלבון יומי"
                    value={proteinDaily}
                    onChange={setProteinDaily}
                    suffix="גרם"
                    min={0}
                    onKeyDown={handleKeyDown(11)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <MinimalistInputCell
                    ref={(el) => (inputRefs.current[12] = el)}
                    label="סיבים יומי"
                    value={fiberDaily}
                    onChange={setFiberDaily}
                    suffix="גרם"
                    min={0}
                    onKeyDown={handleKeyDown(12)}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* בריאות - Wellness */}
          <AccordionItem value="wellness" className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline bg-white hover:bg-slate-50 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-[#5B6FB9]" />
                <span className="text-sm uppercase tracking-widest text-black font-bold">בריאות</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <LuxurySlider
                    label="רמת הלחץ היומי"
                    value={stressLevel}
                    onChange={setStressLevel}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <LuxurySlider
                    label="רמת הרעב שלך"
                    value={hungerLevel}
                    onChange={setHungerLevel}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <LuxurySlider
                    label="רמת האנרגיה שלך"
                    value={energyLevel}
                    onChange={setEnergyLevel}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
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
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Notes Section */}
        <Card className="p-5 border border-slate-200 bg-white shadow-sm mt-4" dir="rtl">
          <div className="space-y-3">
            <span className="text-sm uppercase tracking-widest text-black font-bold">הערות (אופציונלי)</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערות על היום שלך, איך הרגשת, מה היו האתגרים, או כל דבר אחר שתרצה לשתף..."
              dir="rtl"
              rows={3}
              className="text-sm border-slate-200 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]/20 resize-none text-black min-h-[80px] bg-slate-50"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};
