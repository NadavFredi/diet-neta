import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserType = 'client' | 'endCustomer';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    email: string;
    type: UserType | null;
  } | null;
}

// Load initial state from localStorage
const loadAuthFromStorage = (): AuthState => {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the stored data structure
      if (parsed && typeof parsed === 'object' && parsed.isAuthenticated && parsed.user) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading auth from localStorage:', error);
    // Clear corrupted data
    localStorage.removeItem('auth');
  }
  return {
    isAuthenticated: false,
    user: null,
  };
};

const initialState: AuthState = loadAuthFromStorage();

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









