'use client';
import React from 'react';
import SearchBar from '../SearchBar';
import { useCart } from '../../components/CartContext';

export default function Header({ open, avgTime }: { open: boolean; avgTime: string }) {
  const { itemCount, open: openCart } = useCart();

  return (
    <header className="bg-brand-beige border-b border-brand-brown">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center text-white header-logo">T</div>
          <div>
            <div className="text-lg font-bold header-logo">Comedoria da Tata</div>
            <div className="text-sm text-brand-brown">{open ? <span className="text-green-600">Aberto</span> : <span className="text-red-600">Fechado</span>} • {avgTime}</div>
          </div>
        </div>
        <div className="w-1/3 md:w-1/2">
          <SearchBar />
        </div>

        <div className="flex items-center gap-3">
          <button aria-label="Abrir carrinho" onClick={openCart} className="relative bg-white border border-brand-brown rounded-full p-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" stroke="#2A140F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1" fill="#2A140F" />
              <circle cx="18" cy="20" r="1" fill="#2A140F" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-orange text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">{itemCount}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
