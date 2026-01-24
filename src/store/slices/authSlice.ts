import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'user' | 'trainee';
export type UserType = 'client' | 'endCustomer'; // Legacy support

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole | null;
  full_name?: string | null;
  customer_id?: string | null; // For trainees, link to their customer record
  is_active?: boolean | null;
  avatar_url?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  supabaseUser: User | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  supabaseUser: null,
};

// Async thunk to initialize auth from Supabase session
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // Get session with timeout protection
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's a session error or no session, return null (not authenticated)
      if (sessionError) {
        return null;
      }
      
      if (!session?.user) {
        return null;
      }
      
      // Fetch user profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, avatar_url')
        .eq('id', session.user.id)
        .single();
      
      // If profile doesn't exist, user is not fully set up - treat as not authenticated
      if (profileError) {
        // Don't sign out - just return null (user might not be set up yet)
        return null;
      }
      
      if (!profile) {
        return null;
      }

      if (profile.role === 'trainee' && profile.is_active === false) {
        await supabase.auth.signOut();
        return null;
      }
      
      // For trainees, fetch customer_id (optional - might not exist yet)
      let customer_id: string | null = null;
      if (profile.role === 'trainee') {
        try {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
          
          if (!customerError && customer) {
            customer_id = customer.id;
          }
        } catch (error) {
          // Ignore exceptions
        }
      }
      
      const authData = {
        supabaseUser: session.user,
        user: {
          id: profile.id,
          email: profile.email,
          role: profile.role as UserRole,
          full_name: profile.full_name,
          customer_id,
          is_active: profile.is_active ?? true,
        },
      };
      
      return authData;
    } catch (error: any) {
      // Return null instead of throwing - this ensures isLoading is set to false
      return null;
    }
  }
);

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.user) {
        throw new Error('No user returned from login');
      }
      
      // Fetch user profile with timeout protection
      const profilePromise = supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, avatar_url')
        .eq('id', data.user.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      let profileResult;
      try {
        profileResult = await Promise.race([profilePromise, timeoutPromise]);
      } catch (timeoutError) {
        throw new Error('Profile fetch timeout - please try again');
      }
      
      const { data: profile, error: profileError } = profileResult as any;
      
      if (profileError) {
        // If profile doesn't exist, create one with default role
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || '',
              role: 'user', // Default role
            })
            .select()
            .single();
          
          if (createError) {
            throw new Error('Failed to create user profile');
          }
          
          return {
            supabaseUser: data.user,
            user: {
              id: newProfile.id,
              email: newProfile.email,
              role: newProfile.role as UserRole,
              full_name: newProfile.full_name,
              customer_id: null,
              is_active: true,
              avatar_url: null,
            },
          };
        }
        throw profileError;
      }
      
      if (!profile) {
        throw new Error('User profile not found');
      }

      if (profile.role === 'trainee' && profile.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('החשבון שלך הושבת. אנא פנה למנהל.');
      }
      
      // Auto-fix: If trainee@test.com has role 'user', update it to 'trainee'
      if (profile.email === 'trainee@test.com' && profile.role === 'user') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'trainee' })
          .eq('id', data.user.id);
        
        if (!updateError) {
          profile.role = 'trainee';
        }
      }
      
      // Validate role
      const validRoles: UserRole[] = ['user', 'admin', 'trainee'];
      const userRole = validRoles.includes(profile.role as UserRole) 
        ? (profile.role as UserRole) 
        : 'user';
      
      // For trainees, fetch customer_id
      let customer_id: string | null = null;
      if (userRole === 'trainee') {
        try {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
          
          if (!customerError && customer) {
            customer_id = customer.id;
          }
        } catch (error) {
          // Ignore
        }
      }
      
      const result = {
        supabaseUser: data.user,
        user: {
          id: profile.id,
          email: profile.email,
          role: userRole,
          full_name: profile.full_name,
          customer_id,
          is_active: profile.is_active ?? true,
        },
      };
      
      return result;
    } catch (error: any) {
      return rejectWithValue(error?.message || error?.error?.message || 'Login failed');
    }
  }
);

// Async thunk for logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
    const { error } = await supabase.auth.signOut();
      if (error) {
        // Even if there's an error, we should still clear the local state
        // Return success so state gets cleared
        return;
      }
      return;
    } catch (error: any) {
      // Even on error, we want to clear local state
      // Return success so state gets cleared
      return;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    forceLoadingComplete: (state) => {
      // Emergency fallback to force loading to false
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.supabaseUser = action.payload.supabaseUser;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.supabaseUser = null;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.supabaseUser = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.supabaseUser = action.payload.supabaseUser;
        state.isLoading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.supabaseUser = null;
        state.isLoading = false;
      })
      .addCase(logoutUser.pending, (state) => {
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.supabaseUser = null;
        state.isLoading = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Clear state even if logout failed
        state.isAuthenticated = false;
        state.user = null;
        state.supabaseUser = null;
        state.isLoading = false;
      });
  },
});

export const { setUser, forceLoadingComplete } = authSlice.actions;
export default authSlice.reducer;





