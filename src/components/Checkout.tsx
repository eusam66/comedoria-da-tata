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

  const itemLines = useMemo(() => items.map((it) => {
    const lineTotal = Number(it.dish.price) * it.qty;
    return `${it.qty}x ${it.dish.name} - R$ ${Number(it.dish.price).toFixed(2)} = R$ ${lineTotal.toFixed(2)}${it.notes ? ` (obs: ${it.notes})` : ''}`;
  }), [items]);

  const isValid = name.trim() !== '' && phone.trim() !== '' && (delivery === 'pickup' || address.trim() !== '' && neighborhood.trim() !== '');

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
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Finalizar pedido</h3>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm">Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="Seu nome" />
        </div>
        <div>
          <label className="block text-sm">Telefone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="(99) 9 9999-9999" />
        </div>

        <div>
          <label className="block text-sm">Forma de entrega</label>
          <div className="flex gap-2 mt-1">
            <label className={`px-3 py-2 border rounded ${delivery === 'delivery' ? 'bg-brand-beige' : ''}`}>
              <input type="radio" name="delivery" checked={delivery === 'delivery'} onChange={() => setDelivery('delivery')} /> <span className="ml-2">Delivery</span>
            </label>
            <label className={`px-3 py-2 border rounded ${delivery === 'pickup' ? 'bg-brand-beige' : ''}`}>
              <input type="radio" name="delivery" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} /> <span className="ml-2">Retirada</span>
            </label>
          </div>
        </div>

        {delivery === 'delivery' && (
          <>
            <div>
              <label className="block text-sm">Endereço</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="Rua, número e complemento" />
            </div>
            <div>
              <label className="block text-sm">Bairro</label>
              <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="Bairro" />
            </div>
            <div>
              <label className="block text-sm">Complemento</label>
              <input value={complement} onChange={(e) => setComplement(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="Complemento (opcional)" />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm">Forma de pagamento</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            <label className={`px-3 py-2 border rounded ${payment === 'pix' ? 'bg-brand-beige' : ''}`}>
              <input type="radio" name="payment" checked={payment === 'pix'} onChange={() => setPayment('pix')} /> <span className="ml-2">PIX</span>
            </label>
            <label className={`px-3 py-2 border rounded ${payment === 'card' ? 'bg-brand-beige' : ''}`}>
              <input type="radio" name="payment" checked={payment === 'card'} onChange={() => setPayment('card')} /> <span className="ml-2">Cartão</span>
            </label>
            <label className={`px-3 py-2 border rounded ${payment === 'cash' ? 'bg-brand-beige' : ''}`}>
              <input type="radio" name="payment" checked={payment === 'cash'} onChange={() => setPayment('cash')} /> <span className="ml-2">Dinheiro</span>
            </label>
            <label className={`px-3 py-2 border rounded ${payment === 'boleto' ? 'bg-brand-beige' : ''}`}>
              <input type="radio" name="payment" checked={payment === 'boleto'} onChange={() => setPayment('boleto')} /> <span className="ml-2">Boleto</span>
            </label>
          </div>
        </div>

        {payment === 'cash' && (
          <div>
            <label className="block text-sm">Troco para quanto?</label>
            <input value={changeFor} onChange={(e) => setChangeFor(e.target.value === '' ? '' : Number(e.target.value))} type="number" min={0} step="0.01" className="w-full border rounded p-2 mt-1" placeholder="0.00" />
          </div>
        )}

        <div className="border-t pt-3">
          <h4 className="font-semibold">Resumo do pedido</h4>
          <div className="mt-2 text-sm text-gray-700">
            {items.length === 0 ? (
              <div>Sem itens</div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between">
                    <div className="text-sm">{it.qty} x {it.dish.name}{it.notes ? ` (${it.notes})` : ''}</div>
                    <div className="text-sm font-semibold">R$ {(Number(it.dish.price) * it.qty).toFixed(2)}</div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-gray-600">Subtotal</div>
                  <div className="font-semibold">R$ {subtotal.toFixed(2)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="font-bold text-lg">R$ {total.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 border rounded py-2">Voltar</button>
          <button onClick={handleConfirm} disabled={!isValid || submitting} className="flex-1 bg-brand-orange text-white rounded py-2 font-semibold">{submitting ? 'Enviando...' : 'Confirmar e abrir WhatsApp'}</button>
        </div>
      </div>
    </div>
  );
}
