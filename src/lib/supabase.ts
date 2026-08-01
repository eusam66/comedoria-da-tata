import { createClient } from '@supabase/supabase-js';

// Cliente público para uso no navegador e leituras públicas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.URL_SUPABASE || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let _supabase: ReturnType<typeof createClient> | null = null;
if (!supabaseUrl || !supabaseAnonKey) {
  // Não lançar erro para que builds locais/tests possam continuar; porém registrar para facilitar o debug
  console.warn('Supabase client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL/URL_SUPABASE and SUPABASE_ANON_KEY) in your environment.');
} else {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase: any = _supabase;

export default supabase;
