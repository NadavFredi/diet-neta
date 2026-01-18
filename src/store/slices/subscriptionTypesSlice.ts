/**
 * Subscription Types Redux Slice
 * 
 * Manages subscription type templates
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';

// =====================================================
// Types
// =====================================================

export type Currency = 'ILS' | 'USD' | 'EUR';
export type DurationUnit = 'days' | 'weeks' | 'months';

export interface SubscriptionType {
  id: string;
  name: string;
  duration: number; // Duration value (interpreted based on duration_unit)
  duration_unit: DurationUnit; // Unit for duration: days, weeks, or months
  price: number; // Price amount
  currency: Currency; // Currency code: ILS, USD, or EUR
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface SubscriptionTypesState {
  subscriptionTypes: SubscriptionType[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SubscriptionTypesState = {
  subscriptionTypes: [],
  isLoading: false,
  error: null,
};

// =====================================================
// Async Thunks
// =====================================================

export const fetchSubscriptionTypes = createAsyncThunk(
  'subscriptionTypes/fetchSubscriptionTypes',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subscription_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscription types:', error);
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת סוגי המנויים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as SubscriptionType[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch subscription types');
    }
  }
);

// =====================================================
// Slice
// =====================================================

const subscriptionTypesSlice = createSlice({
  name: 'subscriptionTypes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch subscription types
    builder
      .addCase(fetchSubscriptionTypes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionTypes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscriptionTypes = action.payload;
      })
      .addCase(fetchSubscriptionTypes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = subscriptionTypesSlice.actions;
export default subscriptionTypesSlice.reducer;
