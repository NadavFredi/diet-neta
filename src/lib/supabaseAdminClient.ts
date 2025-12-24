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
// Default local Supabase service role key (ONLY for local development)
// In production, this must come from secure environment variables
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

if (!supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase Service Role Key. This is required for admin operations.'
  );
}

/**
 * Admin client with service role privileges
 * Use ONLY for secure server-side operations or admin functions
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
