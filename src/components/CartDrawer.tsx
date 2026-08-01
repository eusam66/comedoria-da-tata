'use client';
import React from 'react';
import Image from 'next/image';
import { useCart } from './CartContext';

import dynamic from 'next/dynamic';

const Checkout = dynamic(() => import('./Checkout'), { ssr: false });

export default function CartDrawer() {
  const { items, isOpen, close, updateQty, removeItem, updateNotes, subtotal } = useCart();
  const [showCheckout, setShowCheckout] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div onClick={close} className="absolute inset-0 bg-black/40" />

      {/* Drawer for md+ and Bottom sheet for mobile */}
      <div className="ml-auto w-full md:w-96 bg-white h-full rounded-t-lg md:rounded-l-lg shadow-xl z-10 overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Seu carrinho</h3>
          <button aria-label="Fechar" onClick={close} className="text-sm text-gray-600">Fechar</button>
        </div>

        <div className="p-4">
          {items.length === 0 ? (
            <div className="text-gray-600">Seu carrinho está vazio</div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 items-start">
                  <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                    {it.dish.image ? (
                      <div className="relative w-full h-full">
                        <Image src={it.dish.image} alt={it.dish.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Imagem</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{it.dish.name}</div>
                        <div className="text-xs text-gray-500">R$ {Number(it.dish.price).toFixed(2)}</div>
                      </div>
                      <div className="text-sm font-semibold">R$ {(Number(it.dish.price) * it.qty).toFixed(2)}</div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => updateQty(it.id, it.qty - 1)} className="px-2 py-1 border rounded">−</button>
                      <div className="px-3">{it.qty}</div>
                      <button onClick={() => updateQty(it.id, it.qty + 1)} className="px-2 py-1 border rounded">+</button>

                      <button onClick={() => removeItem(it.id)} className="ml-2 text-sm text-red-600">Remover</button>
                    </div>

                    <div className="mt-2">
                      <label className="text-xs text-gray-600">Observações</label>
                      <textarea value={it.notes || ''} onChange={(e) => updateNotes(it.id, e.target.value)} className="w-full border rounded p-2 text-sm mt-1" placeholder="Ex.: sem cebola" />
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">Subtotal</div>
                <div className="text-xl font-bold mt-2">R$ {subtotal.toFixed(2)}</div>
                <div className="mt-4">
                  {!showCheckout ? (
                    <button onClick={() => setShowCheckout(true)} className="w-full bg-brand-orange text-white py-3 rounded-md font-semibold">Finalizar pedido</button>
                  ) : (
                    <div className="rounded border p-2">
                      {/* Checkout component loaded dynamically below */}
                      <Checkout onClose={() => setShowCheckout(false)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
