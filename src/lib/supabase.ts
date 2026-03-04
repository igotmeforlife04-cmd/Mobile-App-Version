import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

// Create a dummy client if credentials are missing to prevent crash
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
        insert: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
        update: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
        delete: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
        eq: () => ({
          eq: () => ({}),
          single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      }
    } as any;
