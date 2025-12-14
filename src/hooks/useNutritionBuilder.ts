import { useState, useCallback, useMemo } from 'react';
import type { NutritionTargets, NutritionTemplate } from './useNutritionTemplates';

export type NutritionBuilderMode = 'template' | 'user';

export interface NutritionBuilderState {
  name: string;
  description: string;
  targets: NutritionTargets;
  // Calculator inputs
  calculatorInputs: {
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    goal: 'cut' | 'maintain' | 'bulk';
  };
  calculatorOpen: boolean;
}

export interface NutritionBuilderActions {
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setTarget: <K extends keyof NutritionTargets>(key: K, value: number) => void;
  setTargets: (targets: Partial<NutritionTargets>) => void;
  setCalculatorInput: <K extends keyof NutritionBuilderState['calculatorInputs']>(
    key: K,
    value: NutritionBuilderState['calculatorInputs'][K]
  ) => void;
  setCalculatorOpen: (open: boolean) => void;
  calculateBMR: () => number;
  calculateTDEE: () => number;
  calculateMacros: () => NutritionTargets;
  applyCalculatedValues: () => void;
  getNutritionData: (mode: NutritionBuilderMode) => {
    templateData?: {
      name: string;
      description: string;
      targets: NutritionTargets;
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

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,      // Little or no exercise
  light: 1.375,         // Light exercise 1-3 days/week
  moderate: 1.55,       // Moderate exercise 3-5 days/week
  active: 1.725,         // Hard exercise 6-7 days/week
  very_active: 1.9,     // Very hard exercise, physical job
};

// Goal adjustments (calorie surplus/deficit)
const GOAL_ADJUSTMENTS = {
  cut: -500,      // 500 calorie deficit for cutting
  maintain: 0,    // Maintenance
  bulk: 500,      // 500 calorie surplus for bulking
};

// Macro distribution by goal (percentage of calories)
const MACRO_DISTRIBUTIONS = {
  cut: {
    protein: 0.35,  // 35% protein
    carbs: 0.35,    // 35% carbs
    fat: 0.30,      // 30% fat
  },
  maintain: {
    protein: 0.30,  // 30% protein
    carbs: 0.40,    // 40% carbs
    fat: 0.30,      // 30% fat
  },
  bulk: {
    protein: 0.30,  // 30% protein
    carbs: 0.45,    // 45% carbs
    fat: 0.25,      // 25% fat
  },
};

// Calories per gram
const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + s
 * where s = +5 for males, -161 for females
 */
const calculateBMRValue = (weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
  const baseBMR = (10 * weight) + (6.25 * height) - (5 * age);
  const genderAdjustment = gender === 'male' ? 5 : -161;
  return Math.round(baseBMR + genderAdjustment);
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR × Activity Multiplier
 */
const calculateTDEEValue = (bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number => {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
};

/**
 * Calculate macro targets based on TDEE and goal
 */
const calculateMacrosValue = (
  tdee: number,
  goal: 'cut' | 'maintain' | 'bulk',
  weight: number
): NutritionTargets => {
  // Adjust calories based on goal
  const targetCalories = tdee + GOAL_ADJUSTMENTS[goal];
  
  // Get macro distribution for goal
  const distribution = MACRO_DISTRIBUTIONS[goal];
  
  // Calculate macros in grams
  const proteinCalories = targetCalories * distribution.protein;
  const carbsCalories = targetCalories * distribution.carbs;
  const fatCalories = targetCalories * distribution.fat;
  
  // Convert to grams
  const protein = Math.round(proteinCalories / CALORIES_PER_GRAM.protein);
  const carbs = Math.round(carbsCalories / CALORIES_PER_GRAM.carbs);
  const fat = Math.round(fatCalories / CALORIES_PER_GRAM.fat);
  
  // Protein recommendation: at least 1.6g per kg bodyweight for active individuals
  const minProtein = Math.round(weight * 1.6);
  const adjustedProtein = Math.max(protein, minProtein);
  
  // Recalculate if protein was adjusted
  const adjustedProteinCalories = adjustedProtein * CALORIES_PER_GRAM.protein;
  const remainingCalories = targetCalories - adjustedProteinCalories;
  const adjustedCarbs = Math.round((remainingCalories * (distribution.carbs / (distribution.carbs + distribution.fat))) / CALORIES_PER_GRAM.carbs);
  const adjustedFat = Math.round((remainingCalories * (distribution.fat / (distribution.carbs + distribution.fat))) / CALORIES_PER_GRAM.fat);
  
  // Fiber recommendation: 14g per 1000 calories (minimum 25g)
  const fiber = Math.max(25, Math.round(targetCalories / 1000 * 14));
  
  return {
    calories: targetCalories,
    protein: adjustedProtein,
    carbs: adjustedCarbs,
    fat: adjustedFat,
    fiber,
  };
};

const initializeTargets = (initialData?: NutritionTemplate | { targets?: NutritionTargets }): NutritionTargets => {
  if (initialData && 'targets' in initialData && initialData.targets) {
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
  
  const [calculatorInputs, setCalculatorInputsState] = useState<NutritionBuilderState['calculatorInputs']>({
    weight: 70,
    height: 170,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
  });
  
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const setTarget = useCallback(<K extends keyof NutritionTargets>(key: K, value: number) => {
    setTargetsState((prev) => ({
      ...prev,
      [key]: Math.max(0, value),
    }));
  }, []);

  const setTargets = useCallback((newTargets: Partial<NutritionTargets>) => {
    setTargetsState((prev) => ({
      ...prev,
      ...newTargets,
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

  const calculateBMR = useCallback(() => {
    return calculateBMRValue(
      calculatorInputs.weight,
      calculatorInputs.height,
      calculatorInputs.age,
      calculatorInputs.gender
    );
  }, [calculatorInputs]);

  const calculateTDEE = useCallback(() => {
    const bmr = calculateBMR();
    return calculateTDEEValue(bmr, calculatorInputs.activityLevel);
  }, [calculatorInputs, calculateBMR]);

  const calculateMacros = useCallback(() => {
    const tdee = calculateTDEE();
    return calculateMacrosValue(
      tdee,
      calculatorInputs.goal,
      calculatorInputs.weight
    );
  }, [calculatorInputs, calculateTDEE]);

  const applyCalculatedValues = useCallback(() => {
    const calculatedMacros = calculateMacros();
    setTargets(calculatedMacros);
  }, [calculateMacros, setTargets]);

  const getNutritionData = useCallback((mode: NutritionBuilderMode) => {
    if (mode === 'template') {
      return {
        templateData: {
          name,
          description,
          targets,
        },
      };
    } else {
      return {
        userData: targets,
      };
    }
  }, [name, description, targets]);

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setTargetsState(initializeTargets());
    setCalculatorInputsState({
      weight: 70,
      height: 170,
      age: 30,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'maintain',
    });
    setCalculatorOpen(false);
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
    calculatorInputs,
    calculatorOpen,
    setName,
    setDescription,
    setTarget,
    setTargets,
    setCalculatorInput,
    setCalculatorOpen,
    calculateBMR,
    calculateTDEE,
    calculateMacros,
    applyCalculatedValues,
    getNutritionData,
    reset,
    macroPercentages, // Expose for UI
  };
};



