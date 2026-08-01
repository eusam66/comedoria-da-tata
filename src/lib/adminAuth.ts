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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.URL_SUPABASE;
  if (!supabaseUrl) throw new Error('Supabase not configured');

  const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error('Unauthorized');
  const user = await resp.json();
  const userId = user?.id;
  const userEmail = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
  if (!userId || !userEmail) throw new Error('Unauthorized');

  // check admins table via service role
  const client = supabaseAdmin;
  if (!client) {
    throw new Error('Supabase admin client not configured');
  }

  let adminRow: any = null;

  const byEmail = await (client as any)
    .from('admins')
    .select('*')
    .ilike('email', userEmail)
    .limit(1)
    .maybeSingle();

  if (!byEmail.error && byEmail.data) {
    adminRow = byEmail.data;
  }

  if (!adminRow) {
    const byUserId = await (client as any)
      .from('admins')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!byUserId.error && byUserId.data) {
      adminRow = byUserId.data;
    }
  }

  if (!adminRow) throw new Error('Forbidden');
  return { id: userId, email: user?.email, role: adminRow.role || 'admin' };
}
