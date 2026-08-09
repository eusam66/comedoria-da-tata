import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

type AdminRow = {
  id: string;
  email: string | null;
  role: string | null;
};

function normalizeEmail(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

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

    const normalizedEmail = normalizeEmail(email);

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
      console.error(
        '[ADMIN LOGIN] Falha de autenticação:',
        authError
      );

      return NextResponse.json(
        { error: 'E-mail ou senha inválidos.' },
        { status: 401 }
      );
    }

    const authenticatedEmail = normalizeEmail(
      data.user.email
    );

    console.log(
      '[ADMIN LOGIN] Usuário autenticado:',
      authenticatedEmail
    );

    // 2. Busca os administradores.
    // A comparação será feita no servidor depois de normalizar
    // os e-mails, evitando problemas com maiúsculas,
    // minúsculas ou espaços invisíveis.
    const {
      data: adminsData,
      error: adminError,
    } = await supabaseAdmin
      .from('admins')
      .select('id, email, role');

    if (adminError) {
      console.error(
        '[ADMIN LOGIN] Erro ao consultar admins:',
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

    const admins = (adminsData || []) as AdminRow[];

    console.log(
      '[ADMIN LOGIN] Quantidade de admins encontrada:',
      admins.length
    );

    console.log(
      '[ADMIN LOGIN] Emails cadastrados:',
      admins.map((item) => normalizeEmail(item.email))
    );

    const admin = admins.find(
      (item) =>
        normalizeEmail(item.email) === authenticatedEmail
    );

    if (!admin) {
      console.warn(
        '[ADMIN LOGIN] Usuário autenticado sem registro administrativo:',
        authenticatedEmail
      );

      return NextResponse.json(
        {
          error:
            'Este usuário não possui acesso administrativo.',
        },
        { status: 403 }
      );
    }

    // 3. Confere a função administrativa
    const role = String(admin.role || 'admin')
      .trim()
      .toLowerCase();

    if (role !== 'admin') {
      console.warn(
        '[ADMIN LOGIN] Usuário encontrado, mas role inválida:',
        role
      );

      return NextResponse.json(
        {
          error:
            'Este usuário não possui acesso administrativo.',
        },
        { status: 403 }
      );
    }

    console.log(
      '[ADMIN LOGIN] Acesso administrativo autorizado:',
      authenticatedEmail
    );

    // 4. Cria sessão da aplicação
    const response = NextResponse.json({
      ok: true,
      user: {
        email: authenticatedEmail,
        role,
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
    console.error(
      '[ADMIN LOGIN] Erro inesperado:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Erro inesperado ao realizar login.',
      },
      { status: 500 }
    );
  }
}