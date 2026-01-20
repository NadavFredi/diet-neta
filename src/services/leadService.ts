/**
 * Lead Service Layer
 * 
 * Architecture: All data operations and transformations happen here.
 * This service uses PostgreSQL functions (RPC) for heavy operations.
 * Frontend stays light - no client-side filtering or calculations.
 */

import { supabase } from '@/lib/supabaseClient';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';

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
  filterGroup?: FilterGroup | null;
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

const leadFieldConfigs: FilterFieldConfigMap = {
  createdDate: { column: 'created_date_formatted', type: 'date' },
  birthDate: { column: 'birth_date_formatted', type: 'date' },
  name: { column: 'customer_name', type: 'text' },
  phone: { column: 'customer_phone', type: 'text' },
  email: { column: 'customer_email', type: 'text' },
  status: { column: 'status_main', type: 'select' },
  age: { column: 'age', type: 'number' },
  height: { column: 'height', type: 'number' },
  weight: { column: 'weight', type: 'number' },
  fitnessGoal: { column: 'fitness_goal', type: 'select' },
  activityLevel: { column: 'activity_level', type: 'select' },
  preferredTime: { column: 'preferred_time', type: 'select' },
  source: { column: 'source', type: 'select' },
  notes: { column: 'notes', type: 'text' },
  id: { column: 'id', type: 'text' },
  customer_name: { column: 'customer_name', type: 'text' },
  customer_phone: { column: 'customer_phone', type: 'text' },
  customer_email: { column: 'customer_email', type: 'text' },
  status_main: { column: 'status_main', type: 'text' },
  fitness_goal: { column: 'fitness_goal', type: 'text' },
  activity_level: { column: 'activity_level', type: 'text' },
  preferred_time: { column: 'preferred_time', type: 'text' },
  source_text: { column: 'source', type: 'text' },
};

const leadSearchColumns = [
  'customer_name',
  'customer_phone',
  'customer_email',
  'status_main',
  'fitness_goal',
  'activity_level',
  'preferred_time',
  'source_text',
  'notes',
];

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
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const searchGroup = filters.searchQuery ? createSearchGroup(filters.searchQuery, leadSearchColumns) : null;
    const combinedGroup = mergeFilterGroups(filters.filterGroup || null, searchGroup);

    let query = supabase
      .from('v_leads_with_customer')
      .select('*')
      .range(offset, offset + limit - 1);

    if (combinedGroup) {
      query = applyFilterGroupToQuery(query, combinedGroup, leadFieldConfigs);
    }

    const groupByMap: Record<string, string> = {
      status: 'status_main',
      status_main: 'status_main',
      source: 'source',
      fitnessGoal: 'fitness_goal',
      fitness_goal: 'fitness_goal',
      activityLevel: 'activity_level',
      activity_level: 'activity_level',
      preferredTime: 'preferred_time',
      preferred_time: 'preferred_time',
      name: 'customer_name',
      customer_name: 'customer_name',
      age: 'age',
      height: 'height',
      weight: 'weight',
    };

    const sortMap: Record<string, string> = {
      createdDate: 'created_at',
      created_at: 'created_at',
      name: 'customer_name',
      customer_name: 'customer_name',
      status: 'status_main',
      status_main: 'status_main',
      phone: 'customer_phone',
      customer_phone: 'customer_phone',
      source: 'source',
      fitnessGoal: 'fitness_goal',
      activityLevel: 'activity_level',
      preferredTime: 'preferred_time',
      age: 'age',
      height: 'height',
      weight: 'weight',
    };

    const sortBy = sortMap[filters.sortBy || 'created_at'] || 'created_at';
    const sortAscending = (filters.sortOrder || 'DESC') === 'ASC';

    if (filters.groupByLevel1 && groupByMap[filters.groupByLevel1]) {
      query = query.order(groupByMap[filters.groupByLevel1], { ascending: true });
    }
    if (filters.groupByLevel2 && groupByMap[filters.groupByLevel2]) {
      query = query.order(groupByMap[filters.groupByLevel2], { ascending: true });
    }
    query = query.order(sortBy, { ascending: sortAscending });

    const { data, error } = await query;

    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    throw error;
  }
}

export async function fetchLeadIdsByFilter(filters: LeadFilterParams): Promise<string[]> {
  const searchGroup = filters.searchQuery ? createSearchGroup(filters.searchQuery, leadSearchColumns) : null;
  const combinedGroup = mergeFilterGroups(filters.filterGroup || null, searchGroup);

  let query = supabase
    .from('v_leads_with_customer')
    .select('id');

  if (combinedGroup) {
    query = applyFilterGroupToQuery(query, combinedGroup, leadFieldConfigs);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row: { id: string }) => row.id);
}

/**
 * Get total count of leads matching filter criteria
 * Used for pagination to calculate total pages
 */
export async function getFilteredLeadsCount(
  filters: Omit<LeadFilterParams, 'limit' | 'offset' | 'sortBy' | 'sortOrder' | 'groupByLevel1' | 'groupByLevel2'>
): Promise<number> {
  try {
    const leadFieldConfigs: FilterFieldConfigMap = {
      createdDate: { column: 'created_date_formatted', type: 'date' },
      birthDate: { column: 'birth_date_formatted', type: 'date' },
      name: { column: 'customer_name', type: 'text' },
      phone: { column: 'customer_phone', type: 'text' },
      email: { column: 'customer_email', type: 'text' },
      status: { column: 'status_main', type: 'select' },
      age: { column: 'age', type: 'number' },
      height: { column: 'height', type: 'number' },
      weight: { column: 'weight', type: 'number' },
      fitnessGoal: { column: 'fitness_goal', type: 'select' },
      activityLevel: { column: 'activity_level', type: 'select' },
      preferredTime: { column: 'preferred_time', type: 'select' },
      source: { column: 'source', type: 'select' },
      notes: { column: 'notes', type: 'text' },
      id: { column: 'id', type: 'text' },
      customer_name: { column: 'customer_name', type: 'text' },
      customer_phone: { column: 'customer_phone', type: 'text' },
      customer_email: { column: 'customer_email', type: 'text' },
      status_main: { column: 'status_main', type: 'text' },
      fitness_goal: { column: 'fitness_goal', type: 'text' },
      activity_level: { column: 'activity_level', type: 'text' },
      preferred_time: { column: 'preferred_time', type: 'text' },
      source_text: { column: 'source', type: 'text' },
    };

    const searchColumns = [
      'customer_name',
      'customer_phone',
      'customer_email',
      'status_main',
      'fitness_goal',
      'activity_level',
      'preferred_time',
      'source_text',
      'notes',
    ];

    const searchGroup = filters.searchQuery ? createSearchGroup(filters.searchQuery, searchColumns) : null;
    const combinedGroup = mergeFilterGroups(filters.filterGroup || null, searchGroup);

    let query = supabase
      .from('v_leads_with_customer')
      .select('id', { count: 'exact', head: true });

    if (combinedGroup) {
      query = applyFilterGroupToQuery(query, combinedGroup, leadFieldConfigs);
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count || 0;
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
