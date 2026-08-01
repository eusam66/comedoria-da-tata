import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies: Record<string,string> = {};
    cookieHeader.split(';').forEach(c => { const [k,...v]=c.split('='); if(k) cookies[k.trim()]=decodeURIComponent((v||[]).join('=').trim()); });
    const refreshToken = cookies['supabase-refresh-token'];
    if (!refreshToken) return NextResponse.json({ error: 'no refresh token' }, { status: 401 });

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.URL_SUPABASE;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });

    const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${serviceKey}`
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
    });

    const json = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: json?.error_description || json?.error || 'refresh_failed' }, { status: 401 });

    const access_token = json.access_token;
    const new_refresh = json.refresh_token;
    const res = NextResponse.json({ ok: true });
    res.cookies.set('supabase-access-token', access_token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
    if (new_refresh) res.cookies.set('supabase-refresh-token', new_refresh, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (err:any) {
    console.error('refresh error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
