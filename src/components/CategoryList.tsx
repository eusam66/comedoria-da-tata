'use client';
import React from 'react';
import { CategoryRow } from '../lib/types';

export default function CategoryList({
  categories,
  selected,
  onSelect
}: {
  categories: CategoryRow[];
  selected?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto py-2 -mx-4 px-4 scroll-x">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSelect?.(null)}
          aria-pressed={!selected}
          className={`min-w-[92px] rounded-full border px-4 py-3 flex-shrink-0 text-sm font-semibold transition ${!selected ? 'bg-brand-orange text-white border-brand-orange shadow-lg shadow-brand-orange/10' : 'bg-white text-brand-dark border-brand-dark/10 hover:bg-brand-beige'}`}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected === c.id}
            onClick={() => onSelect?.(c.id)}
            className={`min-w-[120px] rounded-full border px-4 py-3 shadow-sm flex-shrink-0 text-left transition ${selected === c.id ? 'bg-brand-dark text-white border-brand-dark shadow-lg shadow-brand-dark/10' : 'bg-white text-brand-dark border-brand-dark/10 hover:bg-brand-beige'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-beige flex items-center justify-center text-sm font-semibold text-brand-brown shadow-inner">{c.name[0]}</div>
              <span className="text-sm font-medium">{c.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
