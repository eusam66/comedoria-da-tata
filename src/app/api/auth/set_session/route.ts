import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access_token = body?.access_token;
    const refresh_token = body?.refresh_token;
    if (!access_token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('supabase-access-token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    if (refresh_token) {
      res.cookies.set('supabase-refresh-token', refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      });
    }

    return res;
  } catch (err) {
    console.error('set_session error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
