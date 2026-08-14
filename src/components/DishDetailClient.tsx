'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Dish } from '../lib/api';
import { DishAddon, normalizeDishAddons, SelectedAddon, selectedAddonsTotal } from '../lib/addons';
import { toastError, toastSuccess } from '../lib/toast';
import { useCart } from './CartContext';

export default function DishDetailClient({ dish }: { dish: Dish }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [sharing, setSharing] = useState(false);
  const addons = useMemo<DishAddon[]>(() => normalizeDishAddons(dish.addons), [dish.addons]);
  const [addonQtyMap, setAddonQtyMap] = useState<Record<string, number>>(() =>
    addons.reduce((current, addon) => ({ ...current, [addon.id]: addon.required ? 1 : 0 }), {})
  );

  const selectedAddons = useMemo<SelectedAddon[]>(
    () => addons.map((addon) => ({
      addonId: addon.id,
      name: addon.name,
      price: addon.price,
      qty: Math.max(0, addonQtyMap[addon.id] || 0)
    })).filter((addon) => addon.qty > 0),
    [addons, addonQtyMap]
  );

  const total = (Number(dish.price) + selectedAddonsTotal(selectedAddons)) * qty;

  function changeAddonQty(addon: DishAddon, nextQty: number) {
    const minimum = addon.required ? 1 : 0;
    setAddonQtyMap((current) => ({
      ...current,
      [addon.id]: Math.max(minimum, Math.min(addon.maxQty, nextQty))
    }));
  }

  function handleAdd() {
    addItem(dish, qty, { selectedAddons });
    toastSuccess(`${qty}x ${dish.name} adicionado à sacola.`);
  }

  async function handleShare() {
    const url = window.location.href;
    const shareData = {
      title: dish.name,
      text: dish.description || `Veja ${dish.name} na Comedoria da Tata`,
      url
    };

    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toastSuccess('Link do prato copiado!');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        toastSuccess('Link do prato copiado!');
      } catch {
        toastError('Não foi possível compartilhar o prato.');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <article className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-brand-brown/10 bg-white shadow-[0_24px_70px_-38px_rgba(42,20,15,0.5)] lg:grid-cols-2">
      <div className="relative">
        {dish.image ? (
          <div className="relative aspect-[4/3] w-full bg-brand-beige sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[42rem]">
            <Image src={dish.image} alt={dish.name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-brand-beige text-sm font-semibold text-brand-brown">Imagem indisponível</div>
        )}

        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
          aria-label="Voltar"
          className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-brand-dark shadow-lg backdrop-blur transition hover:bg-brand-beige"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5m7-7-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="p-5 sm:p-7 lg:p-10">
        {dish.categoryName && <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">{dish.categoryName}</p>}
        <h1 className="mt-2 font-display text-3xl leading-tight text-brand-dark sm:text-4xl">{dish.name}</h1>
        {dish.description && <p className="mt-4 leading-7 text-brand-brown/80">{dish.description}</p>}

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-brand-brown/10 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown/60">Preço</p>
            <p className="mt-1 text-2xl font-bold text-brand-dark">R$ {Number(dish.price).toFixed(2)}</p>
          </div>
          {dish.servings != null && (
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown/60">Serve</p>
              <p className="mt-1 font-semibold text-brand-dark">{dish.servings} {dish.servings === 1 ? 'pessoa' : 'pessoas'}</p>
            </div>
          )}
        </div>

        {Array.isArray(dish.ingredients) && dish.ingredients.length > 0 && (
          <section className="mt-6" aria-labelledby="acompanhamentos-title">
            <h2 id="acompanhamentos-title" className="text-sm font-bold uppercase tracking-wider text-brand-brown/70">Acompanhamentos</h2>
            <p className="mt-2 leading-7 text-brand-dark">{dish.ingredients.join(', ')}</p>
          </section>
        )}

        {addons.length > 0 && (
          <section className="mt-7" aria-labelledby="adicionais-title">
            <h2 id="adicionais-title" className="text-sm font-bold uppercase tracking-wider text-brand-brown/70">Adicionais</h2>
            <div className="mt-3 space-y-3">
              {addons.map((addon) => {
                const addonQty = addonQtyMap[addon.id] || 0;
                return (
                  <div key={addon.id} className="flex items-center justify-between gap-3 rounded-2xl border border-brand-brown/10 bg-brand-beige/45 p-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-dark">{addon.name}</p>
                      <p className="mt-0.5 text-sm text-brand-brown/65">{addon.price > 0 ? `+ R$ ${addon.price.toFixed(2)}` : 'Incluso'}{addon.required ? ' · obrigatório' : ''}</p>
                    </div>
                    <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-brand-brown/15 bg-white">
                      <button type="button" aria-label={`Diminuir ${addon.name}`} onClick={() => changeAddonQty(addon, addonQty - 1)} disabled={addonQty <= (addon.required ? 1 : 0)} className="h-10 w-10 text-lg text-brand-dark disabled:opacity-35">−</button>
                      <span className="min-w-8 text-center text-sm font-bold text-brand-dark">{addonQty}</span>
                      <button type="button" aria-label={`Aumentar ${addon.name}`} onClick={() => changeAddonQty(addon, addonQty + 1)} disabled={addonQty >= addon.maxQty} className="h-10 w-10 text-lg text-brand-dark disabled:opacity-35">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-8">
          <p className="text-sm font-bold text-brand-brown">Quantidade</p>
          <div className="mt-2 inline-flex items-center overflow-hidden rounded-full border border-brand-brown/15 bg-brand-beige/50">
            <button type="button" aria-label="Diminuir quantidade" onClick={() => setQty((current) => Math.max(1, current - 1))} disabled={qty === 1} className="h-12 w-12 bg-white text-xl text-brand-dark disabled:opacity-35">−</button>
            <span className="min-w-12 text-center font-bold text-brand-dark">{qty}</span>
            <button type="button" aria-label="Aumentar quantidade" onClick={() => setQty((current) => current + 1)} className="h-12 w-12 bg-white text-xl text-brand-dark">+</button>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={handleAdd} className="min-h-14 rounded-full bg-brand-orange px-6 py-3 font-bold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-dark">Adicionar à sacola · R$ {total.toFixed(2)}</button>
          <button type="button" onClick={handleShare} disabled={sharing} className="min-h-14 rounded-full border border-brand-brown/20 bg-white px-6 py-3 font-bold text-brand-brown transition hover:bg-brand-beige disabled:opacity-60">{sharing ? 'Compartilhando…' : 'Compartilhar prato'}</button>
        </div>
      </div>
    </article>
  );
}
