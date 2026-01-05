/**
 * Filter Utilities
 * 
 * Utilities for extracting unique filter values from data
 */

import type { Lead } from '@/store/slices/dashboardSlice';
import type { Customer } from '@/hooks/useCustomers';
import type { WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';

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
 * Extract unique values for a specific field from templates
 */
export function extractTemplateFilterOptions(templates: WorkoutTemplate[] | NutritionTemplate[], fieldId: string): string[] {
  const valueSet = new Set<string>();
  
  templates.forEach(template => {
    let value: string | null | undefined;
    
    switch (fieldId) {
      case 'has_leads':
        // This is a boolean field, return predefined options
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

