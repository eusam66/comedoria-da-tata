import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

type AdminRow = {
  id: string;
  email: string | null;
  role: string | null;
};

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      console.error('[ADMIN LOGIN] Supabase Admin não configurado');

      return NextResponse.json(
        { error: 'Login temporariamente indisponível.' },
        { status: 503 }
      );
    }

    const { email, password } = await request.json();

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Informe e-mail e senha.' },
        { status: 400 }
      );
    }

    // 1. Autentica o usuário no Supabase Auth
    const { data, error: authError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

    if (authError || !data?.session || !data?.user) {
      console.error('[ADMIN LOGIN] Falha de autenticação:', authError);

      return NextResponse.json(
        { error: 'E-mail ou senha inválidos.' },
        { status: 401 }
      );
    }

    const authenticatedEmail = String(data.user.email || '')
      .trim()
      .toLowerCase();

    // 2. Procura autorização administrativa pelo e-mail
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, email, role')
      .ilike('email', authenticatedEmail)
      .maybeSingle();

    const admin = adminData as AdminRow | null;

    // Agora erros do banco não ficam escondidos
    if (adminError) {
      console.error(
        '[ADMIN LOGIN] Erro ao consultar tabela admins:',
        adminError
      );

      return NextResponse.json(
        {
          error:
            'Não foi possível verificar sua permissão administrativa.',
        },
        { status: 500 }
      );
    }

    if (!admin) {
      console.warn(
        `[ADMIN LOGIN] Usuário autenticado sem registro admin: ${authenticatedEmail}`
      );

      return NextResponse.json(
        {
          error: 'Este usuário não possui acesso administrativo.',
        },
        { status: 403 }
      );
    }

    // 3. Confirma que o registro possui função administrativa
    if (
      admin.role &&
      String(admin.role).trim().toLowerCase() !== 'admin'
    ) {
      console.warn(
        `[ADMIN LOGIN] Usuário sem role admin: ${authenticatedEmail}`
      );

      return NextResponse.json(
        {
          error: 'Este usuário não possui acesso administrativo.',
        },
        { status: 403 }
      );
    }

    // 4. Cria os cookies da sessão
    const response = NextResponse.json({
      ok: true,
      user: {
        email: authenticatedEmail,
        role: admin.role || 'admin',
      },
    });

    response.cookies.set(
      'supabase-access-token',
      data.session.access_token,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    response.cookies.set(
      'supabase-refresh-token',
      data.session.refresh_token,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error('[ADMIN LOGIN] Erro inesperado:', error);

    return NextResponse.json(
      { error: 'Erro inesperado ao realizar login.' },
      { status: 500 }
    );
  }
}