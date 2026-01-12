/**
 * Admin User Service
 * 
 * Service for performing admin user operations via Edge Functions
 * This keeps the service role key secure on the server side
 */

import { supabase } from '@/lib/supabaseClient';

// Get Supabase URL and construct Edge Function URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/admin-user`;

interface CreateUserParams {
  email: string;
  password?: string;
  email_confirm?: boolean;
  user_metadata?: Record<string, any>;
  invitationToken?: string; // For invitation acceptance
  invitationId?: string; // For invitation acceptance
}

interface UpdateUserParams {
  userId: string;
  updates: {
    password?: string;
    email?: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, any>;
  };
}

interface DeleteUserParams {
  userId: string;
}

interface ListUsersParams {
  page?: number;
  perPage?: number;
}

interface GetUserByEmailParams {
  email: string;
}

/**
 * Call the admin-user Edge Function
 */
async function callAdminFunction(action: string, params: any) {
  // For invitation acceptance, we don't need authentication
  const isInvitationAcceptance = action === 'createUser' && params.invitationToken && params.invitationId;
  
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Only add Authorization header if not invitation acceptance
  if (!isInvitationAcceptance) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action,
      ...params,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Failed to ${action}`);
  }

  return result.data;
}

/**
 * Create a new user
 */
export async function createUser(params: CreateUserParams) {
  return callAdminFunction('createUser', params);
}

/**
 * Update an existing user
 */
export async function updateUser(params: UpdateUserParams) {
  return callAdminFunction('updateUser', params);
}

/**
 * Delete a user
 */
export async function deleteUser(params: DeleteUserParams) {
  return callAdminFunction('deleteUser', params);
}

/**
 * List users
 */
export async function listUsers(params?: ListUsersParams) {
  return callAdminFunction('listUsers', params || {});
}

/**
 * Get user by email
 */
export async function getUserByEmail(params: GetUserByEmailParams) {
  return callAdminFunction('getUserByEmail', params);
}
