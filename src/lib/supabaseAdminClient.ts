/**
 * Supabase Admin Client
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility only.
 * 
 * For production, use the adminUserService.ts which calls Edge Functions.
 * This keeps the service role key secure on the server side.
 * 
 * For local development only: Uses the default local Supabase service role key.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

// Check if we're in a browser environment (client-side)
const isBrowser = typeof window !== 'undefined';

// Supabase Service Role Key - ONLY for local development
// For production, use Edge Functions via adminUserService.ts
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Only use default local key if:
// 1. No environment variable is set AND
// 2. We're using local Supabase (localhost/127.0.0.1) AND
// 3. We're in development mode
const isLocalSupabase = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
const isDevelopment = import.meta.env.DEV;
const defaultLocalKey = isLocalSupabase && isDevelopment 
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  : null;

const finalServiceRoleKey = supabaseServiceRoleKey || defaultLocalKey;

// Only create admin client in local development
// In production, this should not be used - use adminUserService instead
if (isBrowser && !isLocalSupabase) {
  console.warn(
    '⚠️ WARNING: supabaseAdmin should not be used in production frontend code. ' +
    'Use adminUserService.ts which calls Edge Functions instead.'
  );
}

if (!finalServiceRoleKey && isBrowser && !isLocalSupabase) {
  // In production browser, don't create the client
  // Components should use adminUserService instead
  console.warn('supabaseAdmin not available in production. Use adminUserService instead.');
}

/**
 * Admin client with service role privileges
 * ⚠️ Use ONLY in local development
 * In production, use adminUserService.ts which calls Edge Functions
 */
export const supabaseAdmin = finalServiceRoleKey 
  ? createClient(supabaseUrl, finalServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
