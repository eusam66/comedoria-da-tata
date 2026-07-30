import React from 'react';
import SearchBar from '../SearchBar';

export default function Header({ open, avgTime }: { open: boolean; avgTime: string }) {
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
      </div>
    </header>
  );
}
