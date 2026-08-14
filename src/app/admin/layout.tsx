'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/forgot-password' || pathname === '/admin/reset-password';

  if (isAuthPage) return <>{children}</>;

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  const linkClass = (href: string) => {
    const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
    return `px-3 py-3 rounded transition-colors ${active ? 'bg-brand-beige font-semibold' : 'hover:bg-brand-beige'}`;
  };

  return (
    <div className="min-h-screen bg-brand-beige">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <aside className="w-64 bg-white border-r p-4 h-screen fixed">
          <div className="font-display text-lg mb-4">Painel — Comedoria</div>
          <nav className="flex flex-col gap-2">
            <Link href="/admin" className={linkClass('/admin')}>Dashboard</Link>
            <Link href="/admin/dishes" className={linkClass('/admin/dishes')}>Pratos</Link>
            <Link href="/admin/categories" className={linkClass('/admin/categories')}>Categorias</Link>
            <Link href="/admin/banners" className={linkClass('/admin/banners')}>Promoções</Link>
            <Link href="/admin/orders" className={linkClass('/admin/orders')}>Pedidos</Link>
            <Link href="/admin/settings" className={linkClass('/admin/settings')}>Configurações</Link>
            <button onClick={logout} className="mt-4 px-3 py-3 rounded text-left hover:bg-brand-beige">Sair</button>
          </nav>
        </aside>
      </div>

      {/* Main content area */}
      <main className="md:ml-64 p-4 pb-28 min-h-screen">{children}</main>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around overflow-x-auto border-t bg-white p-2 md:hidden">
        <Link href="/admin" className="flex flex-col items-center text-xs">
          <span className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center">🏠</span>
          <span className="mt-1">Dashboard</span>
        </Link>
        <Link href="/admin/dishes" className="flex flex-col items-center text-xs">
          <span className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center">🍽️</span>
          <span className="mt-1">Pratos</span>
        </Link>
        <Link href="/admin/categories" className="flex flex-col items-center text-xs">
          <span className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center">📚</span>
          <span className="mt-1">Categorias</span>
        </Link>
        <Link href="/admin/banners" className="flex flex-col items-center text-xs">
          <span className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center">🎯</span>
          <span className="mt-1">Promoções</span>
        </Link>
        <Link href="/admin/orders" className="flex flex-col items-center text-xs">
          <span className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center">📦</span>
          <span className="mt-1">Pedidos</span>
        </Link>
        <Link href="/admin/settings" className="flex flex-col items-center text-xs">
          <span className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center">⚙️</span>
          <span className="mt-1">Config</span>
        </Link>
      </nav>
    </div>
  );
}
