'use client';
import React, { useMemo, useState } from 'react';
import { useCart } from './CartContext';

type Props = {
  onClose?: () => void;
};

export default function Checkout({ onClose }: Props) {
  const { items, subtotal, total, clear } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [delivery, setDelivery] = useState<'delivery' | 'pickup'>('delivery');
  const [payment, setPayment] = useState<'pix' | 'card' | 'cash' | 'boleto'>('pix');
  const [changeFor, setChangeFor] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const itemLines = useMemo(
    () =>
      items.map((it) => {
        const lineTotal = Number(it.unitPrice) * it.qty;
        const addons = it.selectedAddons.length > 0
          ? ` | adicionais: ${it.selectedAddons.map((addon) => `${addon.qty}x ${addon.name} (+R$ ${(addon.price * addon.qty).toFixed(2)})`).join(', ')}`
          : '';
        return `${it.qty}x ${it.dish.name} - R$ ${Number(it.unitPrice).toFixed(2)} = R$ ${lineTotal.toFixed(2)}${addons}${it.notes ? ` (obs: ${it.notes})` : ''}`;
      }),
    [items]
  );

  const isValid =
    name.trim() !== '' &&
    phone.trim() !== '' &&
    (delivery === 'pickup' || (address.trim() !== '' && neighborhood.trim() !== ''));

  function buildMessage() {
    const parts: string[] = [];
    parts.push('Novo pedido - Comedoria da Tata');
    parts.push('');
    parts.push('Cliente:');
    parts.push(`Nome: ${name}`);
    parts.push(`Telefone: ${phone}`);
    parts.push('');

    if (delivery === 'delivery') {
      parts.push('Endereço:');
      parts.push(`Rua: ${address}`);
      parts.push(`Bairro: ${neighborhood}`);
      if (complement) parts.push(`Complemento: ${complement}`);
      parts.push('');
    } else {
      parts.push('Retirada: Retirada no balcão da Comedoria da Tata');
      parts.push('');
    }

    parts.push('Itens:');
    itemLines.forEach((line) => parts.push(line));
    const notesLines = items
      .flatMap((it) => (it.notes ? [`${it.qty}x ${it.dish.name}: ${it.notes}`] : []));
    if (notesLines.length > 0) {
      parts.push('');
      parts.push('Observações:');
      notesLines.forEach((line) => parts.push(line));
    }

    parts.push('');
    parts.push(`Forma de entrega: ${delivery === 'delivery' ? 'Delivery' : 'Retirada'}`);
    parts.push(`Forma de pagamento: ${payment === 'cash' ? 'Dinheiro' : payment === 'card' ? 'Cartão' : payment === 'pix' ? 'PIX' : 'Boleto'}`);
    if (payment === 'cash' && changeFor !== '') parts.push(`Troco para: R$ ${Number(changeFor).toFixed(2)}`);
    parts.push('');
    parts.push(`Total: R$ ${total.toFixed(2)}`);

    return parts.join('\n');
  }

  async function handleConfirm() {
    if (!isValid) {
      alert('Por favor, preencha nome, telefone e endereço quando necessário.');
      return;
    }
    setSubmitting(true);
    try {
      const msg = buildMessage();
      const phoneTarget = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '+5511999999999';
      const href = `https://wa.me/${phoneTarget.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
      // open in new tab/window
      window.open(href, '_blank', 'noopener,noreferrer');
      // clear cart and close
      clear();
      if (onClose) onClose();
    } catch (e) {
      console.error('Failed to open WhatsApp', e);
      alert('Não foi possível abrir o WhatsApp. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[1.75rem] bg-white/95 p-4 shadow-[0_30px_70px_-40px_rgba(42,20,15,0.45)]">
      <div className="mb-4 border-b border-brand-brown/10 pb-3">
        <h3 className="text-lg font-semibold text-brand-dark">Finalizar pedido</h3>
        <p className="text-sm text-brand-brown/70">Preencha seus dados para gerar a mensagem no WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-semibold text-brand-brown">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-3xl border border-brand-brown/10 bg-brand-beige/70 px-4 py-3 text-sm text-brand-dark shadow-sm focus:border-brand-orange"
            placeholder="Seu nome"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-brand-brown">Telefone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-3xl border border-brand-brown/10 bg-brand-beige/70 px-4 py-3 text-sm text-brand-dark shadow-sm focus:border-brand-orange"
            placeholder="(99) 9 9999-9999"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-brown">Forma de entrega</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {['delivery', 'pickup'].map((option) => {
              const label = option === 'delivery' ? 'Delivery' : 'Retirada';
              const active = delivery === option;
              return (
                <label key={option} className={`inline-flex items-center gap-2 rounded-3xl border px-4 py-2 text-sm font-semibold transition ${active ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-dark border-brand-brown/10 hover:bg-brand-beige'}`}>
                  <input type="radio" name="delivery" className="hidden" checked={active} onChange={() => setDelivery(option as 'delivery' | 'pickup')} />
                  {label}
                </label>
              );
            })}
          </div>
        </div>

        {delivery === 'delivery' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-brand-brown">Endereço</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2 w-full rounded-3xl border border-brand-brown/10 bg-brand-beige/70 px-4 py-3 text-sm text-brand-dark shadow-sm focus:border-brand-orange"
                placeholder="Rua, número e complemento"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-brown">Bairro</label>
              <input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-2 w-full rounded-3xl border border-brand-brown/10 bg-brand-beige/70 px-4 py-3 text-sm text-brand-dark shadow-sm focus:border-brand-orange"
                placeholder="Bairro"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-brown">Complemento</label>
              <input
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="mt-2 w-full rounded-3xl border border-brand-brown/10 bg-brand-beige/70 px-4 py-3 text-sm text-brand-dark shadow-sm focus:border-brand-orange"
                placeholder="Complemento (opcional)"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-brand-brown">Forma de pagamento</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: 'pix', label: 'PIX' },
              { value: 'card', label: 'Cartão' },
              { value: 'cash', label: 'Dinheiro' },
              { value: 'boleto', label: 'Boleto' }
            ].map((option) => {
              const active = payment === option.value;
              return (
                <label key={option.value} className={`inline-flex items-center gap-2 rounded-3xl border px-4 py-2 text-sm font-semibold transition ${active ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-dark border-brand-brown/10 hover:bg-brand-beige'}`}>
                  <input type="radio" name="payment" className="hidden" checked={active} onChange={() => setPayment(option.value as 'pix' | 'card' | 'cash' | 'boleto')} />
                  {option.label}
                </label>
              );
            })}
          </div>
        </div>

        {payment === 'cash' && (
          <div>
            <label className="block text-sm font-semibold text-brand-brown">Troco para quanto?</label>
            <input
              value={changeFor}
              onChange={(e) => setChangeFor(e.target.value === '' ? '' : Number(e.target.value))}
              type="number"
              min={0}
              step="0.01"
              className="mt-2 w-full rounded-3xl border border-brand-brown/10 bg-brand-beige/70 px-4 py-3 text-sm text-brand-dark shadow-sm focus:border-brand-orange"
              placeholder="0.00"
            />
          </div>
        )}

        <div className="rounded-[1.75rem] border border-brand-brown/10 bg-brand-beige/70 p-4 shadow-sm">
          <h4 className="font-semibold text-brand-dark">Resumo do pedido</h4>
          <div className="mt-3 space-y-3 text-sm text-brand-brown">
            {items.length === 0 ? (
              <div>Sem itens</div>
            ) : (
              <>
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-sm text-brand-dark">
                      {it.qty} x {it.dish.name}{it.notes ? ` (${it.notes})` : ''}
                      {it.selectedAddons.length > 0 && (
                        <div className="mt-1 text-xs text-brand-brown/80">
                          + {it.selectedAddons.map((addon) => `${addon.qty}x ${addon.name}`).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold">R$ {(Number(it.unitPrice) * it.qty).toFixed(2)}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 text-sm text-brand-brown/70">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-brand-dark">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-col sm:flex-row">
          <button onClick={onClose} className="flex-1 rounded-3xl border border-brand-brown/20 bg-white px-4 py-3 text-sm font-semibold text-brand-brown transition hover:bg-brand-beige">Voltar</button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || submitting}
            className="flex-1 rounded-3xl bg-brand-orange px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-orange/20 transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-brand-dark"
          >
            {submitting ? 'Enviando...' : 'Confirmar e abrir WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
