'use client';
import React, { useEffect, useState } from 'react';

export default function SearchBar({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const [query, setQuery] = useState(value ?? '');

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  const handleChange = (next: string) => {
    setQuery(next);
    onChange?.(next);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-brown/60">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
      <input
        aria-label="Pesquisar pratos, categorias ou ingredientes"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Buscar prato, categoria ou ingrediente"
        className="w-full rounded-full border border-brand-brown/20 bg-white py-3 pl-11 pr-28 text-sm text-brand-dark shadow-sm placeholder:text-brand-brown/50 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
      />
      <button
        type="button"
        aria-label="Buscar pratos"
        onClick={() => onChange?.(query)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-brown/10 transition hover:bg-brand-brown/90"
      >
        Buscar
      </button>
    </div>
  );
}
