/**
 * Supabase Client Helpers
 * Shared utilities for creating Supabase clients in edge functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Create a Supabase admin client with service role key
 */
export function createSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with anon key
 */
export function createSupabaseClient(authHeader?: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const options: any = {};
  if (authHeader) {
    options.global = {
      headers: { Authorization: authHeader },
    };
  }

  return createClient(supabaseUrl, supabaseAnonKey, options);
}

/**
 * Verify user from authorization header
 */
export async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    return null;
  }

  const supabaseAdmin = createSupabaseAdmin();
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  return user;
}

