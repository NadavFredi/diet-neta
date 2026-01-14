/**
 * Invitation Slice
 * 
 * Manages secure user invitations for trainee creation
 * No passwords are stored or generated
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';
import { generateSecureToken, generateSalt, hashToken } from '@/utils/crypto';

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';

export interface UserInvitation {
  id: string;
  email: string;
  user_id: string | null;
  customer_id: string | null;
  lead_id: string | null;
  status: InvitationStatus;
  invited_by: string | null;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InvitationState {
  invitations: UserInvitation[];
  isLoading: boolean;
  error: string | null;
  lastCreatedInvitation: UserInvitation | null;
}

const initialState: InvitationState = {
  invitations: [],
  isLoading: false,
  error: null,
  lastCreatedInvitation: null,
};

// Create invitation for trainee user (secure, no password)
export const createTraineeInvitation = createAsyncThunk(
  'invitation/create',
  async (
    {
      email,
      customerId,
      leadId,
      expiresInDays = 7,
    }: {
      email: string;
      customerId: string;
      leadId?: string | null;
      expiresInDays?: number;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user is admin/manager
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[createTraineeInvitation] Profile fetch error:', profileError);
        throw new Error(`Failed to verify permissions: ${profileError.message}`);
      }

      if (!profile || !['admin', 'user'].includes(profile.role)) {
        throw new Error('Unauthorized: Only admins and managers can create invitations');
      }

      // Check if user already exists by checking profiles table
      // This is safer than using admin API in frontend
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('email', email)
        .maybeSingle();

      let userId: string | null = null;
      if (existingProfile) {
        userId = existingProfile.id;
        
        // Check if user already has a profile with trainee role
        if (existingProfile.role === 'trainee') {
          throw new Error('User already exists as a trainee');
        }
      }

      // Generate secure token and salt
      const token = await generateSecureToken(32);
      const salt = await generateSalt();
      const tokenHash = await hashToken(token, salt);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Create invitation record first
      // User will be created/linked when they accept the invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          email,
          user_id: userId, // Will be null if user doesn't exist yet
          customer_id: customerId,
          lead_id: leadId || null,
          token_hash: tokenHash,
          token_salt: salt,
          status: 'pending',
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (inviteError) {
        console.error('[createTraineeInvitation] Error:', inviteError);
        throw inviteError;
      }

      // If user exists, update their profile to trainee role if needed
      if (userId && existingProfile && existingProfile.role !== 'trainee') {
        await supabase
          .from('profiles')
          .update({ role: 'trainee' })
          .eq('id', userId);
      }

      // Log audit event
      await supabase.from('invitation_audit_log').insert({
        invitation_id: invitation.id,
        action: 'created',
        performed_by: user.id,
        metadata: { email, customerId, leadId },
      });

      // Return invitation with token (token is only returned once, never stored)
      // In production, send email here instead of returning token
      return {
        invitation: { ...invitation, user_id: userId } as UserInvitation,
        token, // Only returned for initial creation, never stored in state
      };
    } catch (error: any) {
      console.error('[createTraineeInvitation] Error:', error);
      return rejectWithValue(error?.message || 'Failed to create invitation');
    }
  }
);

// Send invitation email (generates magic link)
export const sendInvitationEmail = createAsyncThunk(
  'invitation/sendEmail',
  async (
    { invitationId }: { invitationId: string },
    { rejectWithValue }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !invitation) {
        throw new Error('Invitation not found');
      }

      // Generate new token for this send (invalidate old ones)
      const token = await generateSecureToken(32);
      const salt = await generateSalt();
      const tokenHash = await hashToken(token, salt);

      // Update invitation with new token
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          token_hash: tokenHash,
          token_salt: salt,
          status: 'sent',
          invited_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Log audit
      await supabase.from('invitation_audit_log').insert({
        invitation_id: invitationId,
        action: 'sent',
        performed_by: user.id,
      });

      // Generate magic link
      const magicLink = `${window.location.origin}/invite/accept?token=${token}&invitation=${invitationId}`;

      // TODO: Send email via Supabase Edge Function or email service
      // For now, we'll return the link (in production, this should be sent via email only)
      console.log('[sendInvitationEmail] Magic link generated:', magicLink);

      return { invitationId, magicLink, email: invitation.email };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to send invitation');
    }
  }
);

// Resend invitation
export const resendInvitation = createAsyncThunk(
  'invitation/resend',
  async ({ invitationId }: { invitationId: string }, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get invitation
      const { data: invitation } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (!invitation) throw new Error('Invitation not found');

      // Check rate limiting (prevent abuse)
      const { data: recentResends } = await supabase
        .from('invitation_audit_log')
        .select('created_at')
        .eq('invitation_id', invitationId)
        .eq('action', 'resent')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentResends && recentResends.length >= 5) {
        throw new Error('Rate limit exceeded. Please wait before resending.');
      }

      // Invalidate old token and generate new one
      const token = await generateSecureToken(32);
      const salt = await generateSalt();
      const tokenHash = await hashToken(token, salt);

      // Update expiration (extend by 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          token_hash: tokenHash,
          token_salt: salt,
          status: 'sent',
          expires_at: expiresAt.toISOString(),
          invited_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Log audit
      await supabase.from('invitation_audit_log').insert({
        invitation_id: invitationId,
        action: 'resent',
        performed_by: user.id,
      });

      const magicLink = `${window.location.origin}/invite/accept?token=${token}&invitation=${invitationId}`;

      return { invitationId, magicLink, email: invitation.email };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to resend invitation');
    }
  }
);

// Fetch invitations for a customer/lead
export const fetchInvitations = createAsyncThunk(
  'invitation/fetch',
  async (
    { customerId, leadId }: { customerId?: string; leadId?: string },
    { rejectWithValue }
  ) => {
    try {
      let query = supabase.from('user_invitations').select('*');

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as UserInvitation[];
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch invitations');
    }
  }
);

// Create trainee user with password directly (no email link)
export const createTraineeUserWithPassword = createAsyncThunk(
  'invitation/createWithPassword',
  async (
    {
      email,
      password,
      customerId,
      leadId,
    }: {
      email: string;
      password: string;
      customerId: string;
      leadId?: string | null;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user is admin/manager
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[createTraineeUserWithPassword] Profile fetch error:', profileError);
        throw new Error(`Failed to verify permissions: ${profileError.message}`);
      }

      if (!profile || !['admin', 'user'].includes(profile.role)) {
        throw new Error('Unauthorized: Only admins and managers can create trainee users');
      }

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        if (existingProfile.role === 'trainee') {
          if (customerId) {
            const { error: updateCustomerError } = await supabase
              .from('customers')
              .update({ user_id: existingProfile.id })
              .eq('id', customerId);
            if (updateCustomerError) {
              throw new Error(`Failed to link existing trainee to customer: ${updateCustomerError.message}`);
            }
          }
          return {
            userId: existingProfile.id,
            email,
            isNewUser: false,
          };
        }
        // Update existing user to trainee role
        await supabase
          .from('profiles')
          .update({ role: 'trainee' })
          .eq('id', existingProfile.id);
        
        return {
          userId: existingProfile.id,
          email,
          isNewUser: false,
        };
      }

      // Create user via edge function (uses admin API)
      console.log('[createTraineeUserWithPassword] Calling edge function with:', {
        email,
        customerId,
        leadId: leadId || null,
        invitedBy: user.id,
        passwordLength: password?.length,
      });
      
      // Use fetch directly to get the actual error message from response body
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Get and refresh session to ensure we have a valid token
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If no session or session is expired, try to refresh
      if (!session || sessionError) {
        console.log('[createTraineeUserWithPassword] No session or error, attempting refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          throw new Error('Not authenticated. Please log in again.');
        }
        session = refreshedSession;
      }
      
      if (!session || !session.access_token) {
        throw new Error('Not authenticated. Please log out and log back in.');
      }
      
      console.log('[createTraineeUserWithPassword] Using session token (first 20 chars):', session.access_token.substring(0, 20));
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-trainee-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          customerId,
          leadId: leadId || null,
          invitedBy: user.id,
        }),
      });
      
      const responseData = await response.json();
      console.log('[createTraineeUserWithPassword] Function response:', { status: response.status, data: responseData });
      
      if (!response.ok) {
        const errorMsg = responseData?.error || responseData?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[createTraineeUserWithPassword] Edge function error:', errorMsg);
        
        // Check if it's a JWT/authentication issue
        if (response.status === 401 && (errorMsg.includes('JWT') || errorMsg.includes('Invalid') || errorMsg.includes('token'))) {
          // Check if we're using production URL but have a local session
          const currentUrl = import.meta.env.VITE_SUPABASE_URL;
          const isProduction = currentUrl.includes('supabase.co');
          
          if (isProduction) {
            // Clear the invalid session
            console.log('[createTraineeUserWithPassword] Clearing invalid session...');
            await supabase.auth.signOut();
            
            throw new Error('SESSION_MISMATCH: Your session is from a different Supabase instance. Please refresh the page and log in again.');
          }
        }
        
        throw new Error(errorMsg);
      }
      
      if (!responseData.success) {
        const errorMsg = responseData.error || 'Failed to create user';
        console.error('[createTraineeUserWithPassword] Function returned failure:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // The successResponse wraps data in a 'data' property
      const functionData = responseData.data || responseData;

      if (!functionData || !functionData.userId) {
        console.error('[createTraineeUserWithPassword] Invalid response structure:', {
          responseData,
          hasData: !!responseData.data,
          hasUserId: !!functionData?.userId,
        });
        throw new Error('Failed to create user: No user ID returned');
      }

      // Log audit event
      await supabase.from('invitation_audit_log').insert({
        invitation_id: null, // No invitation for direct creation
        action: 'created_with_password',
        performed_by: user.id,
        metadata: { email, customerId, leadId, method: 'direct_password' },
      });

      return {
        userId: functionData.userId,
        email: functionData.email || email,
        isNewUser: functionData.isNewUser !== undefined ? functionData.isNewUser : true,
      };
    } catch (error: any) {
      console.error('[createTraineeUserWithPassword] Error:', error);
      return rejectWithValue(error?.message || 'Failed to create trainee user');
    }
  }
);

// Revoke invitation
export const revokeInvitation = createAsyncThunk(
  'invitation/revoke',
  async ({ invitationId }: { invitationId: string }, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;

      await supabase.from('invitation_audit_log').insert({
        invitation_id: invitationId,
        action: 'revoked',
        performed_by: user.id,
      });

      return invitationId;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to revoke invitation');
    }
  }
);

const invitationSlice = createSlice({
  name: 'invitation',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearLastCreated: (state) => {
      state.lastCreatedInvitation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTraineeInvitation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTraineeInvitation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastCreatedInvitation = action.payload.invitation;
        // Note: token is NOT stored in state for security
      })
      .addCase(createTraineeInvitation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(sendInvitationEmail.fulfilled, (state, action) => {
        const invitation = state.invitations.find(i => i.id === action.payload.invitationId);
        if (invitation) {
          invitation.status = 'sent';
        }
      })
      .addCase(resendInvitation.fulfilled, (state, action) => {
        const invitation = state.invitations.find(i => i.id === action.payload.invitationId);
        if (invitation) {
          invitation.status = 'sent';
          invitation.invited_at = new Date().toISOString();
        }
      })
      .addCase(fetchInvitations.fulfilled, (state, action) => {
        state.invitations = action.payload;
      })
      .addCase(revokeInvitation.fulfilled, (state, action) => {
        const invitation = state.invitations.find(i => i.id === action.payload);
        if (invitation) {
          invitation.status = 'revoked';
        }
      })
      .addCase(createTraineeUserWithPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTraineeUserWithPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createTraineeUserWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearLastCreated } = invitationSlice.actions;
export default invitationSlice.reducer;
