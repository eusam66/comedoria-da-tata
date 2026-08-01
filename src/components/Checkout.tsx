'use client';
import React, { useMemo, useState } from 'react';
import { useCart } from './CartContext';

type Props = {
  onClose?: () => void;
};

type FieldErrors = {
  name?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmed, setConfirmed] = useState(false);

  const itemLines = useMemo(
    () =>
      items.map((it) => {
        const lineTotal = Number(it.unitPrice) * it.qty;
        const addons =
          it.selectedAddons.length > 0
            ? ` | adicionais: ${it.selectedAddons
                .map((addon) => `${addon.qty}x ${addon.name} (+R$ ${(addon.price * addon.qty).toFixed(2)})`)
                .join(', ')}`
            : '';
        return `${it.qty}x ${it.dish.name} - R$ ${Number(it.unitPrice).toFixed(2)} = R$ ${lineTotal.toFixed(2)}${addons}${
          it.notes ? ` (obs: ${it.notes})` : ''
        }`;
      }),
    [items]
  );

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Informe seu nome.';
    if (!phone.trim()) errors.phone = 'Informe seu telefone.';
    if (delivery === 'delivery') {
      if (!address.trim()) errors.address = 'Informe o endereco para entrega.';
      if (!neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
    }
    return errors;
  }

  function buildMessage() {
    const parts: string[] = [];
    parts.push('Novo pedido - Comedoria da Tata');
    parts.push('');
    parts.push('Cliente:');
    parts.push(`Nome: ${name}`);
    parts.push(`Telefone: ${phone}`);
    parts.push('');
    if (delivery === 'delivery') {
      parts.push('Endereco:');
      parts.push(`Rua: ${address}`);
      parts.push(`Bairro: ${neighborhood}`);
      if (complement) parts.push(`Complemento: ${complement}`);
      parts.push('');
    } else {
      parts.push('Retirada: Retirada no balcao da Comedoria da Tata');
      parts.push('');
    }
    parts.push('Itens:');
    itemLines.forEach((line) => parts.push(line));
    const notesLines = items.flatMap((it) => (it.notes ? [`${it.qty}x ${it.dish.name}: ${it.notes}`] : []));
    if (notesLines.length > 0) {
      parts.push('');
      parts.push('Observacoes:');
      notesLines.forEach((line) => parts.push(line));
    }
    parts.push('');
    parts.push(
      `Forma de entrega: ${delivery === 'delivery' ? 'Delivery' : 'Retirada'}`
    );
    const paymentLabel =
      payment === 'cash' ? 'Dinheiro' : payment === 'card' ? 'Cartao' : payment === 'pix' ? 'PIX' : 'Boleto';
    parts.push(`Forma de pagamento: ${paymentLabel}`);
    if (payment === 'cash' && changeFor !== '')
      parts.push(`Troco para: R$ ${Number(changeFor).toFixed(2)}`);
    parts.push('');
    parts.push(`Total: R$ ${total.toFixed(2)}`);
    return parts.join('\n');
  }

  async function handleConfirm() {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const msg = buildMessage();
      const phoneTarget = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '+5511999999999';
      const href = `https://wa.me/${phoneTarget.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
      setConfirmed(true);
      setTimeout(() => {
        window.open(href, '_blank', 'noopener,noreferrer');
        clear();
        if (onClose) onClose();
      }, 800);
    } catch (e) {
      console.error('Failed to open WhatsApp', e);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = (err?: string) =>
    `mt-2 w-full rounded-3xl border px-4 py-3 text-sm text-brand-dark shadow-sm focus:outline-none focus:ring-2 transition ${
      err
        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
        : 'border-brand-brown/10 bg-brand-beige/70 focus:border-brand-orange focus:ring-brand-orange/20'
    }`;

  return (
    <div className="rounded-[1.75rem] bg-white/95 p-4 shadow-[0_30px_70px_-40px_rgba(42,20,15,0.45)]">
      <div className="mb-4 border-b border-brand-brown/10 pb-3">
        <h3 className="text-lg font-semibold text-brand-dark">Finalizar pedido</h3>
        <p className="text-sm text-brand-brown/70">Preencha seus dados para gerar a mensagem no WhatsApp.</p>
      </div>

      {confirmed ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">OK</div>
          <div className="font-semibold text-brand-dark">Pedido confirmado!</div>
          <div className="text-sm text-brand-brown/70">Abrindo o WhatsApp com seu pedido...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-brand-brown">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((p) => ({ ...p, name: undefined }));
              }}
              className={inputCls(fieldErrors.name)}
              placeholder="Seu nome completo"
              autoComplete="name"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-brown">
              Telefone <span className="text-red-500">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFieldErrors((p) => ({ ...p, phone: undefined }));
              }}
              className={inputCls(fieldErrors.phone)}
              placeholder="(11) 9 9999-9999"
              type="tel"
              autoComplete="tel"
            />
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-brown">Forma de entrega</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['delivery', 'pickup'] as const).map((option) => {
                const label = option === 'delivery' ? 'Delivery' : 'Retirada';
                const active = delivery === option;
                return (
                  <label
                    key={option}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-3xl border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-brand-dark bg-brand-dark text-white'
                        : 'border-brand-brown/10 bg-white text-brand-dark hover:bg-brand-beige'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      className="hidden"
                      checked={active}
                      onChange={() => setDelivery(option)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          {delivery === 'delivery' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-brand-brown">
                  Endereco <span className="text-red-500">*</span>
                </label>
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setFieldErrors((p) => ({ ...p, address: undefined }));
                  }}
                  className={inputCls(fieldErrors.address)}
                  placeholder="Rua, numero"
                  autoComplete="street-address"
                />
                {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-brown">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <input
                  value={neighborhood}
                  onChange={(e) => {
                    setNeighborhood(e.target.value);
                    setFieldErrors((p) => ({ ...p, neighborhood: undefined }));
                  }}
                  className={inputCls(fieldErrors.neighborhood)}
                  placeholder="Bairro"
                  autoComplete="address-level2"
                />
                {fieldErrors.neighborhood && <p className="mt-1 text-xs text-red-600">{fieldErrors.neighborhood}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-brown">Complemento</label>
                <input
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className={inputCls()}
                  placeholder="Ap., bloco, referencia (opcional)"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-brand-brown">Forma de pagamento</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: 'pix', label: 'PIX' },
                { value: 'card', label: 'Cartao' },
                { value: 'cash', label: 'Dinheiro' },
                { value: 'boleto', label: 'Boleto' },
              ].map((option) => {
                const active = payment === option.value;
                return (
                  <label
                    key={option.value}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-3xl border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-brand-dark bg-brand-dark text-white'
                        : 'border-brand-brown/10 bg-white text-brand-dark hover:bg-brand-beige'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="hidden"
                      checked={active}
                      onChange={() => setPayment(option.value as typeof payment)}
                    />
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
                className={inputCls()}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="rounded-[1.75rem] border border-brand-brown/10 bg-brand-beige/70 p-4 shadow-sm">
            <h4 className="font-semibold text-brand-dark">Resumo do pedido</h4>
            <div className="mt-3 space-y-2 text-sm text-brand-brown">
              {items.length === 0 ? (
                <div className="text-brand-brown/60">Sem itens no carrinho.</div>
              ) : (
                <>
                  {items.map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 text-sm text-brand-dark">
                        <span className="font-semibold">{it.qty}x</span> {it.dish.name}
                        {it.notes && <span className="text-brand-brown/60"> ({it.notes})</span>}
                        {it.selectedAddons.length > 0 && (
                          <div className="mt-0.5 text-xs text-brand-brown/70">
                            + {it.selectedAddons.map((a) => `${a.qty}x ${a.name}`).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 font-semibold">
                        R$ {(Number(it.unitPrice) * it.qty).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-brand-brown/10 pt-2 text-sm text-brand-brown/70">
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onClose}
              className="flex-1 rounded-3xl border border-brand-brown/20 bg-white px-4 py-3 text-sm font-semibold text-brand-brown transition hover:bg-brand-beige"
            >
              Voltar
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || items.length === 0}
              className="flex-1 rounded-3xl bg-brand-orange px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-orange/20 transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-brand-dark"
            >
              {submitting ? 'Enviando...' : 'Confirmar pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}