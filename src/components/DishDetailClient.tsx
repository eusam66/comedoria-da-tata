'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import DishGallery from './DishGallery';
import { useCart } from './CartContext';
import { DishAddon, normalizeDishAddons, SelectedAddon, selectedAddonsTotal } from '../lib/addons';
import { toastSuccess, toastError } from '../lib/toast';

export default function DishDetailClient({ dish, onAdd }: { dish: any; onAdd?: (payload: any) => void }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [touchedAddons, setTouchedAddons] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const addons = useMemo<DishAddon[]>(() => normalizeDishAddons(dish.addons ?? dish.extras ?? null), [dish.addons, dish.extras]);
  const [addonQtyMap, setAddonQtyMap] = useState<Record<string, number>>(
    () =>
      addons.reduce(
        (acc, addon) => ({ ...acc, [addon.id]: addon.required ? 1 : 0 }),
        {}
      )
  );


  const selectedAddons = useMemo<SelectedAddon[]>(
    () =>
      addons
        .map((addon) => ({
          addonId: addon.id,
          name: addon.name,
          price: addon.price,
          qty: Math.max(0, addonQtyMap[addon.id] || 0)
        }))
        .filter((addon) => addon.qty > 0),
    [addons, addonQtyMap]
  );

  const requiredMissing = useMemo(
    () => addons.filter((addon) => addon.required && (addonQtyMap[addon.id] || 0) < 1),
    [addons, addonQtyMap]
  );

  const addonsUnitTotal = useMemo(() => selectedAddonsTotal(selectedAddons), [selectedAddons]);
  const lineTotal = (Number(dish.price) + addonsUnitTotal) * qty;

  function changeAddonQty(addonId: string, nextQty: number, maxQty: number) {
    const safeQty = Math.max(0, Math.min(maxQty, nextQty));
    setTouchedAddons(true);
    setAddonQtyMap((current) => ({
      ...current,
      [addonId]: safeQty
    }));
  }

  function handleAdd() {
    if (requiredMissing.length > 0) {
      setTouchedAddons(true);
      toastError('Selecione os adicionais obrigatórios antes de adicionar ao carrinho.');
      return;
    }

    const payload = { dishId: dish.id, qty, notes, selectedAddons };
    if (onAdd) {
      onAdd(payload);
    } else {
      try {
        addItem(dish, qty, { notes, selectedAddons });
        setAdded(true);
        toastSuccess(`${dish.name} adicionado ao carrinho!`);
        setTimeout(() => setAdded(false), 2000);
      } catch (e) {
        console.error('add to cart failed', e);
        toastError('Não foi possível adicionar ao carrinho. Tente novamente.');
      }
    }
  }

  return (
    <div className="relative pb-28">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-brand-brown/15 bg-white px-4 py-2 text-sm font-semibold text-brand-brown shadow-sm transition hover:bg-brand-beige hover:text-brand-dark"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Voltar ao cardápio
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {dish.image ? (
            <DishGallery images={[dish.image]} />
          ) : (
            <div className="flex h-72 w-full items-center justify-center rounded-[1.5rem] border border-brand-brown/10 bg-brand-beige/70 text-sm font-semibold text-brand-brown">
              Imagem indisponível
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-display text-brand-dark">{dish.name}</h1>
              {dish.code && (
                <div className="mt-1 text-xs font-mono text-brand-brown/50">Cód. {dish.code}</div>
              )}
              <p className="mt-2 text-sm leading-6 text-brand-brown/80">{dish.description}</p>
              <div className="flex gap-2 mt-3 items-center flex-wrap">
                {dish.isNew && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Novo</span>
                )}
                {dish.popular && (
                  <span className="inline-flex items-center rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">Mais pedido</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-brand-brown">R$ {Number(dish.price).toFixed(2)}</div>
              <div className="mt-1 text-sm text-brand-brown/60">Serve {dish.servings ?? 1} pessoa{(dish.servings ?? 1) > 1 ? 's' : ''}</div>
            </div>
          </div>

          {Array.isArray(dish.ingredients) && dish.ingredients.length > 0 && (
            <div className="mt-5">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-brown/60">Ingredientes</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {dish.ingredients.map((ing: string, i: number) => (
                  <span key={i} className="rounded-full border border-brand-brown/10 bg-brand-beige/70 px-3 py-1 text-xs text-brand-brown">{ing}</span>
                ))}
              </div>
            </div>
          )}

          {addons.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-brown/60 mb-3">Adicionais</h4>
              <div className="space-y-3">
                {addons.map((addon) => {
                  const addonQty = addonQtyMap[addon.id] || 0;
                  const isError = touchedAddons && addon.required && addonQty < 1;
                  return (
                    <div
                      key={addon.id}
                      className={`rounded-[1.25rem] border px-4 py-3 transition ${isError ? 'border-red-300 bg-red-50' : 'border-brand-brown/10 bg-white/70'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-brand-dark">{addon.name}</span>
                            {addon.required && (
                              <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-semibold text-brand-orange">Obrigatório</span>
                            )}
                          </div>
                          <div className="text-xs text-brand-brown/60 mt-0.5">
                            {addon.price > 0 ? `+ R$ ${addon.price.toFixed(2)}` : 'Incluso'} • máx. {addon.maxQty}
                          </div>
                        </div>
                        <div className="flex items-center overflow-hidden rounded-full border border-brand-brown/10 bg-brand-beige/50">
                          <button
                            aria-label={`Diminuir ${addon.name}`}
                            onClick={() => changeAddonQty(addon.id, addonQty - 1, addon.maxQty)}
                            className="px-3 py-2 bg-white text-lg text-brand-dark transition hover:bg-brand-beige disabled:opacity-40"
                            disabled={addonQty === 0}
                          >
                            −
                          </button>
                          <div className="min-w-[2.5rem] px-3 text-center text-sm font-semibold text-brand-dark">{addonQty}</div>
                          <button
                            aria-label={`Aumentar ${addon.name}`}
                            onClick={() => changeAddonQty(addon.id, addonQty + 1, addon.maxQty)}
                            className="px-3 py-2 bg-white text-lg text-brand-dark transition hover:bg-brand-beige disabled:opacity-40"
                            disabled={addonQty >= addon.maxQty}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {isError && (
                        <p className="mt-1 text-xs text-red-600">Este adicional é obrigatório.</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {touchedAddons && requiredMissing.length > 0 && (
                <p className="mt-2 text-sm text-red-600">
                  Selecione os adicionais obrigatórios: {requiredMissing.map((addon) => addon.name).join(', ')}.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-brand-brown mb-2">Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: sem cebola, pouco sal, ponto da carne..."
                className="h-24 w-full rounded-[1.25rem] border border-brand-brown/10 bg-brand-beige/50 p-3 text-sm text-brand-dark outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-brown/10 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_-10px_rgba(42,20,15,0.20)] backdrop-blur-xl md:px-0">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center overflow-hidden rounded-full border border-brand-brown/10 bg-brand-beige/50">
              <button aria-label="Diminuir quantidade" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 bg-white text-xl text-brand-dark transition hover:bg-brand-beige disabled:opacity-40" disabled={qty <= 1}>−</button>
              <div className="min-w-[2.5rem] px-3 text-center text-sm font-semibold text-brand-dark">{qty}</div>
              <button aria-label="Aumentar quantidade" onClick={() => setQty((q) => q + 1)} className="px-3 py-2 bg-white text-xl text-brand-dark transition hover:bg-brand-beige">+</button>
            </div>
            <div>
              <div className="text-xs text-brand-brown/60">Total</div>
              <div className="text-lg font-bold text-brand-dark">R$ {lineTotal.toFixed(2)}</div>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className={`rounded-full px-6 py-3 font-semibold text-white shadow-lg transition ${added ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-brand-orange shadow-brand-orange/20 hover:bg-brand-dark'}`}
          >
            {added ? '✓ Adicionado!' : 'Adicionar ao carrinho'}
          </button>
        </div>
      </div>
    </div>
  );
}
