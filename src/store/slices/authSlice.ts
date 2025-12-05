import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserType = 'client' | 'endCustomer';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    email: string;
    type: UserType | null;
  } | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ email: string; type: UserType }>) => {
      state.isAuthenticated = true;
      state.user = {
        email: action.payload.email,
        type: action.payload.type,
      };
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;



