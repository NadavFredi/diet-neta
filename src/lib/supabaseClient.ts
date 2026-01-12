import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// If accessing from a network IP (not localhost), use Vite proxy for Supabase requests
// This fixes the issue where the app is accessed via network IP but Supabase URL is localhost
if (typeof window !== 'undefined') {
  const currentHost = window.location.hostname;
  const currentPort = window.location.port || '8080';
  const isNetworkAccess = currentHost !== 'localhost' && currentHost !== '127.0.0.1';
  const isLocalSupabase = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
  
  if (isNetworkAccess && isLocalSupabase) {
    // Use Vite proxy instead of direct localhost connection
    // The proxy will forward requests to localhost Supabase
    const protocol = window.location.protocol;
    supabaseUrl = `${protocol}//${currentHost}:${currentPort}/supabase`;
  }
}

// Debug: Log which Supabase instance we're using (only in development)
if (import.meta.env.DEV) {
  console.log('[Supabase Client] Using:', {
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

