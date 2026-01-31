import { useState, useCallback, useMemo, useEffect } from 'react';
import type { NutritionTargets, NutritionTemplate } from './useNutritionTemplates';

export type NutritionBuilderMode = 'template' | 'user';

export interface ActivityEntry {
  id: string;
  activityType: string;
  mets: number;
  minutesPerWeek: number;
}

export interface ManualOverride {
  calories: boolean;
  protein: boolean;
  carbs: boolean;
  fat: boolean;
  fiber: boolean;
}

export interface ManualFields {
  steps: number | null;
  workouts: string | null;
  supplements: string | null;
}

export interface NutritionBuilderState {
  name: string;
  description: string;
  targets: NutritionTargets;
  // Manual override tracking - which fields have been manually edited
  manualOverride: ManualOverride;
  // Manual fields (steps, workouts, supplements)
  manualFields: ManualFields;
  // Enhanced calculator inputs
  calculatorInputs: {
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
    // Navy Method body fat inputs
    waist: number;
    hip: number;
    neck: number;
    // PAL (Physical Activity Level)
    pal: number; // 1.1 to 1.7+
    // Goal setting
    caloricDeficitMode: 'percent' | 'calories'; // Mode for caloric adjustment
    caloricDeficitPercent: number; // -20 to +20 (negative = deficit, positive = surplus)
    caloricDeficitCalories: number; // Manual calorie adjustment (negative = deficit, positive = surplus)
    // Macro targets (grams per kg)
    proteinPerKg: number; // 2.0-2.5
    fatPerKg: number; // 0.8-1.0
    carbsPerKg: number; // 1.0-3.0
  };
  // Activity table for METS-based EE
  activityEntries: ActivityEntry[];
  calculatorOpen: boolean;
}

export interface BMRResults {
  mifflinStJeor: number;
  harrisBenedict: number;
  katchMcArdle: number;
  average: number;
}

export interface NutritionBuilderActions {
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setTarget: <K extends keyof NutritionTargets>(key: K, value: number, isManual?: boolean) => void;
  setTargets: (targets: Partial<NutritionTargets>) => void;
  setManualOverride: <K extends keyof ManualOverride>(key: K, value: boolean) => void;
  setManualField: <K extends keyof ManualFields>(key: K, value: ManualFields[K]) => void;
  setCalculatorInput: <K extends keyof NutritionBuilderState['calculatorInputs']>(
    key: K,
    value: NutritionBuilderState['calculatorInputs'][K]
  ) => void;
  setCalculatorOpen: (open: boolean) => void;
  // Activity table actions
  addActivityEntry: () => void;
  updateActivityEntry: (id: string, updates: Partial<ActivityEntry>) => void;
  removeActivityEntry: (id: string) => void;
  // Calculations
  calculateBodyFat: () => number | null;
  calculateLBM: () => number | null; // Lean Body Mass
  calculateBMR: () => BMRResults;
  calculateExerciseEE: () => number; // Exercise Energy Expenditure (daily average)
  calculateTDEE: () => number;
  calculateMacros: () => NutritionTargets;
  applyCalculatedValues: () => void;
  getNutritionData: (mode: NutritionBuilderMode) => {
    templateData?: {
      name: string;
      description: string;
      targets: NutritionTargets;
      manual_override?: ManualOverride;
      manual_fields?: ManualFields;
    };
    userData?: NutritionTargets;
  };
  reset: () => void;
  macroPercentages: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Calories per gram
const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

/**
 * Calculate body fat percentage using Navy Method
 * Formula differs for men and women
 */
const calculateBodyFatPercentage = (
  waist: number,
  neck: number,
  height: number,
  gender: 'male' | 'female',
  hip?: number
): number | null => {
  if (!waist || !neck || !height) return null;
  
  if (gender === 'male') {
    // Male formula: %BF = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    const logWaistNeck = Math.log10(Math.max(0.1, waist - neck));
    const logHeight = Math.log10(height);
    const bodyFat = 495 / (1.0324 - 0.19077 * logWaistNeck + 0.15456 * logHeight) - 450;
    return Math.max(0, Math.min(100, bodyFat));
  } else {
    // Female formula requires hip measurement
    if (!hip) return null;
    // %BF = 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
    const logWaistHipNeck = Math.log10(Math.max(0.1, waist + hip - neck));
    const logHeight = Math.log10(height);
    const bodyFat = 495 / (1.29579 - 0.35004 * logWaistHipNeck + 0.22100 * logHeight) - 450;
    return Math.max(0, Math.min(100, bodyFat));
  }
};

/**
 * Calculate Lean Body Mass (LBM)
 * LBM = Weight × (1 - BodyFat% / 100)
 */
const calculateLBMValue = (weight: number, bodyFatPercent: number | null): number | null => {
  if (!bodyFatPercent || bodyFatPercent === null) return null;
  return weight * (1 - bodyFatPercent / 100);
};

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + s
 * where s = +5 for males, -161 for females
 */
const calculateMifflinStJeorBMR = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number => {
  const baseBMR = (10 * weight) + (6.25 * height) - (5 * age);
  const genderAdjustment = gender === 'male' ? 5 : -161;
  return Math.round(baseBMR + genderAdjustment);
};

/**
 * Calculate BMR using Harris-Benedict equation (Revised)
 * Men: BMR = 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
 * Women: BMR = 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age in years)
 */
const calculateHarrisBenedictBMR = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number => {
  if (gender === 'male') {
    return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age));
  } else {
    return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age));
  }
};

/**
 * Calculate BMR using Katch-McArdle equation
 * BMR = 370 + (21.6 × LBM in kg)
 * Requires Lean Body Mass
 */
const calculateKatchMcArdleBMR = (lbm: number | null): number => {
  if (!lbm || lbm <= 0) return 0;
  return Math.round(370 + (21.6 * lbm));
};

/**
 * Calculate Exercise Energy Expenditure (EE) from activity table
 * EE = Σ(METS × weight × minutes_per_week / 7) / 1440
 * Returns daily average in calories
 */
const calculateExerciseEEValue = (
  activities: ActivityEntry[],
  weight: number
): number => {
  if (!weight || activities.length === 0) return 0;
  
  const weeklyEE = activities.reduce((sum, activity) => {
    if (!activity.mets || !activity.minutesPerWeek) return sum;
    // METS × weight (kg) × hours = kcal
    // Convert minutes to hours: minutes / 60
    const hoursPerWeek = activity.minutesPerWeek / 60;
    const weeklyCalories = activity.mets * weight * hoursPerWeek;
    return sum + weeklyCalories;
  }, 0);
  
  // Return daily average
  return Math.round(weeklyEE / 7);
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = (BMR × PAL) + Exercise EE
 */
const calculateTDEEValue = (
  bmr: number,
  pal: number,
  exerciseEE: number
): number => {
  return Math.round((bmr * pal) + exerciseEE);
};

/**
 * Calculate macro targets based on grams per kg bodyweight and caloric target
 */
const calculateMacrosValue = (
  targetCalories: number,
  weight: number,
  proteinPerKg: number,
  fatPerKg: number,
  carbsPerKg: number
): NutritionTargets => {
  // Calculate macros in grams based on g/kg
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round(weight * fatPerKg);
  const carbs = Math.round(weight * carbsPerKg);
  
  // Calculate calories from macros
  const proteinCalories = protein * CALORIES_PER_GRAM.protein;
  const fatCalories = fat * CALORIES_PER_GRAM.fat;
  const carbsCalories = carbs * CALORIES_PER_GRAM.carbs;
  const totalMacroCalories = proteinCalories + fatCalories + carbsCalories;
  
  // If macros exceed target calories, scale them down proportionally
  let finalProtein = protein;
  let finalCarbs = carbs;
  let finalFat = fat;
  
  if (totalMacroCalories > targetCalories && targetCalories > 0) {
    const scaleFactor = targetCalories / totalMacroCalories;
    finalProtein = Math.round(protein * scaleFactor);
    finalCarbs = Math.round(carbs * scaleFactor);
    finalFat = Math.round(fat * scaleFactor);
  }
  
  // Fiber recommendation: 20-35g (default 25g, scale with calories)
  const fiber = Math.max(20, Math.min(35, Math.round(targetCalories / 1000 * 14)));
  
  // Recalculate final calories from adjusted macros
  const finalCalories = (finalProtein * CALORIES_PER_GRAM.protein) +
                       (finalCarbs * CALORIES_PER_GRAM.carbs) +
                       (finalFat * CALORIES_PER_GRAM.fat);
  
  return {
    calories: Math.round(finalCalories),
    protein: finalProtein,
    carbs: finalCarbs,
    fat: finalFat,
    fiber,
  };
};

const initializeTargets = (initialData?: NutritionTemplate | { targets?: NutritionTargets | any }): NutritionTargets => {
  if (initialData && 'targets' in initialData && initialData.targets) {
    const targets = initialData.targets as any;
    // Remove _manual_override from targets if it exists (it's stored separately)
    if (targets._manual_override) {
      const { _manual_override, ...cleanTargets } = targets;
      return cleanTargets;
    }
    return initialData.targets;
  }
  
  return {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
    fiber: 30,
  };
};

const initializeManualOverride = (initialData?: NutritionTemplate | { manual_override?: ManualOverride; targets?: any }): ManualOverride => {
  // First check for direct manual_override (templates)
  if (initialData && 'manual_override' in initialData && initialData.manual_override) {
    return initialData.manual_override;
  }
  
  // Then check for _manual_override inside targets (nutrition plans)
  if (initialData && 'targets' in initialData && initialData.targets && typeof initialData.targets === 'object') {
    const targets = initialData.targets as any;
    if (targets._manual_override && typeof targets._manual_override === 'object') {
      return targets._manual_override;
    }
  }
  
  return {
    calories: false,
    protein: false,
    carbs: false,
    fat: false,
    fiber: false,
  };
};

const initializeManualFields = (initialData?: NutritionTemplate | { manual_fields?: ManualFields }): ManualFields => {
  if (initialData && 'manual_fields' in initialData && initialData.manual_fields) {
    return initialData.manual_fields;
  }
  
  return {
    steps: null,
    workouts: null,
    supplements: null,
  };
};

const initializeActivityEntries = (initialData?: NutritionTemplate | { activity_entries?: ActivityEntry[] }): ActivityEntry[] => {
  if (initialData && 'activity_entries' in initialData && initialData.activity_entries && Array.isArray(initialData.activity_entries)) {
    // Ensure all entries have required fields and valid structure
    const entries = initialData.activity_entries.map((entry, index) => {
      // Handle both number and string values (from JSON)
      const metsValue = entry.mets != null ? (typeof entry.mets === 'number' ? entry.mets : parseFloat(String(entry.mets))) : 0;
      const minutesValue = entry.minutesPerWeek != null ? (typeof entry.minutesPerWeek === 'number' ? entry.minutesPerWeek : parseInt(String(entry.minutesPerWeek), 10)) : 0;
      
      return {
        id: entry.id || String(Date.now() + index),
        activityType: entry.activityType || '',
        mets: isNaN(metsValue) ? 0 : metsValue,
        minutesPerWeek: isNaN(minutesValue) ? 0 : minutesValue,
      };
    });
    
    return entries;
  }
  
  // Default activity entries
  const defaultEntries = [
    { id: '1', activityType: 'הליכה איטית/יוגה/פילאטיס', mets: 3.5, minutesPerWeek: 0 },
    { id: '2', activityType: 'אימון משקולות כבד', mets: 5.5, minutesPerWeek: 0 },
    { id: '3', activityType: 'סטודיו/פונקציונלי/איר', mets: 6.0, minutesPerWeek: 0 },
    { id: '4', activityType: 'ריצה קלה/ג\'וגינג', mets: 7.5, minutesPerWeek: 0 },
    { id: '5', activityType: 'ריצה מהירה/שחייה מהירה/ספינינג', mets: 10.0, minutesPerWeek: 0 },
  ];
  return defaultEntries;
};

const initializeCalculatorInputs = (initialData?: NutritionTemplate | { calculator_inputs?: NutritionBuilderState['calculatorInputs'] }): NutritionBuilderState['calculatorInputs'] => {
  console.log('[initializeCalculatorInputs] initialData:', initialData);
  console.log('[initializeCalculatorInputs] has calculator_inputs?', initialData && 'calculator_inputs' in initialData);
  
  const defaults: NutritionBuilderState['calculatorInputs'] = {
    weight: 70,
    height: 170,
    age: 30,
    gender: 'male',
    waist: 80,
    hip: 95,
    neck: 35,
    pal: 1.4,
    caloricDeficitMode: 'percent' as 'percent' | 'calories',
    caloricDeficitPercent: 0,
    caloricDeficitCalories: 0,
    proteinPerKg: 2.0,
    fatPerKg: 1.0,
    carbsPerKg: 2.0,
  };

  if (initialData && 'calculator_inputs' in initialData) {
    const calcInputs = (initialData as any).calculator_inputs;
    console.log('[initializeCalculatorInputs] calculator_inputs value:', calcInputs);
    console.log('[initializeCalculatorInputs] calculator_inputs type:', typeof calcInputs);
    console.log('[initializeCalculatorInputs] calculator_inputs is null?', calcInputs === null);
    console.log('[initializeCalculatorInputs] calculator_inputs is undefined?', calcInputs === undefined);
    console.log('[initializeCalculatorInputs] calculator_inputs keys:', calcInputs && typeof calcInputs === 'object' ? Object.keys(calcInputs) : 'N/A');
    
    if (calcInputs && typeof calcInputs === 'object' && Object.keys(calcInputs).length > 0) {
      const result = {
        ...defaults,
        ...calcInputs,
      };
      console.log('[initializeCalculatorInputs] Returning merged result (DB values override defaults):', result);
      console.log('[initializeCalculatorInputs] Final weight value:', result.weight);
      return result;
    } else {
      console.log('[initializeCalculatorInputs] calculator_inputs is empty/null/undefined, using defaults');
    }
  } else {
    console.log('[initializeCalculatorInputs] No calculator_inputs key in initialData');
  }
  
  console.log('[initializeCalculatorInputs] Returning defaults:', defaults);
  return defaults;
};

export const useNutritionBuilder = (
  mode: NutritionBuilderMode,
  initialData?: NutritionTemplate | { targets?: NutritionTargets }
): NutritionBuilderState & NutritionBuilderActions => {
  const [name, setName] = useState(
    initialData && 'name' in initialData ? initialData.name || '' : ''
  );
  const [description, setDescription] = useState(
    initialData && 'description' in initialData ? initialData.description || '' : ''
  );
  const [targets, setTargetsState] = useState<NutritionTargets>(() => initializeTargets(initialData));
  const [manualOverride, setManualOverrideState] = useState<ManualOverride>(() => initializeManualOverride(initialData as any));
  const [manualFields, setManualFieldsState] = useState<ManualFields>(() => initializeManualFields(initialData as any));
  
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>(() => initializeActivityEntries(initialData as any));
  
  const [calculatorInputs, setCalculatorInputsState] = useState<NutritionBuilderState['calculatorInputs']>(() => initializeCalculatorInputs(initialData as any));
  
  const [calculatorOpen, setCalculatorOpen] = useState(true); // Open by default in diagnostic mode

  // Update state when initialData changes (e.g., when editing a different plan)
  useEffect(() => {
    console.log('[useEffect] initialData changed:', initialData);
    console.log('[useEffect] initialData keys:', initialData ? Object.keys(initialData) : 'N/A');
    console.log('[useEffect] has calculator_inputs?', initialData && 'calculator_inputs' in initialData);
    console.log('[useEffect] calculator_inputs value:', initialData && 'calculator_inputs' in initialData ? (initialData as any).calculator_inputs : 'N/A');
    
    if (initialData) {
      // Update name and description
      if ('name' in initialData && initialData.name !== undefined) {
        setName(initialData.name || '');
      }
      if ('description' in initialData && initialData.description !== undefined) {
        setDescription(initialData.description || '');
      }
      // Update targets if they exist
      if ('targets' in initialData && initialData.targets) {
        const targetsData = initialData.targets as any;
        // Extract _manual_override from targets if it exists (for nutrition plans)
        if (targetsData._manual_override) {
          setManualOverrideState(targetsData._manual_override);
          // Remove _manual_override from targets before setting (clean targets)
          const { _manual_override, ...cleanTargets } = targetsData;
          setTargetsState(cleanTargets);
        } else {
          setTargetsState(initialData.targets);
        }
      }
      // Update manual override if it exists directly (for templates)
      if ('manual_override' in initialData && initialData.manual_override) {
        setManualOverrideState(initialData.manual_override);
      }
      if ('manual_fields' in initialData && initialData.manual_fields) {
        setManualFieldsState(initialData.manual_fields);
      }
      if ('activity_entries' in initialData && initialData.activity_entries && Array.isArray(initialData.activity_entries)) {
        const entries = initialData.activity_entries.map((entry, index) => ({
          id: entry.id || String(Date.now() + index),
          activityType: entry.activityType || '',
          mets: typeof entry.mets === 'number' ? entry.mets : parseFloat(String(entry.mets)) || 0,
          minutesPerWeek: typeof entry.minutesPerWeek === 'number' ? entry.minutesPerWeek : parseInt(String(entry.minutesPerWeek), 10) || 0,
        }));
        setActivityEntries(entries);
      }
      // Update calculator inputs if they exist
      if ('calculator_inputs' in initialData) {
        const calcInputs = (initialData as any).calculator_inputs;
        console.log('[useEffect] calculator_inputs from initialData:', calcInputs);
        console.log('[useEffect] calculator_inputs type:', typeof calcInputs);
        console.log('[useEffect] calculator_inputs is null?', calcInputs === null);
        console.log('[useEffect] calculator_inputs is undefined?', calcInputs === undefined);
        
        if (calcInputs && typeof calcInputs === 'object' && Object.keys(calcInputs).length > 0) {
          console.log('[useEffect] Updating calculatorInputs with:', calcInputs);
          // Use the database values, merging with defaults only for missing fields
          const defaults: NutritionBuilderState['calculatorInputs'] = {
            weight: 70,
            height: 170,
            age: 30,
            gender: 'male',
            waist: 80,
            hip: 95,
            neck: 35,
            pal: 1.4,
            caloricDeficitMode: 'percent' as 'percent' | 'calories',
            caloricDeficitPercent: 0,
            caloricDeficitCalories: 0,
            proteinPerKg: 2.0,
            fatPerKg: 1.0,
            carbsPerKg: 2.0,
          };
          const merged = {
            ...defaults,
            ...calcInputs,
          };
          console.log('[useEffect] Merged calculatorInputs (DB values override defaults):', merged);
          console.log('[useEffect] Final weight value:', merged.weight);
          setCalculatorInputsState(merged);
        } else {
          console.log('[useEffect] calculator_inputs is empty/null/undefined, keeping current state');
        }
      } else {
        console.log('[useEffect] No calculator_inputs key found in initialData');
      }
    }
  }, [initialData]);

  const setTarget = useCallback(<K extends keyof NutritionTargets>(key: K, value: number, isManual: boolean = false) => {
    setTargetsState((prev) => ({
      ...prev,
      [key]: Math.max(0, value),
    }));
    
    // If manually edited, mark as manually overridden
    if (isManual) {
      setManualOverrideState((prev) => ({
        ...prev,
        [key]: true,
      }));
    }
  }, []);

  const setTargets = useCallback((newTargets: Partial<NutritionTargets>) => {
    setTargetsState((prev) => ({
      ...prev,
      ...newTargets,
    }));
  }, []);

  const setManualOverride = useCallback(<K extends keyof ManualOverride>(key: K, value: boolean) => {
    setManualOverrideState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setManualField = useCallback(<K extends keyof ManualFields>(key: K, value: ManualFields[K]) => {
    setManualFieldsState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setCalculatorInput = useCallback(<K extends keyof NutritionBuilderState['calculatorInputs']>(
    key: K,
    value: NutritionBuilderState['calculatorInputs'][K]
  ) => {
    setCalculatorInputsState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const addActivityEntry = useCallback(() => {
    const newId = String(Date.now());
    setActivityEntries((prev) => [
      ...prev,
      { id: newId, activityType: '', mets: 3.5, minutesPerWeek: 0 },
    ]);
  }, []);

  const updateActivityEntry = useCallback((id: string, updates: Partial<ActivityEntry>) => {
    setActivityEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  }, []);

  const removeActivityEntry = useCallback((id: string) => {
    setActivityEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const calculateBodyFat = useCallback((): number | null => {
    return calculateBodyFatPercentage(
      calculatorInputs.waist,
      calculatorInputs.neck,
      calculatorInputs.height,
      calculatorInputs.gender,
      calculatorInputs.gender === 'female' ? calculatorInputs.hip : undefined
    );
  }, [calculatorInputs]);

  const calculateLBM = useCallback((): number | null => {
    const bodyFat = calculateBodyFat();
    return calculateLBMValue(calculatorInputs.weight, bodyFat);
  }, [calculatorInputs, calculateBodyFat]);

  const calculateBMR = useCallback((): BMRResults => {
    const mifflin = calculateMifflinStJeorBMR(
      calculatorInputs.weight,
      calculatorInputs.height,
      calculatorInputs.age,
      calculatorInputs.gender
    );
    
    const harris = calculateHarrisBenedictBMR(
      calculatorInputs.weight,
      calculatorInputs.height,
      calculatorInputs.age,
      calculatorInputs.gender
    );
    
    const lbm = calculateLBM();
    const katch = calculateKatchMcArdleBMR(lbm);
    
    // Average of available formulas
    const formulas = [mifflin, harris];
    if (katch > 0) formulas.push(katch);
    const average = Math.round(formulas.reduce((sum, val) => sum + val, 0) / formulas.length);
    
    return {
      mifflinStJeor: mifflin,
      harrisBenedict: harris,
      katchMcArdle: katch,
      average,
    };
  }, [calculatorInputs, calculateLBM]);

  const calculateExerciseEE = useCallback((): number => {
    return calculateExerciseEEValue(activityEntries, calculatorInputs.weight);
  }, [activityEntries, calculatorInputs.weight]);

  const calculateTDEE = useCallback(() => {
    const bmrResults = calculateBMR();
    const exerciseEE = calculateExerciseEE();
    return calculateTDEEValue(bmrResults.average, calculatorInputs.pal, exerciseEE);
  }, [calculatorInputs.pal, calculateBMR, calculateExerciseEE]);

  const calculateMacros = useCallback(() => {
    const tdee = calculateTDEE();
    // Apply caloric deficit/surplus
    let targetCalories: number;
    if (calculatorInputs.caloricDeficitMode === 'percent') {
      // Percentage mode: apply percentage to TDEE
      const deficitMultiplier = 1 + (calculatorInputs.caloricDeficitPercent / 100);
      targetCalories = Math.round(tdee * deficitMultiplier);
    } else {
      // Manual calories mode: add/subtract absolute calories
      targetCalories = Math.round(tdee + calculatorInputs.caloricDeficitCalories);
    }
    
    return calculateMacrosValue(
      targetCalories,
      calculatorInputs.weight,
      calculatorInputs.proteinPerKg,
      calculatorInputs.fatPerKg,
      calculatorInputs.carbsPerKg
    );
  }, [calculatorInputs, calculateTDEE]);

  const applyCalculatedValues = useCallback(() => {
    const calculatedMacros = calculateMacros();
    // Only update targets that are NOT manually overridden
    setTargetsState((prev) => {
      const updated = { ...prev };
      if (!manualOverride.calories) updated.calories = calculatedMacros.calories;
      if (!manualOverride.protein) updated.protein = calculatedMacros.protein;
      if (!manualOverride.carbs) updated.carbs = calculatedMacros.carbs;
      if (!manualOverride.fat) updated.fat = calculatedMacros.fat;
      if (!manualOverride.fiber) updated.fiber = calculatedMacros.fiber;
      return updated;
    });
  }, [calculateMacros, manualOverride]);

  const getNutritionData = useCallback((mode: NutritionBuilderMode) => {
    console.log('[getNutritionData] mode:', mode);
    console.log('[getNutritionData] calculatorInputs:', calculatorInputs);
    console.log('[getNutritionData] manualOverride:', manualOverride);
    
    if (mode === 'template') {
      const templateData = {
        name,
        description,
        targets,
        manual_override: manualOverride || {
          calories: false,
          protein: false,
          carbs: false,
          fat: false,
          fiber: false,
        }, // Always include manual_override, default to all false if undefined
        manual_fields: manualFields || {
          steps: null,
          workouts: null,
          supplements: null,
        }, // Always include manual_fields
        activity_entries: activityEntries || [], // Include activity entries
        calculator_inputs: calculatorInputs || null, // Include calculator inputs
      };
      console.log('[getNutritionData] templateData to save:', templateData);
      console.log('[getNutritionData] manual_override being saved:', templateData.manual_override);
      return {
        templateData,
      };
    } else {
      // For user mode (nutrition plans), store manual_override inside targets JSONB
      // since nutrition_plans table doesn't have a separate manual_override column
      const userData = {
        targets: {
          ...targets,
          // Store manual_override inside targets JSONB for nutrition plans
          _manual_override: manualOverride || {
            calories: false,
            protein: false,
            carbs: false,
            fat: false,
            fiber: false,
          },
        },
      };
      console.log('[getNutritionData] userData to save (with manual_override in targets):', userData);
      console.log('[getNutritionData] manual_override being saved in targets:', userData.targets._manual_override);
      return {
        userData,
      };
    }
  }, [name, description, targets, manualOverride, manualFields, activityEntries, calculatorInputs]);

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setTargetsState(initializeTargets());
    setManualOverrideState({
      calories: false,
      protein: false,
      carbs: false,
      fat: false,
      fiber: false,
    });
    setManualFieldsState({
      steps: null,
      workouts: null,
      supplements: null,
    });
    setCalculatorInputsState({
      weight: 70,
      height: 170,
      age: 30,
      gender: 'male',
      waist: 80,
      hip: 95,
      neck: 35,
      pal: 1.4,
      caloricDeficitMode: 'percent' as 'percent' | 'calories',
      caloricDeficitPercent: 0,
      caloricDeficitCalories: 0,
      proteinPerKg: 2.0,
      fatPerKg: 1.0,
      carbsPerKg: 2.0,
    });
    setActivityEntries([
      { id: '1', activityType: 'הליכה איטית/יוגה/פילאטיס', mets: 3.5, minutesPerWeek: 0 },
      { id: '2', activityType: 'אימון משקולות כבד', mets: 5.5, minutesPerWeek: 0 },
      { id: '3', activityType: 'סטודיו/פונקציונלי/איר', mets: 6.0, minutesPerWeek: 0 },
      { id: '4', activityType: 'ריצה קלה/ג\'וגינג', mets: 7.5, minutesPerWeek: 0 },
      { id: '5', activityType: 'ריצה מהירה/שחייה מהירה/ספינינג', mets: 10.0, minutesPerWeek: 0 },
    ]);
    setCalculatorOpen(true);
  }, []);

  // Calculate macro percentages for display
  const macroPercentages = useMemo(() => {
    const proteinCalories = targets.protein * CALORIES_PER_GRAM.protein;
    const carbsCalories = targets.carbs * CALORIES_PER_GRAM.carbs;
    const fatCalories = targets.fat * CALORIES_PER_GRAM.fat;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
    
    if (totalMacroCalories === 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }
    
    return {
      protein: Math.round((proteinCalories / totalMacroCalories) * 100),
      carbs: Math.round((carbsCalories / totalMacroCalories) * 100),
      fat: Math.round((fatCalories / totalMacroCalories) * 100),
    };
  }, [targets]);

  return {
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
    setTargets,
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
    reset,
    macroPercentages,
  };
};
