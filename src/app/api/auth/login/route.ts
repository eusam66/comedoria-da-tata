import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      '';

    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !anonKey || !supabaseAdmin) {
      console.error(
        '[ADMIN LOGIN] Configuração do Supabase incompleta'
      );

      return NextResponse.json(
        {
          error:
            'Login temporariamente indisponível.',
        },
        { status: 503 }
      );
    }

    const { email, password } = await request.json();

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        {
          error: 'Informe e-mail e senha.',
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANTE:
     *
     * Este client é usado SOMENTE para autenticação.
     * Não usamos o supabaseAdmin para signInWithPassword,
     * evitando que a sessão do usuário substitua a
     * autorização Service Role.
     */
    const supabaseAuth = createClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // 1. Autentica usuário normalmente
    const {
      data: authData,
      error: authError,
    } = await supabaseAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (
      authError ||
      !authData?.session ||
      !authData?.user
    ) {
      console.error(
        '[ADMIN LOGIN] Falha de autenticação:',
        authError
      );

      return NextResponse.json(
        {
          error: 'E-mail ou senha inválidos.',
        },
        { status: 401 }
      );
    }

    const authenticatedEmail = normalizeEmail(
      authData.user.email
    );

    /*
     * 2. Consulta a tabela admins usando OUTRO client.
     *
     * supabaseAdmin continua intacto com Service Role
     * e pode consultar a tabela independentemente do RLS.
     */
    const {
      data: adminsData,
      error: adminError,
    } = await supabaseAdmin
      .from('admins')
      .select('id, email, role');

    if (adminError) {
      console.error(
        '[ADMIN LOGIN] Erro consultando admins:',
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

    const admin = admins.find(
      (item) =>
        normalizeEmail(item.email) ===
        authenticatedEmail
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

    const role = String(
      admin.role || 'admin'
    )
      .trim()
      .toLowerCase();

    if (role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Este usuário não possui acesso administrativo.',
        },
        { status: 403 }
      );
    }

    // 3. Cria os cookies da sessão
    const response = NextResponse.json({
      ok: true,
      user: {
        email: authenticatedEmail,
        role,
      },
    });

    response.cookies.set(
      'supabase-access-token',
      authData.session.access_token,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    response.cookies.set(
      'supabase-refresh-token',
      authData.session.refresh_token,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          process.env.NODE_ENV === 'production',
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
