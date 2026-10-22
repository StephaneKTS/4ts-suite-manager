import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Attention : Les clés d'accès Supabase sont manquantes !");
}

// Utilisation d'un singleton pour éviter la duplication des instances GoTrueClient sur mobile et PC
export const supabase = globalThis.supabase || createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-application-name': '4ts-suite-manager' },
  },
  db: {
    schema: 'public',
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.supabase = supabase;
}