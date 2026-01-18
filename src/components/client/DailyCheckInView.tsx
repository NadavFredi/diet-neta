/**
 * DailyCheckInView Component - Luxury Daily Check-in with Accordions (19 Fields)
 * 
 * Complete daily check-in form with all 19 parameters organized in 4 accordions.
 * - מדדי גוף (Physical): 6 measurements
 * - פעילות (Activity): 4 metrics
 * - תזונה (Nutrition): 4 fields
 * - בריאות (Wellness): 4 fields (3 scales + sleep)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCheckInFieldConfigurations } from '@/hooks/useCheckInFieldConfigurations';

interface DailyCheckInViewProps {
  customerId: string | null;
  onMultiDayClick?: () => void;
}

// Ultra-Compact Horizontal Input Cell - Label and Input on same line (Bigger text)
const CompactInputCell = React.forwardRef<HTMLInputElement, {
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
    <div className="flex items-center justify-between gap-2 py-2.5 px-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50/50 hover:border-[#5B6FB9]/30 transition-all min-w-0 shadow-sm" dir="rtl">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Label className="text-sm text-slate-700 font-medium flex-shrink-0 whitespace-nowrap" style={{ fontSize: '13px', fontWeight: 500 }}>
          {label}:
        </Label>
        <Input
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
          className={cn(
            "h-8 text-sm px-2.5 flex-1 max-w-[140px]",
            "border border-slate-200 rounded-md focus:border-[#5B6FB9] focus:ring-1 focus:ring-[#5B6FB9]/20 focus-visible:ring-0",
            "transition-all duration-150",
            "bg-white font-semibold text-slate-900"
          )}
          style={{ 
            fontSize: '14px', 
            fontWeight: 600,
            textAlign: 'right'
          }}
          dir="ltr"
          placeholder="—"
        />
        <span className="text-xs text-slate-500 flex-shrink-0 font-medium">
          {suffix}
        </span>
      </div>
    </div>
  );
});
CompactInputCell.displayName = 'CompactInputCell';

// Ultra-Compact Horizontal Slider - Label, Slider, and Value on same line (Bigger text)
const CompactSlider: React.FC<{
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}> = ({ label, value, onChange, min = 1, max = 10 }) => {
  const sliderValue = value ?? 5;
  
  return (
    <div className="flex items-center justify-between gap-2 py-2.5 px-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50/50 hover:border-[#5B6FB9]/30 transition-all min-w-0 shadow-sm" dir="rtl">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Label className="text-sm text-slate-700 font-medium flex-shrink-0 whitespace-nowrap" style={{ fontSize: '13px', fontWeight: 500 }}>
          {label}:
        </Label>
        <div className="flex-1 relative min-w-0 px-2">
          <Slider
            value={[sliderValue]}
            onValueChange={([val]) => onChange(val)}
            min={min}
            max={max}
            step={1}
            className="h-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#5B6FB9] [&_[role=slider]]:shadow-md"
          />
        </div>
        <span 
          className="text-sm font-bold text-[#5B6FB9] flex-shrink-0 bg-[#5B6FB9]/10 px-2 py-0.5 rounded-md" 
          style={{ 
            fontSize: '14px', 
            fontWeight: 700,
            minWidth: '32px',
            textAlign: 'center'
          }}
        >
          {sliderValue}
        </span>
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
  
  // Fetch check-in field configuration
  const { configuration: fieldConfig, isLoading: isLoadingConfig } = useCheckInFieldConfigurations(customerId);

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

  // Accordion state - all visible sections expanded by default
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  
  // Initialize open accordions based on visible sections
  useEffect(() => {
    if (fieldConfig && !isLoadingConfig) {
      const visibleSections = Object.entries(fieldConfig.sections)
        .filter(([_, section]) => section.visible)
        .map(([key]) => key);
      setOpenAccordions(visibleSections);
    }
  }, [fieldConfig, isLoadingConfig]);

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

  // Helper: Get sorted fields for a section based on order
  // Must be defined before any early returns to follow Rules of Hooks
  const getSortedFieldsForSection = useCallback((sectionKey: 'body' | 'activity' | 'nutrition' | 'wellness') => {
    if (!fieldConfig?.fields) return [];
    return Object.entries(fieldConfig.fields)
      .filter(([_, field]) => field.section === sectionKey && field.visible)
      .sort(([_, a], [__, b]) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });
  }, [fieldConfig]);

  // Get sorted fields for each section - must be defined before early return
  const bodyFields = useMemo(() => getSortedFieldsForSection('body'), [getSortedFieldsForSection]);
  const activityFields = useMemo(() => getSortedFieldsForSection('activity'), [getSortedFieldsForSection]);
  const nutritionFields = useMemo(() => getSortedFieldsForSection('nutrition'), [getSortedFieldsForSection]);
  const wellnessFields = useMemo(() => getSortedFieldsForSection('wellness'), [getSortedFieldsForSection]);

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

  if (isLoading || isLoadingConfig) {
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

  // Field value and setter mapping
  const fieldValueMap: Record<string, number | null> = {
    weight,
    bellyCircumference,
    waistCircumference,
    thighCircumference,
    armCircumference,
    neckCircumference,
    stepsActual,
    exercisesCount,
    cardioAmount,
    intervalsCount,
    caloriesDaily,
    proteinDaily,
    fiberDaily,
    waterAmount,
    stressLevel,
    hungerLevel,
    energyLevel,
    sleepHours,
  };

  const fieldSetterMap: Record<string, (value: number | null) => void> = {
    weight: setWeight,
    bellyCircumference: setBellyCircumference,
    waistCircumference: setWaistCircumference,
    thighCircumference: setThighCircumference,
    armCircumference: setArmCircumference,
    neckCircumference: setNeckCircumference,
    stepsActual: setStepsActual,
    exercisesCount: setExercisesCount,
    cardioAmount: setCardioAmount,
    intervalsCount: setIntervalsCount,
    caloriesDaily: setCaloriesDaily,
    proteinDaily: setProteinDaily,
    fiberDaily: setFiberDaily,
    waterAmount: setWaterAmount,
    stressLevel: setStressLevel,
    hungerLevel: setHungerLevel,
    energyLevel: setEnergyLevel,
    sleepHours: setSleepHours,
  };

  // Calculate input indices - count visible fields before each section
  let inputIndex = 0;

  return (
    <div className="flex flex-col bg-white h-full" dir="rtl">
      {/* Page Header - Larger */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-base font-semibold text-black truncate">דיווח יומי - {displayDate}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onMultiDayClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMultiDayClick}
                className="text-sm border-slate-200 bg-white text-slate-600 hover:bg-slate-50 h-8 px-3 font-medium"
              >
                דיווח מרובה
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className="h-8 text-sm px-4 font-semibold bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white disabled:opacity-50"
            >
              {isSubmitting ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Well-Organized Accordions with Grid */}
      <div className="px-4 pt-3 pb-4 flex-1 overflow-y-auto min-h-0">
        <Accordion 
          type="multiple" 
          value={openAccordions} 
          onValueChange={setOpenAccordions}
          className="space-y-3"
        >
          {/* Render sections dynamically based on configuration */}
          {fieldConfig.sections.body.visible && (
            <AccordionItem value="body" className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-wide text-black font-semibold">
                    {fieldConfig.sections.body.label}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 py-2 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {bodyFields.map(([fieldId, field]) => {
                    const value = fieldValueMap[fieldId] ?? null;
                    const onChange = fieldSetterMap[fieldId];
                    const idx = inputIndex++;
                    
                    return (
                      <CompactInputCell
                        key={fieldId}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        label={field.label}
                        value={value}
                        onChange={onChange}
                        suffix={field.unit || 'ס״מ'}
                        min={0}
                        step={fieldId === 'weight' ? 0.1 : 1}
                        onKeyDown={handleKeyDown(idx)}
                      />
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* פעילות - Activity */}
          {fieldConfig.sections.activity.visible && (
            <AccordionItem value="activity" className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-wide text-black font-semibold">
                    {fieldConfig.sections.activity.label}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 py-2 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {activityFields.map(([fieldId, field]) => {
                    const value = fieldValueMap[fieldId] ?? null;
                    const onChange = fieldSetterMap[fieldId];
                    const idx = inputIndex++;
                    
                    return (
                      <CompactInputCell
                        key={fieldId}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        label={field.label}
                        value={value}
                        onChange={onChange}
                        suffix={field.unit || ''}
                        min={0}
                        onKeyDown={handleKeyDown(idx)}
                      />
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* תזונה - Nutrition */}
          {fieldConfig.sections.nutrition.visible && (
            <AccordionItem value="nutrition" className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-wide text-black font-semibold">
                    {fieldConfig.sections.nutrition.label}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 py-2 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {nutritionFields.map(([fieldId, field]) => {
                    const value = fieldValueMap[fieldId] ?? null;
                    const onChange = fieldSetterMap[fieldId];
                    const idx = inputIndex++;
                    
                    return (
                      <CompactInputCell
                        key={fieldId}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        label={field.label}
                        value={value}
                        onChange={onChange}
                        suffix={field.unit || ''}
                        min={0}
                        max={fieldId === 'waterAmount' ? 10 : undefined}
                        step={fieldId === 'waterAmount' ? 0.25 : 1}
                        onKeyDown={handleKeyDown(idx)}
                      />
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* בריאות - Wellness */}
          {fieldConfig.sections.wellness.visible && (
            <AccordionItem value="wellness" className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-[#5B6FB9]" />
                  <span className="text-sm uppercase tracking-wide text-black font-semibold">
                    {fieldConfig.sections.wellness.label}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 py-2 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {wellnessFields.map(([fieldId, field]) => {
                    const value = fieldValueMap[fieldId] ?? null;
                    const onChange = fieldSetterMap[fieldId];
                    const idx = inputIndex++;
                    
                    // Slider fields: stressLevel, hungerLevel, energyLevel
                    if (fieldId === 'stressLevel' || fieldId === 'hungerLevel' || fieldId === 'energyLevel') {
                      return (
                        <CompactSlider
                          key={fieldId}
                          label={field.label}
                          value={value}
                          onChange={onChange}
                          min={1}
                          max={10}
                        />
                      );
                    }
                    
                    // Input field: sleepHours or any other wellness field
                    return (
                      <CompactInputCell
                        key={fieldId}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        label={field.label}
                        value={value}
                        onChange={onChange}
                        suffix={field.unit || 'שעות'}
                        min={fieldId === 'sleepHours' ? 0 : undefined}
                        max={fieldId === 'sleepHours' ? 24 : undefined}
                        step={fieldId === 'sleepHours' ? 0.5 : 1}
                        onKeyDown={handleKeyDown(idx)}
                      />
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Notes Section - Premium Styling */}
        <div className="border border-slate-200 rounded-lg bg-white mt-3 shadow-sm" dir="rtl">
          <div className="px-4 py-3 border-b border-slate-200">
            <span className="text-sm uppercase tracking-wide text-slate-700 font-semibold">הערות (אופציונלי)</span>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הוסף הערות..."
            dir="rtl"
            rows={3}
            className="text-sm border-0 focus:ring-0 resize-none text-black min-h-[80px] bg-transparent px-4 py-3"
          />
        </div>
      </div>
    </div>
  );
};
