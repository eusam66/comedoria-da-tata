import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /(.*)\.(.*)$/i;

const ADMIN_PREFIX = '/admin';
const ADMIN_API_PREFIX = '/api/admin';

const ALLOWED = [
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/api/auth/login',
  '/api/auth/set_session',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/request-password-reset',
  '/api/auth/update-password',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminApi = pathname.startsWith(ADMIN_API_PREFIX);
  const reject = (status: 401 | 500, message: string) => {
    if (isAdminApi) return NextResponse.json({ error: message }, { status });
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  };

  // Arquivos públicos e internos do Next
  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Só protege páginas e APIs administrativas
  if (
    !pathname.startsWith(ADMIN_PREFIX) &&
    !pathname.startsWith(ADMIN_API_PREFIX)
  ) {
    return NextResponse.next();
  }

  // Rotas públicas relacionadas à autenticação
  if (ALLOWED.includes(pathname)) {
    return NextResponse.next();
  }

  const token =
    req.cookies.get('supabase-access-token')?.value;

  if (!token) {
    return reject(401, 'Unauthorized');
  }

  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.URL_SUPABASE;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        '[ADMIN MIDDLEWARE] Configuração Supabase ausente'
      );

      return reject(500, 'Admin authentication is not configured');
    }

    /*
     * Valida o JWT diretamente no Supabase Auth.
     *
     * O endpoint /auth/v1/user requer:
     * - apikey
     * - Authorization: Bearer <JWT>
     */
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`,
      {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const body = await response.text();

      console.error(
        '[ADMIN MIDDLEWARE] Token rejeitado pelo Supabase:',
        response.status,
        body
      );

      const redirectResponse = reject(401, 'Unauthorized');

      // Remove cookies inválidos para evitar loop
      redirectResponse.cookies.delete(
        'supabase-access-token'
      );

      redirectResponse.cookies.delete(
        'supabase-refresh-token'
      );

      return redirectResponse;
    }

    const user = await response.json();

    if (!user?.id) {
      console.error(
        '[ADMIN MIDDLEWARE] Supabase não retornou usuário válido'
      );

      return reject(401, 'Unauthorized');
    }

    return NextResponse.next();
  } catch (error) {
    console.error(
      '[ADMIN MIDDLEWARE] Erro ao validar sessão:',
      error
    );

    return reject(401, 'Unauthorized');
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
