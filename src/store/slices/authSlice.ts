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
      console.log('[Auth] Initializing auth...');
      
      // Get session with timeout protection
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's a session error or no session, return null (not authenticated)
      if (sessionError) {
        console.log('[Auth] Session error:', sessionError);
        return null;
      }
      
      if (!session?.user) {
        console.log('[Auth] No active session found');
        return null;
      }
      
      console.log('[Auth] Session found, fetching profile for user:', session.user.id);
      
      // Fetch user profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', session.user.id)
        .single();
      
      // If profile doesn't exist, user is not fully set up - treat as not authenticated
      if (profileError) {
        console.warn('[Auth] Profile error:', profileError);
        // Don't sign out - just return null (user might not be set up yet)
        return null;
      }
      
      if (!profile) {
        console.warn('[Auth] Profile not found for user:', session.user.id);
        return null;
      }
      
      console.log('[Auth] Profile found:', { role: profile.role, email: profile.email });
      
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
            console.log('[Auth] Trainee customer_id found:', customer_id);
          } else if (customerError) {
            console.warn('[Auth] Error fetching customer_id:', customerError);
          } else {
            console.log('[Auth] No customer record found for trainee (this is OK if not yet created)');
          }
        } catch (error) {
          console.warn('[Auth] Exception fetching customer_id:', error);
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
        },
      };
      
      console.log('[Auth] Initialization successful');
      return authData;
    } catch (error: any) {
      console.error('[Auth] Error initializing auth:', error);
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
      console.log('[loginUser] Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('[loginUser] Supabase auth error:', error);
        throw error;
      }
      
      if (!data.user) {
        console.error('[loginUser] No user returned from login');
        throw new Error('No user returned from login');
      }
      
      console.log('[loginUser] Auth successful, fetching profile for user:', data.user.id);
      
      // Fetch user profile with timeout protection
      const profilePromise = supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', data.user.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      let profileResult;
      try {
        profileResult = await Promise.race([profilePromise, timeoutPromise]);
      } catch (timeoutError) {
        console.error('[loginUser] Profile fetch timeout');
        throw new Error('Profile fetch timeout - please try again');
      }
      
      const { data: profile, error: profileError } = profileResult as any;
      
      if (profileError) {
        console.error('[loginUser] Profile error:', profileError);
        // If profile doesn't exist, create one with default role
        if (profileError.code === 'PGRST116') {
          console.log('[loginUser] Profile not found, creating default profile');
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
            console.error('[loginUser] Error creating profile:', createError);
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
            },
          };
        }
        throw profileError;
      }
      
      if (!profile) {
        console.error('[loginUser] Profile is null');
        throw new Error('User profile not found');
      }
      
      console.log('[loginUser] Profile found:', { 
        role: profile.role, 
        email: profile.email,
        full_name: profile.full_name,
        id: profile.id
      });
      
      // Auto-fix: If trainee@test.com has role 'user', update it to 'trainee'
      if (profile.email === 'trainee@test.com' && profile.role === 'user') {
        console.log('[loginUser] Auto-fixing trainee@test.com role from user to trainee');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'trainee' })
          .eq('id', data.user.id);
        
        if (!updateError) {
          profile.role = 'trainee';
          console.log('[loginUser] Successfully updated role to trainee');
        } else {
          console.error('[loginUser] Failed to update role:', updateError);
        }
      }
      
      // Validate role
      const validRoles: UserRole[] = ['user', 'admin', 'trainee'];
      const userRole = validRoles.includes(profile.role as UserRole) 
        ? (profile.role as UserRole) 
        : 'user';
      
      console.log('[loginUser] Validated role:', userRole, '(original:', profile.role, ')');
      
      // For trainees, fetch customer_id
      let customer_id: string | null = null;
      if (userRole === 'trainee') {
        console.log('[loginUser] Fetching customer_id for trainee...');
        try {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
          
          if (!customerError && customer) {
            customer_id = customer.id;
            console.log('[loginUser] Trainee customer_id found:', customer_id);
          } else if (customerError) {
            console.warn('[loginUser] Error fetching customer_id:', customerError);
          } else {
            console.log('[loginUser] No customer record found for trainee (this is OK if not yet created)');
          }
        } catch (error) {
          console.warn('[loginUser] Exception fetching customer_id:', error);
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
        },
      };
      
      console.log('[loginUser] Login successful, returning result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('[loginUser] Login failed:', error);
      return rejectWithValue(error?.message || error?.error?.message || 'Login failed');
    }
  }
);

// Async thunk for logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
        console.error('[authSlice] Login rejected:', action.error);
        state.isAuthenticated = false;
        state.user = null;
        state.supabaseUser = null;
        state.isLoading = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.supabaseUser = null;
      });
  },
});

export const { setUser, forceLoadingComplete } = authSlice.actions;
export default authSlice.reducer;









