'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import './admin.css';
const links = [
  ['/admin', 'Dashboard', '🏠'],
  ['/admin/dishes', 'Pratos', '🍽️'],
  ['/admin/beverages', 'Bebidas', '🥤'],
  ['/admin/categories', 'Categorias', '📚'],
  ['/admin/banners', 'Banners', '🎯'],
  ['/admin/orders', 'Pedidos', '📦'],
  ['/admin/settings', 'Configurações', '⚙️'],
];
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [more, setMore] = React.useState(false);
  const moreRef = React.useRef<HTMLDetailsElement>(null);
  React.useEffect(() => {
    setMore(false);
  }, [pathname]);
  if (['/admin/login', '/admin/forgot-password', '/admin/reset-password'].includes(pathname))
    return <>{children}</>;
  const active = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href);
  const navLink = ([href, label, icon]: string[], mobile = false) => (
    <Link
      key={href}
      href={href}
      aria-current={active(href) ? 'page' : undefined}
      className={`admin-nav-link ${mobile ? 'admin-mobile-link' : ''} ${
        active(href) ? 'admin-nav-active' : ''
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }
  return (
    <div className="admin-shell min-h-screen bg-brand-beige">
      <a className="admin-skip" href="#admin-content">
        Ir ao conteúdo
      </a>
      <aside className="admin-sidebar hidden md:block fixed h-screen w-64 overflow-y-auto border-r bg-white p-4">
        <div className="font-display text-lg mb-4">Painel — Comedoria</div>
        <nav aria-label="Painel administrativo" className="flex flex-col gap-2">
          {links.map((link) => navLink(link))}
          <Link href="/">Ver cardápio</Link>
          <button onClick={logout} className="admin-nav-link">
            Sair
          </button>
        </nav>
      </aside>
      <main id="admin-content" className="admin-content min-w-0 md:ml-64 p-4 min-h-screen">
        {children}
      </main>
      <nav
        aria-label="Painel administrativo móvel"
        className="admin-mobile-nav fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-white md:hidden"
      >
        {[links[0], links[1], links[2], links[5]].map((link) => navLink(link, true))}
        <details
          ref={moreRef}
          open={more}
          onToggle={(event) => setMore(event.currentTarget.open)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setMore(false);
              moreRef.current?.querySelector('summary')?.focus();
            }
          }}
          className="relative"
        >
          <summary
            className={`admin-mobile-link admin-nav-link cursor-pointer ${
              [links[3], links[4], links[6]].some(([href]) => active(href))
                ? 'admin-nav-active'
                : ''
            }`}
          >
            <span aria-hidden="true">☰</span>
            <span>Mais</span>
          </summary>
          <div className="admin-more-menu absolute right-0 bottom-full mb-2 w-56 rounded-xl border bg-white p-2 shadow-xl">
            {[links[3], links[4], links[6]].map((link) => navLink(link))}
            <Link className="admin-nav-link" href="/">
              Ver cardápio
            </Link>
            <button onClick={logout} className="admin-nav-link w-full">
              Sair
            </button>
          </div>
        </details>
      </nav>
    </div>
  );
}
