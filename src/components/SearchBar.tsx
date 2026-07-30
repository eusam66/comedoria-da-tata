'use client';
import React from 'react';

export default function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <input
        aria-label="Pesquisar pratos, categorias ou ingredientes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pesquisar pratos, categorias ou ingredientes..."
        className="w-full rounded-md border border-brand-brown px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
      />
      <button
        type="button"
        aria-label="Buscar pratos"
        onClick={() => onChange(value)}
        className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-brand-orange text-white rounded-md"
      >
        Buscar
      </button>
    </div>
  );
}
