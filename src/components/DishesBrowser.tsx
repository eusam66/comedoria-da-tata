'use client';
import React, { useEffect, useState } from 'react';
import DishCard from './DishCard';
import SearchBar from './SearchBar';
import CategoryList from './CategoryList';
import Skeleton from './Skeleton';

import { CategoryRow, DishRow } from '../lib/types';

export default function DishesBrowser({ categories }: { categories: CategoryRow[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDishes(q?: string, cat?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      const res = await fetch('/api/dishes?' + params.toString());
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao buscar pratos');
      setDishes(json || []);
    } catch (err:any) {
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

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
              <Skeleton lines={4} />
            </div>
          ))}
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dishes.map((d) => (
          <DishCard key={d.id} dish={d} />
        ))}
      </div>

      {!loading && dishes.length === 0 && <div className="text-sm text-gray-600">Nenhum prato encontrado</div>}
    </div>
  );
}
