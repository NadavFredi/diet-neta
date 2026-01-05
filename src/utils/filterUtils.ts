/**
 * Filter Utilities
 * 
 * Utilities for extracting unique filter values from data
 */

import type { Lead } from '@/store/slices/dashboardSlice';
import type { Customer } from '@/hooks/useCustomers';
import type { WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';
import type { Budget } from '@/store/slices/budgetSlice';

/**
 * Extract unique status values from leads data
 * Combines status_main and status_sub, prioritizing status_sub
 */
export function extractStatusOptions(leads: Lead[]): string[] {
  const statusSet = new Set<string>();
  
  leads.forEach(lead => {
    // Status can come from status field (UI format) or we need to check status_main/status_sub
    // For now, use the status field directly
    if (lead.status && lead.status.trim()) {
      statusSet.add(lead.status);
    }
  });
  
  return Array.from(statusSet).sort();
}

/**
 * Extract unique values for a specific field from leads
 */
export function extractLeadFilterOptions(leads: Lead[], fieldId: string): string[] {
  const valueSet = new Set<string>();
  
  leads.forEach(lead => {
    let value: string | null | undefined;
    
    switch (fieldId) {
      case 'status':
        value = lead.status;
        break;
      case 'fitnessGoal':
        value = lead.fitnessGoal;
        break;
      case 'activityLevel':
        value = lead.activityLevel;
        break;
      case 'preferredTime':
        value = lead.preferredTime;
        break;
      case 'source':
        value = lead.source;
        break;
      default:
        return [];
    }
    
    if (value && value.trim()) {
      valueSet.add(value);
    }
  });
  
  return Array.from(valueSet).sort();
}

/**
 * Extract unique values for a specific field from customers
 */
export function extractCustomerFilterOptions(customers: Customer[], fieldId: string): string[] {
  const valueSet = new Set<string>();
  
  customers.forEach(customer => {
    let value: string | null | undefined;
    
    switch (fieldId) {
      case 'total_leads':
        // This is a number field, return empty for now
        return [];
      default:
        return [];
    }
    
    if (value && value.trim()) {
      valueSet.add(value);
    }
  });
  
  return Array.from(valueSet).sort();
}

/**
 * Extract unique values for a specific field from workout templates
 */
export function extractWorkoutTemplateFilterOptions(templates: WorkoutTemplate[], fieldId: string): string[] {
  const valueSet = new Set<string>();
  
  templates.forEach(template => {
    let value: string | null | undefined;
    
    switch (fieldId) {
      case 'goal_tags':
        // Extract all goal tags from all templates
        if (template.goal_tags && Array.isArray(template.goal_tags)) {
          template.goal_tags.forEach(tag => {
            if (tag && tag.trim()) {
              valueSet.add(tag);
            }
          });
        }
        return Array.from(valueSet).sort();
      case 'is_public':
        // Boolean field - return predefined options
        return ['כן', 'לא'];
      case 'has_leads':
        // This would need to check if template has connected leads
        // For now, return predefined options
        return ['כן', 'לא'];
      default:
        return [];
    }
    
    if (value && value.trim()) {
      valueSet.add(value);
    }
  });
  
  return Array.from(valueSet).sort();
}

/**
 * Extract unique values for a specific field from nutrition templates
 */
export function extractNutritionTemplateFilterOptions(templates: NutritionTemplate[], fieldId: string): string[] {
  const valueSet = new Set<string>();
  
  templates.forEach(template => {
    let value: string | null | undefined;
    
    switch (fieldId) {
      case 'is_public':
        // Boolean field - return predefined options
        return ['כן', 'לא'];
      case 'calories_range':
        // Extract calorie ranges from targets
        if (template.targets?.calories) {
          const calories = template.targets.calories;
          // Create ranges: 0-1000, 1000-1500, 1500-2000, 2000-2500, 2500+
          if (calories < 1000) valueSet.add('0-1000');
          else if (calories < 1500) valueSet.add('1000-1500');
          else if (calories < 2000) valueSet.add('1500-2000');
          else if (calories < 2500) valueSet.add('2000-2500');
          else valueSet.add('2500+');
        }
        return Array.from(valueSet).sort();
      case 'protein_range':
        // Extract protein ranges from targets
        if (template.targets?.protein) {
          const protein = template.targets.protein;
          // Create ranges: 0-100, 100-150, 150-200, 200+
          if (protein < 100) valueSet.add('0-100');
          else if (protein < 150) valueSet.add('100-150');
          else if (protein < 200) valueSet.add('150-200');
          else valueSet.add('200+');
        }
        return Array.from(valueSet).sort();
      default:
        return [];
    }
    
    if (value && value.trim()) {
      valueSet.add(value);
    }
  });
  
  return Array.from(valueSet).sort();
}

/**
 * Extract unique values for a specific field from budgets
 */
export function extractBudgetFilterOptions(budgets: Budget[], fieldId: string): string[] {
  const valueSet = new Set<string>();
  
  budgets.forEach(budget => {
    let value: string | null | undefined;
    
    switch (fieldId) {
      case 'workout_template_name':
        // Extract workout template names
        if (budget.workout_template?.name) {
          valueSet.add(budget.workout_template.name);
        }
        return Array.from(valueSet).sort();
      case 'nutrition_template_name':
        // Extract nutrition template names
        if (budget.nutrition_template?.name) {
          valueSet.add(budget.nutrition_template.name);
        }
        return Array.from(valueSet).sort();
      case 'has_workout_template':
        // Boolean field
        return ['כן', 'לא'];
      case 'has_nutrition_template':
        // Boolean field
        return ['כן', 'לא'];
      case 'steps_goal_range':
        // Extract steps goal ranges
        if (budget.steps_goal) {
          const steps = budget.steps_goal;
          if (steps < 5000) valueSet.add('0-5000');
          else if (steps < 7000) valueSet.add('5000-7000');
          else if (steps < 10000) valueSet.add('7000-10000');
          else valueSet.add('10000+');
        }
        return Array.from(valueSet).sort();
      default:
        return [];
    }
    
    if (value && value.trim()) {
      valueSet.add(value);
    }
  });
  
  return Array.from(valueSet).sort();
}

/**
 * Extract unique values for a specific field from templates (generic)
 */
export function extractTemplateFilterOptions(templates: WorkoutTemplate[] | NutritionTemplate[], fieldId: string): string[] {
  if (templates.length === 0) return [];
  
  // Check if it's workout templates or nutrition templates
  const firstTemplate = templates[0];
  if ('goal_tags' in firstTemplate) {
    return extractWorkoutTemplateFilterOptions(templates as WorkoutTemplate[], fieldId);
  } else {
    return extractNutritionTemplateFilterOptions(templates as NutritionTemplate[], fieldId);
  }
}

/**
 * Get all unique filter options for leads
 */
export function getLeadFilterOptions(leads: Lead[]) {
  return {
    status: extractLeadFilterOptions(leads, 'status'),
    fitnessGoal: extractLeadFilterOptions(leads, 'fitnessGoal'),
    activityLevel: extractLeadFilterOptions(leads, 'activityLevel'),
    preferredTime: extractLeadFilterOptions(leads, 'preferredTime'),
    source: extractLeadFilterOptions(leads, 'source'),
  };
}

