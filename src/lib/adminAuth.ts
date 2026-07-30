import supabaseAdmin from './supabaseAdmin';

function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((c) => {
    const [k, ...v] = c.split('=');
    cookies[k?.trim()] = decodeURIComponent((v || []).join('=').trim());
  });
  return cookies;
}

export async function requireAdmin(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies['supabase-access-token'];
  if (!token) throw new Error('Unauthorized');

  // validate token and get user
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase not configured');

  const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error('Unauthorized');
  const user = await resp.json();
  const userId = user?.id;
  if (!userId) throw new Error('Unauthorized');

  // check admins table via service role
  const { data, error } = await supabaseAdmin.from('admins').select('role,user_id').eq('user_id', userId).maybeSingle();
  if (error) {
    console.error('requireAdmin db error', error);
    throw new Error('Unauthorized');
  }
  if (!data) throw new Error('Forbidden');
  return { id: userId, email: user?.email, role: data.role };
}
