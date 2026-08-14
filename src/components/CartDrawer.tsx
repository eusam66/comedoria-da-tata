'use client';
import Image from 'next/image';
import { useCart } from './CartContext';

export default function CartDrawer() {
  const { items, isOpen, close, updateQty, removeItem, updateNotes, subtotal } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch">
      <div onClick={close} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div className="relative z-10 w-full md:ml-auto md:w-[420px] bg-white/95 backdrop-blur-xl h-[85vh] md:h-full rounded-t-3xl md:rounded-l-3xl shadow-2xl overflow-hidden border border-brand-brown/10">
        <div className="flex items-center justify-between border-b border-brand-brown/10 px-5 py-4 bg-white/90">
          <div>
            <h3 className="text-lg font-semibold text-brand-dark">Seu carrinho</h3>
            <p className="text-sm text-brand-brown/70">Confira, ajuste e finalize o pedido.</p>
          </div>
          <button aria-label="Fechar" onClick={close} className="text-brand-brown transition hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-orange/30 rounded-full p-2">Fechar</button>
        </div>

        <div className="p-5 overflow-y-auto h-[calc(85vh-110px)] md:h-[calc(100%-110px)] space-y-5">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-brand-beige/80 p-6 text-center text-brand-brown shadow-sm">Seu carrinho está vazio. Escolha um prato delicioso para começar.</div>
          ) : (
            <div className="space-y-5">
              {items.map((it) => (
                <div key={it.id} className="rounded-[1.75rem] border border-brand-brown/10 bg-white shadow-sm p-4">
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-3xl bg-brand-beige/70">
                      {it.dish.image ? (
                        <Image src={it.dish.image} alt={it.dish.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-brand-brown">Imagem</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-brand-dark">{it.dish.name}</div>
                          <div className="text-sm text-brand-brown/70">R$ {Number(it.unitPrice).toFixed(2)}</div>
                        </div>
                        <div className="text-right text-sm font-semibold text-brand-dark">R$ {(Number(it.unitPrice) * it.qty).toFixed(2)}</div>
                      </div>
                      {it.selectedAddons.length > 0 && (
                        <div className="mt-2 rounded-2xl bg-brand-beige/60 px-3 py-2 text-xs text-brand-brown">
                          <div className="font-semibold text-brand-dark">Adicionais</div>
                          <ul className="mt-1 space-y-1">
                            {it.selectedAddons.map((addon) => (
                              <li key={addon.addonId} className="flex items-center justify-between gap-2">
                                <span>{addon.qty}x {addon.name}</span>
                                <span>R$ {(addon.price * addon.qty).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button onClick={() => updateQty(it.id, it.qty - 1)} className="rounded-full border border-brand-brown/15 px-3 py-1 text-sm text-brand-dark transition hover:bg-brand-beige">−</button>
                        <div className="min-w-[2rem] text-center text-sm font-semibold">{it.qty}</div>
                        <button onClick={() => updateQty(it.id, it.qty + 1)} className="rounded-full border border-brand-brown/15 px-3 py-1 text-sm text-brand-dark transition hover:bg-brand-beige">+</button>
                        <button onClick={() => removeItem(it.id)} className="ml-auto text-sm font-semibold text-brand-brown transition hover:text-brand-dark">Remover</button>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-brand-brown uppercase tracking-[0.12em]">Observações</label>
                        <textarea
                          value={it.notes || ''}
                          onChange={(e) => updateNotes(it.id, e.target.value)}
                          className="mt-2 w-full rounded-3xl border border-brand-brown/10 px-3 py-2 text-sm text-brand-dark placeholder:text-brand-brown/40"
                          placeholder="Ex.: sem cebola"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-brand-brown/10 bg-white/95 px-5 py-4">
          <div className="flex items-center justify-between text-sm text-brand-brown/70">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="mt-4">
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => {
                close();
                window.location.assign('/?checkout=1');
              }}
              className="w-full rounded-3xl bg-brand-orange px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Finalizar pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
