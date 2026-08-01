'use client';
import React from 'react';
import Image from 'next/image';
import { DishRow } from '../lib/types';
import Link from 'next/link';
import { useCart } from './CartContext';

export default function DishCard({ dish }: { dish: DishRow }) {
  const { addItem } = useCart();
  return (
    <article className="bg-white rounded-3xl p-4 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
      <Link href={`/dishes/${dish.slug}`} className="block rounded-xl overflow-hidden bg-gradient-to-br from-brand-beige to-white">
        <div className="relative w-full h-48 md:h-56 lg:h-44 overflow-hidden">
          {dish.image ? (
            <Image
              src={dish.image}
              alt={dish.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-brown bg-gray-100">Imagem</div>
          )}
        </div>
      </Link>
      <div className="mt-3">
        <Link href={`/dishes/${dish.slug}`} className="no-underline text-inherit">
          <h4 className="font-display text-lg text-brand-dark">{dish.name}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dish.description}</p>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-brand-brown font-semibold text-base">R$ {Number(dish.price).toFixed(2)}</div>
          <div className="flex gap-2">
            <Link href={`/dishes/${dish.slug}`} className="bg-white border border-brand-brown text-brand-brown px-3 py-1 rounded-md" aria-label={`Ver ${dish.name}`} >Ver</Link>
            <button type="button" aria-label={`Adicionar ${dish.name}`} onClick={() => addItem(dish, 1)} className="bg-brand-orange text-white px-3 py-1 rounded-md">Adicionar</button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">Serve: {dish.servings ?? 1} pessoa(s)</div>
      </div>
    </article>
  );
}
