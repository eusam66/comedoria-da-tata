import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Login temporariamente indisponível.' }, { status: 503 });
  }

  const { email, password } = await request.json();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const { data, error } = await (supabaseAdmin as any).auth.signInWithPassword({
    email: normalizedEmail,
    password
  });
  if (error || !data?.session) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
  }

  const { data: admin } = await (supabaseAdmin as any)
    .from('admins')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (!admin) {
    return NextResponse.json({ error: 'Este usuário não possui acesso administrativo.' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('supabase-access-token', data.session.access_token, {
    httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 7
  });
  response.cookies.set('supabase-refresh-token', data.session.refresh_token, {
    httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
