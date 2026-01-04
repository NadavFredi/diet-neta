import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
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

