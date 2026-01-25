/**
 * Budget (Taktziv) Redux Slice
 * 
 * Manages budget templates and active client budget assignments
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';

// =====================================================
// Types
// =====================================================

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber_min: number;
  water_min: number; // in liters
}

export interface Supplement {
  name: string;
  dosage: string;
  timing: string; // e.g., "בבוקר", "לערב לפני השינה", "רבע שעה לפני האוכל"
  link1?: string;
  link2?: string;
}

export interface CardioTraining {
  id?: string; // Unique identifier for list items
  name: string;
  type: string; // e.g., "Walking", "Running", "Cycling", "Elliptical", "Swimming"
  duration_minutes: number;
  workouts_per_week: number; // 1-7
  period_type?: string; // 'לשבוע' or 'ליום'
  notes: string;
}

export interface IntervalTraining {
  id?: string; // Unique identifier for list items
  name: string;
  type: string; // e.g., "HIIT", "Tabata", "Circuit"
  duration_minutes: number;
  workouts_per_week: number; // 1-7
  period_type?: string; // 'לשבוע' or 'ליום'
  notes: string;
}

export interface Budget {
  id: string;
  name: string;
  description: string | null;
  nutrition_template_id: string | null;
  nutrition_targets: NutritionTargets;
  steps_goal: number;
  steps_instructions: string | null;
  workout_template_id: string | null;
  supplement_template_id: string | null;
  supplements: Supplement[];
  eating_order: string | null;
  eating_rules: string | null;
  cardio_training: CardioTraining[] | null;
  interval_training: IntervalTraining[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BudgetAssignment {
  id: string;
  budget_id: string;
  lead_id: string | null;
  customer_id: string | null;
  assigned_at: string;
  assigned_by: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  budget?: Budget;
}

interface BudgetState {
  budgets: Budget[];
  assignments: BudgetAssignment[];
  activeBudgetForLead: Record<string, Budget | null>; // lead_id -> Budget
  activeBudgetForCustomer: Record<string, Budget | null>; // customer_id -> Budget
  isLoading: boolean;
  error: string | null;
  generatingPDF: Record<string, boolean>; // budgetId -> isGenerating
  sendingWhatsApp: Record<string, boolean>; // budgetId -> isSending
}

const initialState: BudgetState = {
  budgets: [],
  assignments: [],
  activeBudgetForLead: {},
  activeBudgetForCustomer: {},
  isLoading: false,
  error: null,
  generatingPDF: {},
  sendingWhatsApp: {},
};

// =====================================================
// Async Thunks
// =====================================================

export const fetchBudgets = createAsyncThunk(
  'budget/fetchBudgets',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out any invalid budgets (ensure name exists and budget is valid)
      const validBudgets = (data || []).filter((budget: any) => {
        // Ensure budget has required fields
        return budget && 
               budget.id && 
               budget.name && 
               budget.name.trim() !== '' &&
               (budget.is_public === true || budget.created_by === user.id);
      });

      return validBudgets as Budget[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch budgets');
    }
  }
);

export const fetchBudgetAssignments = createAsyncThunk(
  'budget/fetchBudgetAssignments',
  async ({ leadId, customerId }: { leadId?: string; customerId?: string }, { rejectWithValue }) => {
    try {
      let query = supabase
        .from('budget_assignments')
        .select(`
          *,
          budget:budgets(*)
        `);

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query.order('assigned_at', { ascending: false });

      if (error) throw error;
      return data as BudgetAssignment[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch budget assignments');
    }
  }
);

export const assignBudgetToLead = createAsyncThunk(
  'budget/assignBudgetToLead',
  async (
    { budgetId, leadId, notes }: { budgetId: string; leadId: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Deactivate any existing active budget for this lead
      await supabase
        .from('budget_assignments')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true);

      // Create new assignment
      const { data, error } = await supabase
        .from('budget_assignments')
        .insert({
          budget_id: budgetId,
          lead_id: leadId,
          assigned_by: user.id,
          is_active: true,
          notes: notes || null,
        })
        .select(`
          *,
          budget:budgets(*)
        `)
        .single();

      if (error) throw error;
      return data as BudgetAssignment;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to assign budget');
    }
  }
);

export const assignBudgetToCustomer = createAsyncThunk(
  'budget/assignBudgetToCustomer',
  async (
    { budgetId, customerId, notes }: { budgetId: string; customerId: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Deactivate any existing active budget for this customer
      await supabase
        .from('budget_assignments')
        .update({ is_active: false })
        .eq('customer_id', customerId)
        .eq('is_active', true);

      // Create new assignment
      const { data, error } = await supabase
        .from('budget_assignments')
        .insert({
          budget_id: budgetId,
          customer_id: customerId,
          assigned_by: user.id,
          is_active: true,
          notes: notes || null,
        })
        .select(`
          *,
          budget:budgets(*)
        `)
        .single();

      if (error) throw error;
      return data as BudgetAssignment;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to assign budget');
    }
  }
);

// =====================================================
// Slice
// =====================================================

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setActiveBudgetForLead: (state, action: PayloadAction<{ leadId: string; budget: Budget | null }>) => {
      state.activeBudgetForLead[action.payload.leadId] = action.payload.budget;
    },
    setActiveBudgetForCustomer: (state, action: PayloadAction<{ customerId: string; budget: Budget | null }>) => {
      state.activeBudgetForCustomer[action.payload.customerId] = action.payload.budget;
    },
    setGeneratingPDF: (state, action: PayloadAction<{ budgetId: string; isGenerating: boolean }>) => {
      state.generatingPDF[action.payload.budgetId] = action.payload.isGenerating;
    },
    setSendingWhatsApp: (state, action: PayloadAction<{ budgetId: string; isSending: boolean }>) => {
      state.sendingWhatsApp[action.payload.budgetId] = action.payload.isSending;
    },
  },
  extraReducers: (builder) => {
    // Fetch budgets
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.budgets = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch assignments
    builder
      .addCase(fetchBudgetAssignments.fulfilled, (state, action) => {
        state.assignments = action.payload;
        // Update active budget maps
        action.payload.forEach((assignment) => {
          if (assignment.is_active && assignment.budget) {
            if (assignment.lead_id) {
              state.activeBudgetForLead[assignment.lead_id] = assignment.budget;
            }
            if (assignment.customer_id) {
              state.activeBudgetForCustomer[assignment.customer_id] = assignment.budget;
            }
          }
        });
      });

    // Assign to lead
    builder
      .addCase(assignBudgetToLead.fulfilled, (state, action) => {
        const assignment = action.payload;
        state.assignments.push(assignment);
        if (assignment.budget && assignment.lead_id) {
          state.activeBudgetForLead[assignment.lead_id] = assignment.budget;
        }
      });

    // Assign to customer
    builder
      .addCase(assignBudgetToCustomer.fulfilled, (state, action) => {
        const assignment = action.payload;
        state.assignments.push(assignment);
        if (assignment.budget && assignment.customer_id) {
          state.activeBudgetForCustomer[assignment.customer_id] = assignment.budget;
        }
      });
  },
});

export const { clearError, setActiveBudgetForLead, setActiveBudgetForCustomer, setGeneratingPDF, setSendingWhatsApp } = budgetSlice.actions;
export default budgetSlice.reducer;

