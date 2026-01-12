import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// Auto-detect and fix network access for local Supabase
// When app is accessed via network IP (e.g., 172.20.10.10:8080) but Supabase URL is localhost,
// use Vite proxy to route requests to local Supabase
if (typeof window !== 'undefined') {
  const currentHost = window.location.hostname;
  const currentPort = window.location.port || '8080';
  const isNetworkAccess = currentHost !== 'localhost' && currentHost !== '127.0.0.1';
  const isLocalSupabase = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
  const isProductionSupabase = supabaseUrl.includes('supabase.co');
  
  // Only auto-fix for local Supabase when accessed from network
  // Don't modify production Supabase URLs
  if (isNetworkAccess && isLocalSupabase && !isProductionSupabase) {
    // Use Vite proxy to route Supabase requests through the dev server
    // This allows local Supabase to work when app is accessed via network IP
    const protocol = window.location.protocol;
    supabaseUrl = `${protocol}//${currentHost}:${currentPort}/supabase-proxy`;
    console.log('[Supabase Client] Auto-detected network access, using proxy:', supabaseUrl);
  }
}

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('[Supabase Client] Configuration:', {
    url: supabaseUrl,
    isLocal: supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost'),
    isCloud: supabaseUrl.includes('supabase.co'),
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

