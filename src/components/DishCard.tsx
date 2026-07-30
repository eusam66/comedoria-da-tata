'use client';
import React from 'react';
import { DishRow } from '../lib/types';
import Link from 'next/link';

export default function DishCard({ dish }: { dish: DishRow }) {
  return (
    <article className="bg-white rounded-2xl p-4 shadow-md flex gap-4 hover:shadow-lg transition-shadow duration-200">
      <Link href={`/dishes/${dish.slug}`} className="w-28 h-28 bg-gradient-to-br from-brand-beige to-white rounded-xl flex-shrink-0 overflow-hidden">
        {dish.image ? (
          <img src={dish.image} alt={dish.name} loading="lazy" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-brown">Imagem</div>
        )}
      </Link>
      <div className="flex-1">
        <Link href={`/dishes/${dish.slug}`} className="no-underline text-inherit">
          <h4 className="font-display text-lg text-brand-dark">{dish.name}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dish.description}</p>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-brand-brown font-semibold text-base">R$ {Number(dish.price).toFixed(2)}</div>
          <div className="flex gap-2">
            <Link href={`/dishes/${dish.slug}`} className="bg-white border border-brand-brown text-brand-brown px-3 py-1 rounded-md" aria-label={`Ver ${dish.name}`} >Ver</Link>
            <button type="button" aria-label={`Adicionar ${dish.name}`} className="bg-brand-orange text-white px-3 py-1 rounded-md">Adicionar</button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">Serve: {dish.servings ?? 1} pessoa(s)</div>
      </div>
    </article>
  );
}
