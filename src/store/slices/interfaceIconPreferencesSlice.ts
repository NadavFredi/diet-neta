/**
 * Redux slice for managing interface icon preferences
 * 
 * Stores user preferences for customizing icons for main interface items.
 * These preferences are synced with the database but stored in Redux for
 * immediate reactivity across all components.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

interface InterfaceIconPreferencesState {
  preferences: Record<string, string>; // { 'leads': 'Users', 'customers': 'UserCircle', ... }
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: InterfaceIconPreferencesState = {
  preferences: {},
  isLoading: false,
  isInitialized: false,
};

export const interfaceIconPreferencesSlice = createSlice({
  name: 'interfaceIconPreferences',
  initialState,
  reducers: {
    setPreferences: (state, action: PayloadAction<Record<string, string>>) => {
      state.preferences = action.payload;
      state.isInitialized = true;
    },
    updatePreference: (state, action: PayloadAction<{ interfaceKey: string; iconName: string }>) => {
      state.preferences[action.payload.interfaceKey] = action.payload.iconName;
    },
    removePreference: (state, action: PayloadAction<string>) => {
      delete state.preferences[action.payload];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    reset: () => initialState,
  },
});

export const { setPreferences, updatePreference, removePreference, setLoading, reset } = 
  interfaceIconPreferencesSlice.actions;

// Selectors
export const selectInterfaceIconPreferences = (state: RootState) => 
  state.interfaceIconPreferences.preferences;

export const selectInterfaceIconPreference = (interfaceKey: string) => (state: RootState) =>
  state.interfaceIconPreferences.preferences[interfaceKey] || null;

export const selectIsIconPreferencesLoading = (state: RootState) =>
  state.interfaceIconPreferences.isLoading;

export const selectIsIconPreferencesInitialized = (state: RootState) =>
  state.interfaceIconPreferences.isInitialized;

export default interfaceIconPreferencesSlice.reducer;




