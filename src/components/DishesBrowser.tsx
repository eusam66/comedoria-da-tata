'use client';
import React, { useEffect, useState } from 'react';
import DishCard from './DishCard';
import SearchBar from './SearchBar';
import CategoryList from './CategoryList';
import Skeleton from './Skeleton';

import { CategoryRow, DishRow } from '../lib/types';

const dishesCache = new Map<string, DishRow[]>();

export default function DishesBrowser({ categories }: { categories: CategoryRow[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDishes(q?: string, cat?: string | null) {
    const cacheKey = `${q || ''}|${cat || ''}`;
    const cached = dishesCache.get(cacheKey);

    if (cached) {
      setDishes(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      const res = await fetch('/api/dishes?' + params.toString(), { cache: 'force-cache' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao buscar pratos');
      const freshDishes = json || [];
      dishesCache.set(cacheKey, freshDishes);
      setDishes(freshDishes);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDishes();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchDishes(query, category), 300);
    return () => clearTimeout(t);
  }, [query, category]);

  return (
    <div>
      <div className="mb-3">
        <SearchBar value={query} onChange={setQuery} />
      </div>
      <div className="mb-4">
        <CategoryList categories={categories} selected={category} onSelect={setCategory} />
      </div>

      {loading && dishes.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[1.75rem] border border-brand-brown/10 bg-white/90 p-4 shadow-sm">
              <Skeleton lines={6} />
            </div>
          ))}
        </div>
      )}
      {error && <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/10 px-4 py-3 text-sm text-brand-brown">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {dishes.map((d) => (
          <DishCard key={d.id} dish={d} />
        ))}
      </div>

      {!loading && dishes.length === 0 && (
        <div className="mt-6 rounded-[1.5rem] border border-brand-brown/10 bg-white/80 p-6 text-sm text-brand-brown/80 shadow-sm">
          Nenhum prato encontrado para esta busca.
        </div>
      )}
    </div>
  );
}
