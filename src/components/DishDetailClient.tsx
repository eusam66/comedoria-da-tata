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
            <div className="w-full h-72 bg-gray-100 rounded-xl flex items-center justify-center">Imagem</div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-display text-brand-dark">{dish.name}</h1>
              <p className="text-sm text-gray-600 mt-2">{dish.description}</p>
              <div className="flex gap-2 mt-3 items-center">
                {dish.isNew && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Novo</span>}
                {dish.popular && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Mais pedido</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-brown">R$ {Number(dish.price).toFixed(2)}</div>
              <div className="text-sm text-gray-600">Serve: {dish.servings ?? 1} pessoa(s)</div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-2">Ingredientes</h4>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {(dish.ingredients || []).map((ing: string, i: number) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button aria-label="Diminuir" onClick={dec} className="px-3 py-2 bg-white text-xl">−</button>
              <div className="px-4">{qty}</div>
              <button aria-label="Aumentar" onClick={inc} className="px-3 py-2 bg-white text-xl">+</button>
            </div>

            <div className="flex-1">
              <label className="block text-sm mb-1">Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: sem cebola, pouco sal..." className="w-full border rounded-md p-2 text-sm h-24" />
            </div>
          </div>

        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-4 px-4 md:px-0 md:container md:mx-auto md:px-4">
        <div className="bg-white rounded-full shadow-lg p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Total:</div>
            <div className="text-lg font-bold">R$ {(Number(dish.price) * qty).toFixed(2)}</div>
          </div>
          <div>
            <button onClick={handleAdd} className="bg-brand-orange text-white px-6 py-3 rounded-full font-semibold shadow">Adicionar ao carrinho</button>
          </div>
        </div>
      </div>
    </div>
  );
}
