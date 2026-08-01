'use client';
import React, { useState } from 'react';
import DishGallery from './DishGallery';
import { useCart } from './CartContext';

export default function DishDetailClient({ dish, onAdd }: { dish: any; onAdd?: (payload: any) => void }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const { addItem } = useCart();

  function dec() {
    setQty((q) => Math.max(1, q - 1));
  }
  function inc() {
    setQty((q) => q + 1);
  }

  function handleAdd() {
    const payload = { dishId: dish.id, qty, notes };
    if (onAdd) onAdd(payload);
    else {
      try {
        addItem(dish, qty, notes);
        // visual feedback
        // small toast could be added later; for now simple alert
        alert(`${dish.name} adicionado ao carrinho (${qty})`);
      } catch (e) {
        console.error('add to cart failed', e);
      }
    }
  }

  return (
    <div className="relative">
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
              <p className="mt-2 text-sm leading-6 text-brand-brown/80">{dish.description}</p>
              <div className="flex gap-2 mt-3 items-center">
                {dish.isNew && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Novo</span>}
                {dish.popular && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Mais pedido</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-brown">R$ {Number(dish.price).toFixed(2)}</div>
              <div className="text-sm text-brand-brown/80">Serve: {dish.servings ?? 1} pessoa(s)</div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-2">Ingredientes</h4>
            <ul className="list-disc list-inside text-sm leading-6 text-brand-brown/80">
              {(dish.ingredients || []).map((ing: string, i: number) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center overflow-hidden rounded-full border border-brand-brown/10 bg-brand-beige/50">
              <button aria-label="Diminuir" onClick={dec} className="px-3 py-2 bg-white text-xl text-brand-dark transition hover:bg-brand-beige">−</button>
              <div className="px-4 text-sm font-semibold text-brand-dark">{qty}</div>
              <button aria-label="Aumentar" onClick={inc} className="px-3 py-2 bg-white text-xl text-brand-dark transition hover:bg-brand-beige">+</button>
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold text-brand-brown">Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: sem cebola, pouco sal..." className="h-24 w-full rounded-[1.25rem] border border-brand-brown/10 bg-brand-beige/50 p-3 text-sm text-brand-dark outline-none focus:border-brand-orange" />
            </div>
          </div>

        </div>
      </div>

      <div className="fixed inset-x-0 bottom-4 px-4 md:px-0 md:container md:mx-auto md:px-4">
        <div className="flex items-center justify-between gap-4 rounded-full border border-brand-brown/10 bg-white/95 p-3 shadow-[0_20px_60px_-30px_rgba(42,20,15,0.45)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="text-sm text-brand-brown/80">Total:</div>
            <div className="text-lg font-bold text-brand-dark">R$ {(Number(dish.price) * qty).toFixed(2)}</div>
          </div>
          <div>
            <button onClick={handleAdd} className="rounded-full bg-brand-orange px-6 py-3 font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-dark">Adicionar ao carrinho</button>
          </div>
        </div>
      </div>
    </div>
  );
}
