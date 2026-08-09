import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /(.*)\.(.*)$/i;
const ADMIN_PREFIX = '/admin';
const ADMIN_API_PREFIX = '/api/admin';
const ALLOWED = ['/admin/login', '/admin/forgot-password', '/admin/reset-password', '/api/auth/set_session', '/api/auth/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // skip public files and api/upload etc
  if (PUBLIC_FILE.test(pathname) || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // only protect admin pages and admin api routes
  if (!pathname.startsWith(ADMIN_PREFIX) && !pathname.startsWith(ADMIN_API_PREFIX)) return NextResponse.next();

  if (ALLOWED.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get('supabase-access-token')?.value;
  if (!token) {
    const url = req.nextUrl.clone(); url.pathname = '/admin/login'; return NextResponse.redirect(url);
  }

  // validate token with Supabase auth endpoint
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.URL_SUPABASE;
    if (!supabaseUrl) {
      // Supabase URL missing; redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resp.ok) return NextResponse.next();
    else {
      const url = req.nextUrl.clone(); url.pathname = '/admin/login'; return NextResponse.redirect(url);
    }
  } catch (err) {
    console.error('middleware auth check failed', err);
    const url = req.nextUrl.clone(); url.pathname = '/admin/login'; return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
};
