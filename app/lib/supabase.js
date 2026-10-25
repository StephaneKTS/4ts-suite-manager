import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Attention : Les clés d'accès Supabase sont manquantes dans les variables d'environnement !");
}

// Utilisation d'un singleton sécurisé pour toute l'application
const getSupabaseClient = () => {
  if (globalThis.supabase) {
    return globalThis.supabase;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
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
    globalThis.supabase = client;
  }

  return client;
};

export const supabase = getSupabaseClient();