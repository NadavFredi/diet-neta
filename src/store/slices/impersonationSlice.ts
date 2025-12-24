/**
 * Impersonation Slice
 * 
 * Manages secure "View as Client" mode for admins
 * This is a preview/impersonation mode, not a real login
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedCustomerId: string | null;
  originalUser: {
    id: string;
    email: string;
    role: string;
  } | null;
  previousLocation: string | null; // Store the URL before entering impersonation mode
}

const initialState: ImpersonationState = {
  isImpersonating: false,
  impersonatedUserId: null,
  impersonatedCustomerId: null,
  originalUser: null,
  previousLocation: null,
};

const impersonationSlice = createSlice({
  name: 'impersonation',
  initialState,
  reducers: {
    startImpersonation: (
      state,
      action: PayloadAction<{
        userId: string;
        customerId: string;
        originalUser: { id: string; email: string; role: string };
      }>
    ) => {
      state.isImpersonating = true;
      state.impersonatedUserId = action.payload.userId;
      state.impersonatedCustomerId = action.payload.customerId;
      state.originalUser = action.payload.originalUser;
    },
    stopImpersonation: (state) => {
      state.isImpersonating = false;
      state.impersonatedUserId = null;
      state.impersonatedCustomerId = null;
      state.originalUser = null;
    },
  },
});

export const { startImpersonation, stopImpersonation, clearPreviousLocation } = impersonationSlice.actions;
export default impersonationSlice.reducer;
