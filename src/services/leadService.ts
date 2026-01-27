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
import { createSearchGroup, mergeFilterGroups, flattenFilterGroup } from '@/utils/filterGroupUtils';

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
  sortKeys?: string[];
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
  created_date_formatted: string | null;
  height: number | null;
  weight: number | null;
  daily_steps_goal: number | null;
  weekly_workouts: number | null;
  daily_supplements: string[] | null;
  subscription_months: number | null;
  subscription_initial_price: number | null;
  subscription_renewal_price: number | null;
  // Related entities (from joins)
  budget_assignments?: Array<{
    id: string;
    budgets?: {
      id: string;
      name: string;
      description?: string;
      steps_goal?: number;
      steps_instructions?: string;
      eating_order?: string;
      eating_rules?: string;
      supplements?: any[];
      nutrition_targets?: any;
      is_public?: boolean;
      nutrition_template_id?: string;
      workout_template_id?: string;
      nutrition_templates?: {
        id: string;
        name: string;
        description?: string;
        targets?: {
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        };
      };
    };
  }>;
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
  // Related entity: Subscription (JSONB) - Entity exists
  'subscription.exists': {
    column: 'subscription_data',
    type: 'select',
    relatedEntity: 'subscription',
    relatedPath: 'subscription_data',
    joinType: 'jsonb',
    custom: (filter, negate) => {
      // Check if subscription_data exists (is not null and not empty object)
      const hasValue = filter.values[0] === 'כן' || filter.values[0] === 'true' || filter.values[0] === 'yes';
      const shouldExist = filter.operator === 'is' ? hasValue : !hasValue;
      const finalNegate = negate ? !shouldExist : shouldExist;
      
      if (finalNegate) {
        // subscription_data IS NOT NULL AND subscription_data != '{}'::jsonb
        // For PostgREST, we use not.is.null and neq operators
        return [[
          { column: 'subscription_data', operator: 'eq', value: null, negate: true },
          { column: "subscription_data", operator: 'neq', value: '{}' },
        ]];
      } else {
        // subscription_data IS NULL OR subscription_data = '{}'::jsonb
        // Use OR logic: either null or empty object
        return [
          [{ column: 'subscription_data', operator: 'eq', value: null }],
          [{ column: "subscription_data", operator: 'eq', value: '{}' }],
        ];
      }
    },
  },
  'subscription.months': { 
    column: "subscription_data->>'months'", 
    type: 'number',
    relatedEntity: 'subscription',
    relatedPath: "subscription_data->>'months'",
    joinType: 'jsonb',
    valueMap: (v) => Number(v)
  },
  'subscription.initialPrice': { 
    column: "subscription_data->>'initialPrice'", 
    type: 'number',
    relatedEntity: 'subscription',
    relatedPath: "subscription_data->>'initialPrice'",
    joinType: 'jsonb',
    valueMap: (v) => Number(v)
  },
  'subscription.renewalPrice': { 
    column: "subscription_data->>'renewalPrice'", 
    type: 'number',
    relatedEntity: 'subscription',
    relatedPath: "subscription_data->>'renewalPrice'",
    joinType: 'jsonb',
    valueMap: (v) => Number(v)
  },
  // Related entity: Budget (through budget_assignments) - Entity exists
  'budget.exists': {
    column: 'budget_assignments.id',
    type: 'select',
    relatedEntity: 'budgets',
    relatedPath: 'budget_assignments.id',
    joinType: 'through',
    custom: (filter, negate) => {
      // Check if budget_assignment exists for this lead
      const hasValue = filter.values[0] === 'כן' || filter.values[0] === 'true' || filter.values[0] === 'yes';
      const shouldExist = filter.operator === 'is' ? hasValue : !hasValue;
      const finalNegate = negate ? !shouldExist : shouldExist;
      
      // For "exists" filters on through relationships, we check if the joined id is not null
      // The join type (inner/left) is handled in the query builder
      return [[
        { column: 'budget_assignments.id', operator: 'eq', value: null, negate: !finalNegate },
      ]];
    },
  },
  'budget.name': { 
    column: 'budgets.name', 
    type: 'text',
    relatedEntity: 'budgets',
    relatedPath: 'budgets.name',
    joinType: 'through'
  },
  'budget.steps_goal': { 
    column: 'budgets.steps_goal', 
    type: 'number',
    relatedEntity: 'budgets',
    relatedPath: 'budgets.steps_goal',
    joinType: 'through',
    valueMap: (v) => Number(v)
  },
  'budget.is_public': { 
    column: 'budgets.is_public', 
    type: 'select',
    relatedEntity: 'budgets',
    relatedPath: 'budgets.is_public',
    joinType: 'through'
  },
  // Related entity: Menu (through budgets -> nutrition_templates) - Entity exists
  'menu.exists': {
    column: 'nutrition_templates.id',
    type: 'select',
    relatedEntity: 'nutrition_templates',
    relatedPath: 'nutrition_templates.id',
    joinType: 'through',
    custom: (filter, negate) => {
      // Check if nutrition_template exists (through budget -> nutrition_template)
      const hasValue = filter.values[0] === 'כן' || filter.values[0] === 'true' || filter.values[0] === 'yes';
      const shouldExist = filter.operator === 'is' ? hasValue : !hasValue;
      const finalNegate = negate ? !shouldExist : shouldExist;
      
      return [[
        { column: 'nutrition_templates.id', operator: 'eq', value: null, negate: !finalNegate },
      ]];
    },
  },
  'menu.nutrition_template_name': { 
    column: 'nutrition_templates.name', 
    type: 'text',
    relatedEntity: 'nutrition_templates',
    relatedPath: 'nutrition_templates.name',
    joinType: 'through'
  },
  'menu.calories': { 
    column: 'nutrition_templates.targets->>calories', 
    type: 'number',
    relatedEntity: 'nutrition_templates',
    relatedPath: 'nutrition_templates.targets->>calories',
    joinType: 'through',
    valueMap: (v) => Number(v)
  },
  'menu.protein': { 
    column: 'nutrition_templates.targets->>protein', 
    type: 'number',
    relatedEntity: 'nutrition_templates',
    relatedPath: 'nutrition_templates.targets->>protein',
    joinType: 'through',
    valueMap: (v) => Number(v)
  },
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
    const searchGroup = filters.searchQuery ? createSearchGroup(filters.searchQuery, leadSearchColumns) : null;
    const combinedGroup = mergeFilterGroups(filters.filterGroup || null, searchGroup);

    // When grouping is active, we may skip pagination to allow full client-side grouping.
    const isGroupingActive = !!(filters.groupByLevel1 || filters.groupByLevel2);

    // Check if we need inner joins for "entity exists" filters
    const hasEntityExistsFilters = combinedGroup && 
      flattenFilterGroup(combinedGroup).some(filter => 
        filter.fieldId === 'subscription.exists' ||
        filter.fieldId === 'budget.exists' ||
        filter.fieldId === 'menu.exists'
      );

    // Always fetch related entities (using left joins) so columns can display the data
    // Use inner joins only when filtering by "entity exists = yes"
    const budgetJoinType = hasEntityExistsFilters && 
      flattenFilterGroup(combinedGroup || { id: '', operator: 'and', children: [] }).some(f => 
        f.fieldId === 'budget.exists' && f.values[0] === 'כן'
      )
      ? '!inner' : '';
    const menuJoinType = hasEntityExistsFilters && 
      flattenFilterGroup(combinedGroup || { id: '', operator: 'and', children: [] }).some(f => 
        f.fieldId === 'menu.exists' && f.values[0] === 'כן'
      )
      ? '!inner' : '';

    let query = supabase
      .from('v_leads_with_customer')
      .select(`
        *,
        budget_assignments${budgetJoinType}!lead_id(
          id,
          budgets${budgetJoinType}(
            id,
            name,
            description,
            steps_goal,
            steps_instructions,
            eating_order,
            eating_rules,
            supplements,
            nutrition_targets,
            is_public,
            nutrition_template_id,
            workout_template_id,
            nutrition_templates:nutrition_template_id${menuJoinType}(
              id,
              name,
              description,
              targets
            )
          )
        )
      `);

    const hasPagination = typeof filters.limit === 'number' || typeof filters.offset === 'number';
    if (hasPagination) {
      const limit = typeof filters.limit === 'number' ? filters.limit : 100;
      const offset = typeof filters.offset === 'number' ? filters.offset : 0;
      const maxLimit = isGroupingActive ? limit : Math.min(limit, 100);
      query = query.range(offset, offset + maxLimit - 1);
    }

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
    if (filters.sortKeys && filters.sortKeys.length > 0) {
      filters.sortKeys.forEach((key) => {
        query = query.order(key, { ascending: sortAscending, nullsFirst: false });
      });
    } else {
      query = query.order(sortBy, { ascending: sortAscending });
    }

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
 * Preserves related entity data for column accessors
 * Handles both direct database queries and edge function responses
 */
export function mapLeadToUIFormat(dbLead: LeadFromDB | any) {
  // Format created_at if created_date_formatted is missing
  // The view should provide created_date_formatted, but if it's null/undefined,
  // we format created_at directly as a fallback
  let createdDate = dbLead.created_date_formatted;
  if (!createdDate && dbLead.created_at) {
    try {
      // Format the date manually if the view didn't provide formatted version
      const date = new Date(dbLead.created_at);
      if (!isNaN(date.getTime())) {
        createdDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    } catch (e) {
      // If date parsing fails, createdDate will remain null/undefined
    }
  }
  
  // Handle age - could be calculated in DB or need to calculate from birth_date
  let age = dbLead.age;
  if (!age && dbLead.birth_date) {
    try {
      const birthDate = new Date(dbLead.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    } catch (e) {
      // Age calculation failed
    }
  }
  
  const mapped = {
    id: dbLead.id,
    name: dbLead.customer_name || dbLead.name || '',
    createdDate: createdDate || dbLead.created_at || '', // Empty string will be handled by cell renderer to show "-"
    status: dbLead.status_sub || dbLead.status_main || dbLead.status || '',
    phone: dbLead.customer_phone || dbLead.phone || '',
    email: dbLead.customer_email || dbLead.email || '',
    source: dbLead.source || '',
    age: age || 0,
    birthDate: dbLead.birth_date_formatted || dbLead.birth_date || '',
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
    // Preserve related entity data for column accessors
    subscription_months: dbLead.subscription_months,
    subscription_initial_price: dbLead.subscription_initial_price,
    subscription_renewal_price: dbLead.subscription_renewal_price,
    budget_assignments: dbLead.budget_assignments || [],
  };
  
  return mapped;
}
