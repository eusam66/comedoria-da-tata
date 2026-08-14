'use client';
import React from 'react';
import SearchBar from '../SearchBar';
import { useCart } from '../../components/CartContext';

export default function Header({ open, avgTime }: { open: boolean; avgTime: string }) {
  const { itemCount, open: openCart } = useCart();

  return (
    <header className="bg-gradient-to-r from-brand-dark via-brand-brown to-brand-orange text-white shadow-2xl">
      <div className="container mx-auto px-4 py-4 md:py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center text-xl font-bold header-logo">T</div>
            <div>
              <div className="text-xl font-display font-semibold">Comedoria da Tata</div>
              <div className="text-sm text-white/80">Sabores caseiros, feitos com carinho.</div>
            </div>
          </div>

          <div className="rounded-full bg-white/10 px-4 py-2 inline-flex items-center gap-2 text-sm text-white shadow-inner border border-white/10">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${open ? 'bg-emerald-200/20 text-emerald-100' : 'bg-rose-200/20 text-rose-100'}`}>
              {open ? 'Aberto agora' : 'Fechado'}
            </span>
            <span>{avgTime}</span>
          </div>
        </div>

        <div className="w-full md:w-1/2">
          <SearchBar />
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3">
          <button
            aria-label="Abrir carrinho"
            onClick={openCart}
            className="relative inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 p-3 shadow-md shadow-black/10 transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1.5 text-[11px] font-semibold text-white shadow-sm">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

