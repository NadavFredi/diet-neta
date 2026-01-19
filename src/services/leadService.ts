/**
 * Lead Service Layer
 * 
 * Architecture: All data operations and transformations happen here.
 * This service uses PostgreSQL functions (RPC) for heavy operations.
 * Frontend stays light - no client-side filtering or calculations.
 */

import { supabase } from '@/lib/supabaseClient';

// =====================================================
// Types (matching database schema)
// =====================================================

export interface LeadFilterParams {
  searchQuery?: string | null;
  createdDate?: string | null;
  statusMain?: string | null;
  statusSub?: string | null;
  age?: string | null;
  height?: string | null;
  weight?: string | null;
  fitnessGoal?: string | null;
  activityLevel?: string | null;
  preferredTime?: string | null;
  source?: string | null;
  // Pagination
  limit?: number;
  offset?: number;
  // Sorting
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  // Grouping
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
}

export interface LeadFromDB {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status_main: string | null;
  status_sub: string | null;
  source: string | null;
  fitness_goal: string | null;
  activity_level: string | null;
  preferred_time: string | null;
  notes: string | null;
  age: number;
  birth_date: string | null;
  birth_date_formatted: string | null;
  created_date_formatted: string;
  height: number | null;
  weight: number | null;
  daily_steps_goal: number | null;
  weekly_workouts: number | null;
  daily_supplements: string[] | null;
  subscription_months: number | null;
  subscription_initial_price: number | null;
  subscription_renewal_price: number | null;
}

export interface LeadFilterOptions {
  statuses: string[];
  sources: string[];
  fitnessGoals: string[];
  activityLevels: string[];
  preferredTimes: string[];
  ages: string[];
  heights: string[];
  weights: string[];
}

// =====================================================
// Service Functions
// =====================================================

/**
 * Fetch filtered leads using PostgreSQL RPC function
 * All filtering, sorting, grouping, and pagination happens in the database
 */
export async function fetchFilteredLeads(
  filters: LeadFilterParams
): Promise<LeadFromDB[]> {
  try {
    const { data, error } = await supabase.rpc('get_filtered_leads', {
      p_limit_count: filters.limit || 100,
      p_offset_count: filters.offset || 0,
      p_search_query: filters.searchQuery || null,
      p_date: filters.createdDate || null,
      p_status_main: filters.statusMain || null,
      p_status_sub: filters.statusSub || null,
      p_age: filters.age || null,
      p_height: filters.height || null,
      p_weight: filters.weight || null,
      p_fitness_goal: filters.fitnessGoal || null,
      p_activity_level: filters.activityLevel || null,
      p_preferred_time: filters.preferredTime || null,
      p_source: filters.source || null,
      // Sorting parameters
      p_sort_by: filters.sortBy || 'created_at',
      p_sort_order: filters.sortOrder || 'DESC',
      // Grouping parameters
      p_group_by_level1: filters.groupByLevel1 || null,
      p_group_by_level2: filters.groupByLevel2 || null,
    });

    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get total count of leads matching filter criteria
 * Used for pagination to calculate total pages
 */
export async function getFilteredLeadsCount(
  filters: Omit<LeadFilterParams, 'limit' | 'offset' | 'sortBy' | 'sortOrder' | 'groupByLevel1' | 'groupByLevel2'>
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_filtered_leads_count', {
      p_search_query: filters.searchQuery || null,
      p_date: filters.createdDate || null,
      p_status_main: filters.statusMain || null,
      p_status_sub: filters.statusSub || null,
      p_age: filters.age || null,
      p_height: filters.height || null,
      p_weight: filters.weight || null,
      p_fitness_goal: filters.fitnessGoal || null,
      p_activity_level: filters.activityLevel || null,
      p_preferred_time: filters.preferredTime || null,
      p_source: filters.source || null,
    });

    if (error) {
      throw error;
    }

    return data || 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch all leads (simple query - no filters)
 * Uses the view for pre-joined customer data
 */
export async function fetchAllLeads(): Promise<LeadFromDB[]> {
  try {
    const { data, error } = await supabase
      .from('v_leads_with_customer')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get filter options for dropdowns
 * Calculated once in PostgreSQL instead of client-side
 */
export async function getLeadFilterOptions(): Promise<LeadFilterOptions> {
  try {
    const { data, error } = await supabase.rpc('get_lead_filter_options');

    if (error) {
      throw error;
    }

    // RPC returns JSONB object
    if (data && typeof data === 'object') {
      const jsonData = data as any;
      return {
        statuses: jsonData.statuses || [],
        sources: jsonData.sources || [],
        fitnessGoals: jsonData.fitness_goals || [],
        activityLevels: jsonData.activity_levels || [],
        preferredTimes: jsonData.preferred_times || [],
        ages: jsonData.ages || [],
        heights: jsonData.heights || [],
        weights: jsonData.weights || [],
      };
    }

    return {
      statuses: [],
      sources: [],
      fitnessGoals: [],
      activityLevels: [],
      preferredTimes: [],
      ages: [],
      heights: [],
      weights: [],
    };
  } catch (error) {
    // Return empty arrays on error (graceful degradation)
    return {
      statuses: [],
      sources: [],
      fitnessGoals: [],
      activityLevels: [],
      preferredTimes: [],
      ages: [],
      heights: [],
      weights: [],
    };
  }
}

/**
 * Transform database lead to UI format
 * Minimal transformation - most fields already calculated in PostgreSQL
 */
export function mapLeadToUIFormat(dbLead: LeadFromDB) {
  return {
    id: dbLead.id,
    name: dbLead.customer_name,
    createdDate: dbLead.created_date_formatted,
    status: dbLead.status_sub || dbLead.status_main || '',
    phone: dbLead.customer_phone,
    email: dbLead.customer_email || '',
    source: dbLead.source || '',
    age: dbLead.age, // Already calculated in PostgreSQL
    birthDate: dbLead.birth_date_formatted || '',
    height: dbLead.height || 0,
    weight: dbLead.weight || 0,
    fitnessGoal: dbLead.fitness_goal || '',
    activityLevel: dbLead.activity_level || '',
    preferredTime: dbLead.preferred_time || '',
    notes: dbLead.notes || undefined,
    dailyStepsGoal: dbLead.daily_steps_goal || 0,
    weeklyWorkouts: dbLead.weekly_workouts || 0,
    dailySupplements: dbLead.daily_supplements || [],
    subscription: {
      joinDate: '', // Would need to extract from subscription_data if needed
      initialPackageMonths: dbLead.subscription_months || 0,
      initialPrice: dbLead.subscription_initial_price || 0,
      monthlyRenewalPrice: dbLead.subscription_renewal_price || 0,
      currentWeekInProgram: 0,
      timeInCurrentBudget: '',
    },
    workoutProgramsHistory: [], // Would need to extract from workout_history if needed
    stepsHistory: [], // Would need to extract from steps_history if needed
    customerId: dbLead.customer_id,
  };
}
