import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Crear cliente solo si hay credenciales válidas
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else if (typeof window !== 'undefined') {
  // Solo mostrar warning en el cliente, no durante SSR/build
  console.warn(
    'Supabase credentials not configured. Auth features will not work.',
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

export { supabase };

export type SupabaseUser = {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
};
