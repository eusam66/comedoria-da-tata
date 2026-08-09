import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { accessToken, refreshToken, password } = await request.json();
  if (!accessToken || !refreshToken || typeof password !== 'string') return NextResponse.json({ error: 'Sessão de recuperação inválida.' }, { status: 400 });
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return NextResponse.json({ error: 'A senha não atende aos requisitos mínimos.' }, { status: 400 });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.URL_SUPABASE;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.URL_SUPABASE_ANON_KEY;
  if (!url || !anon || !supabaseAdmin) return NextResponse.json({ error: 'Recuperação indisponível.' }, { status: 503 });
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (session.error || !session.data.user?.email) return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
  const { data: admin } = await (supabaseAdmin as any).from('admins').select('id').eq('email', session.data.user.email.toLowerCase()).maybeSingle();
  if (!admin) return NextResponse.json({ error: 'Usuário sem acesso administrativo.' }, { status: 403 });
  const updated = await client.auth.updateUser({ password });
  if (updated.error) return NextResponse.json({ error: 'Não foi possível atualizar a senha.' }, { status: 400 });
  await client.auth.signOut();
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('supabase-access-token');
  response.cookies.delete('supabase-refresh-token');
  return response;
}
