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
    <div className="overflow-x-auto py-2 -mx-4 px-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSelect?.(null)}
              className={`min-w-[90px] rounded-full px-4 py-2 flex-shrink-0 ${!selected ? 'bg-brand-orange text-white' : 'bg-white'}`}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(c.id)}
                className={`min-w-[110px] bg-white rounded-full px-4 py-3 shadow-sm text-center flex-shrink-0 flex flex-col items-center gap-2 ${selected === c.id ? 'ring-2 ring-brand-orange' : ''}`}
          >
            <div className="w-12 h-12 rounded-full bg-brand-beige mx-auto flex items-center justify-center text-brand-brown">{c.name[0]}</div>
                <div className="mt-1 text-sm font-medium">{c.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
