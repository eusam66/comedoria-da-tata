import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Recuperação indisponível.' }, { status: 503 });
  const email = String((await request.json())?.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Informe seu e-mail.' }, { status: 400 });
  const redirectTo = `${new URL(request.url).origin}/admin/reset-password`;
  const { error } = await (supabaseAdmin as any).auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    const limited = /rate limit/i.test(error.message || '');
    return NextResponse.json({ error: limited ? 'Limite temporário de e-mails atingido. Aguarde e tente novamente.' : 'Não foi possível enviar o link.' }, { status: limited ? 429 : 400 });
  }
  return NextResponse.json({ message: 'Se o e-mail estiver cadastrado, o link será enviado.' });
}
