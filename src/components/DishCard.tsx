'use client';
import React from 'react';
import Image from 'next/image';
import { DishRow } from '../lib/types';
import Link from 'next/link';
import { useCart } from './CartContext';

export default function DishCard({ dish }: { dish: DishRow }) {
  const { addItem } = useCart();
  const isNew = Boolean((dish as any).is_new ?? (dish as any).isNew);
  const isPopular = Boolean((dish as any).popular);

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-brand-beige/80 bg-white shadow-[0_20px_60px_-35px_rgba(42,20,15,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <Link href={`/dishes/${dish.slug}`} className="block overflow-hidden rounded-[1.75rem] bg-brand-beige/60">
        <div className="relative h-52 overflow-hidden">
          {dish.image ? (
            <Image
              src={dish.image}
              alt={dish.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-beige/70 text-sm font-semibold text-brand-brown">Imagem indisponível</div>
          )}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {isNew && <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-brown shadow-sm">Novo</span>}
            {isPopular && <span className="inline-flex items-center rounded-full bg-brand-orange/95 px-3 py-1 text-xs font-semibold text-white shadow-sm">Mais pedido</span>}
          </div>
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/dishes/${dish.slug}`} className="no-underline text-inherit">
          <h4 className="font-display text-lg text-brand-dark transition-colors duration-200 group-hover:text-brand-orange">{dish.name}</h4>
          <p className="text-sm text-brand-brown/70 mt-2 line-clamp-2">{dish.description}</p>
        </Link>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-brand-brown text-sm uppercase tracking-[0.18em]">Serve</div>
            <div className="font-semibold text-brand-dark">{dish.servings ?? 1} pessoa(s)</div>
          </div>
          <div className="rounded-3xl bg-brand-dark px-4 py-2 text-white font-semibold">R$ {Number(dish.price).toFixed(2)}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/dishes/${dish.slug}`} className="inline-flex min-w-[5rem] items-center justify-center rounded-full border border-brand-orange/20 bg-white px-4 py-2 text-sm font-semibold text-brand-brown transition hover:border-brand-brown/30">
            Ver
          </Link>
          <button
            type="button"
            aria-label={`Adicionar ${dish.name}`}
            onClick={() => addItem(dish, 1)}
            className="inline-flex min-w-[7rem] items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-dark"
          >
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
