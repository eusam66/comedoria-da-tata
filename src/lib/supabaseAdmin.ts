import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && serviceRoleKey) {
  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
} else {
  console.error('Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
}

export const supabaseAdmin = _supabaseAdmin;
export default supabaseAdmin;
