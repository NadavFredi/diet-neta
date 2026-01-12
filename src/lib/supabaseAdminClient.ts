/**
 * Supabase Admin Client
 * 
 * WARNING: This should ONLY be used in secure server-side contexts or
 * with proper environment variable protection. Never expose service role key
 * to client-side code.
 * 
 * For local development, we use the default local Supabase service role key.
 * In production, this should be stored securely and never committed to git.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

// Supabase Service Role Key - MUST be set via environment variable
// WARNING: This key has full admin access. Never commit it to git or expose it to client-side code.
// For local development: Use the default local Supabase key (only works with local Supabase)
// For production: MUST be set via VITE_SUPABASE_SERVICE_ROLE_KEY environment variable
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Only use default local key if:
// 1. No environment variable is set AND
// 2. We're using local Supabase (localhost/127.0.0.1)
// This ensures production never uses the default key
const isLocalSupabase = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
const defaultLocalKey = isLocalSupabase && import.meta.env.DEV 
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  : null;

const finalServiceRoleKey = supabaseServiceRoleKey || defaultLocalKey;

if (!finalServiceRoleKey) {
  if (isLocalSupabase && import.meta.env.DEV) {
    throw new Error(
      'Missing Supabase Service Role Key. For local development, ensure Supabase is running locally.'
    );
  } else {
    throw new Error(
      'Missing Supabase Service Role Key. This is required for admin operations. ' +
      'Please set VITE_SUPABASE_SERVICE_ROLE_KEY in your environment variables. ' +
      '⚠️ NEVER commit this key to git or expose it to client-side code!'
    );
  }
}

/**
 * Admin client with service role privileges
 * Use ONLY for secure server-side operations or admin functions
 */
export const supabaseAdmin = createClient(supabaseUrl, finalServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
