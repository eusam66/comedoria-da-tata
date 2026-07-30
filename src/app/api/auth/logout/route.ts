import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('supabase-access-token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    res.cookies.set('supabase-refresh-token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('logout error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
