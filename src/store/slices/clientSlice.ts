import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';

export interface DailyCheckIn {
  id: string;
  customer_id: string;
  lead_id: string | null;
  check_in_date: string;
  // Legacy fields (still supported)
  workout_completed: boolean;
  steps_goal_met: boolean;
  steps_actual: number | null;
  nutrition_goal_met: boolean;
  supplements_taken: string[];
  notes: string | null;
  // Physical measurements (6 fields)
  weight: number | null; // kg
  belly_circumference: number | null; // cm - היקף בטן
  waist_circumference: number | null; // cm - היקף מותן
  thigh_circumference: number | null; // cm - היקף ירכיים
  arm_circumference: number | null; // cm - היקף יד
  neck_circumference: number | null; // cm - היקף צוואר
  // Activity metrics (4 fields)
  exercises_count: number | null; // כמה תרגילים עשית
  cardio_amount: number | null; // minutes - כמה אירובי עשית
  intervals_count: number | null; // כמה אינטרוולים
  // Nutrition and Hydration (4 fields)
  calories_daily: number | null; // קלוריות יומי
  protein_daily: number | null; // grams - חלבון יומי
  fiber_daily: number | null; // grams - סיבים יומי
  water_amount: number | null; // liters - כמה מים שתית
  // Well-being scales 1-10 (3 fields)
  stress_level: number | null; // 1-10 - רמת הלחץ היומי
  hunger_level: number | null; // 1-10 - רמת הרעב שלך
  energy_level: number | null; // 1-10 - רמת האנרגיה שלך
  // Rest (1 field)
  sleep_hours: number | null; // hours - כמה שעות ישנת
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ClientLead {
  id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  status_main: string | null;
  status_sub: string | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  fitness_goal: string | null;
  activity_level: string | null;
  birth_date: string | null;
  gender: string | null;
  join_date: string | null;
  subscription_data: any;
  daily_protocol: any;
}

export interface ClientCustomer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientState {
  customer: ClientCustomer | null;
  activeLead: ClientLead | null;
  leads: ClientLead[];
  checkIns: DailyCheckIn[];
  isLoading: boolean;
  isLoadingCheckIns: boolean;
  error: string | null;
  selectedDate: string | null; // ISO date string (YYYY-MM-DD)
}

const initialState: ClientState = {
  customer: null,
  activeLead: null,
  leads: [],
  checkIns: [],
  isLoading: false,
  isLoadingCheckIns: false,
  error: null,
  selectedDate: null, // Will default to today
};

// Fetch client's customer data and leads by customer_id
export const fetchClientData = createAsyncThunk(
  'client/fetchData',
  async (customerId: string) => {
    console.log('[fetchClientData] Fetching customer data for customer_id:', customerId);
    
    // Fetch customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();

    if (customerError) {
      console.error('[fetchClientData] Error fetching customer:', customerError);
      throw customerError;
    }

    if (!customer) {
      console.warn('[fetchClientData] Customer not found for customer_id:', customerId);
      throw new Error('Customer not found');
    }

    // Fetch all leads for this customer
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('[fetchClientData] Error fetching leads:', leadsError);
      throw leadsError;
    }

    // Get most recent active lead (or most recent if none active)
    const activeLead = leads && leads.length > 0 ? leads[0] : null;

    console.log('[fetchClientData] Successfully fetched:', {
      customer: customer.id,
      leadsCount: leads?.length || 0,
      activeLeadId: activeLead?.id || null
    });

    return {
      customer: customer as ClientCustomer,
      leads: (leads || []) as ClientLead[],
      activeLead: activeLead as ClientLead | null,
    };
  }
);

// Fetch client's customer data and leads by user_id (for when customer_id is not set)
export const fetchClientDataByUserId = createAsyncThunk(
  'client/fetchDataByUserId',
  async (userId: string) => {
    console.log('[fetchClientDataByUserId] Fetching customer data for user_id:', userId);
    
    // Fetch customer by user_id
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (customerError) {
      console.error('[fetchClientDataByUserId] Error fetching customer:', customerError);
      throw customerError;
    }

    if (!customer) {
      console.warn('[fetchClientDataByUserId] Customer not found for user_id:', userId);
      // Return empty state instead of throwing - allows UI to show "no customer" message
      return {
        customer: null,
        leads: [],
        activeLead: null,
      };
    }

    // Fetch all leads for this customer
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('[fetchClientDataByUserId] Error fetching leads:', leadsError);
      throw leadsError;
    }

    // Get most recent active lead (or most recent if none active)
    const activeLead = leads && leads.length > 0 ? leads[0] : null;

    console.log('[fetchClientDataByUserId] Successfully fetched:', {
      customer: customer.id,
      leadsCount: leads?.length || 0,
      activeLeadId: activeLead?.id || null
    });

    return {
      customer: customer as ClientCustomer,
      leads: (leads || []) as ClientLead[],
      activeLead: activeLead as ClientLead | null,
    };
  }
);

// Fetch daily check-ins
export const fetchCheckIns = createAsyncThunk(
  'client/fetchCheckIns',
  async (customerId: string) => {
    console.log('[fetchCheckIns] Fetching check-ins for customer_id:', customerId);
    
    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('customer_id', customerId)
      .order('check_in_date', { ascending: false })
      .limit(30); // Last 30 days

    if (error) {
      console.error('[fetchCheckIns] Error fetching check-ins:', error);
      throw error;
    }

    console.log('[fetchCheckIns] Successfully fetched', data?.length || 0, 'check-ins');
    return (data || []) as DailyCheckIn[];
  }
);

// Create or update daily check-in
export const upsertCheckIn = createAsyncThunk(
  'client/upsertCheckIn',
  async (checkIn: Partial<DailyCheckIn> & { customer_id: string; check_in_date: string }) => {
    const { data, error } = await supabase
      .from('daily_check_ins')
      .upsert(
        {
          ...checkIn,
          check_in_date: checkIn.check_in_date,
        },
        {
          onConflict: 'customer_id,check_in_date',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data as DailyCheckIn;
  }
);

// Batch create or update multiple daily check-ins
export const batchUpsertCheckIns = createAsyncThunk(
  'client/batchUpsertCheckIns',
  async (checkIns: Array<Partial<DailyCheckIn> & { customer_id: string; check_in_date: string }>) => {
    const { data, error } = await supabase
      .from('daily_check_ins')
      .upsert(
        checkIns,
        {
          onConflict: 'customer_id,check_in_date',
        }
      )
      .select();

    if (error) throw error;
    return (data || []) as DailyCheckIn[];
  }
);

// Update lead (for weight, height, etc.)
export const updateClientLead = createAsyncThunk(
  'client/updateLead',
  async ({ leadId, updates }: { leadId: string; updates: Partial<ClientLead> }) => {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data as ClientLead;
  }
);

// Update customer
export const updateClientCustomer = createAsyncThunk(
  'client/updateCustomer',
  async ({ customerId, updates }: { customerId: string; updates: Partial<ClientCustomer> }) => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;
    return data as ClientCustomer;
  }
);

const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    setActiveLead: (state, action: PayloadAction<ClientLead | null>) => {
      state.activeLead = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch client data
      .addCase(fetchClientData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClientData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customer = action.payload.customer;
        state.leads = action.payload.leads;
        state.activeLead = action.payload.activeLead;
      })
      .addCase(fetchClientData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch client data';
        console.error('[clientSlice] fetchClientData rejected:', action.error);
      })
      // Fetch client data by user_id
      .addCase(fetchClientDataByUserId.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClientDataByUserId.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customer = action.payload.customer;
        state.leads = action.payload.leads;
        state.activeLead = action.payload.activeLead;
      })
      .addCase(fetchClientDataByUserId.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch client data';
        console.error('[clientSlice] fetchClientDataByUserId rejected:', action.error);
      })
      // Fetch check-ins
      .addCase(fetchCheckIns.pending, (state) => {
        state.isLoadingCheckIns = true;
        state.error = null;
      })
      .addCase(fetchCheckIns.fulfilled, (state, action) => {
        state.isLoadingCheckIns = false;
        state.checkIns = action.payload;
      })
      .addCase(fetchCheckIns.rejected, (state, action) => {
        state.isLoadingCheckIns = false;
        state.error = action.error.message || 'Failed to fetch check-ins';
        console.error('[clientSlice] fetchCheckIns rejected:', action.error);
      })
      // Upsert check-in
      .addCase(upsertCheckIn.fulfilled, (state, action) => {
        const index = state.checkIns.findIndex(
          (ci) => ci.id === action.payload.id
        );
        if (index >= 0) {
          state.checkIns[index] = action.payload;
        } else {
          state.checkIns.unshift(action.payload);
        }
      })
      // Batch upsert check-ins
      .addCase(batchUpsertCheckIns.fulfilled, (state, action) => {
        action.payload.forEach((checkIn) => {
          const index = state.checkIns.findIndex((ci) => ci.id === checkIn.id);
          if (index >= 0) {
            state.checkIns[index] = checkIn;
          } else {
            state.checkIns.unshift(checkIn);
          }
        });
        // Sort by date descending
        state.checkIns.sort((a, b) => 
          new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime()
        );
      })
      // Update lead
      .addCase(updateClientLead.fulfilled, (state, action) => {
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index >= 0) {
          state.leads[index] = action.payload;
        }
        if (state.activeLead?.id === action.payload.id) {
          state.activeLead = action.payload;
        }
      })
      // Update customer
      .addCase(updateClientCustomer.fulfilled, (state, action) => {
        state.customer = action.payload;
      });
  },
});

export const { setActiveLead, setSelectedDate, clearError } = clientSlice.actions;
export default clientSlice.reducer;

