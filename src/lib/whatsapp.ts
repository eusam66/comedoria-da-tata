import type { OrderFulfillment } from './deliveryZones.ts';

// Número comercial já utilizado pelo cardápio. Homologação nunca usa fallback.
export const BUSINESS_WHATSAPP_PHONE = '5581992743126';

export function whatsappUrl(message = '', phone?: string): string | null {
  if (process.env.NEXT_PUBLIC_APP_ENV === 'homologacao') return null;
  const digits = (phone ?? process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? BUSINESS_WHATSAPP_PHONE).replace(/\D/g, '');
  if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export type CheckoutCustomer = {
  name: string; phone: string; delivery: string; street: string; number: string;
  neighborhood: string; complement: string; reference: string; payment: string;
  change: string; notes: string; delivery_zone_id: string;
};
export type SavedOrder = {
  id: string; code: string; totalCents: number; subtotalCents: number;
  fulfillment: OrderFulfillment | null;
  customer: CheckoutCustomer;
  items: Array<{ quantity: number; name: string; price: number; notes?: string;
    addons?: Array<{ qty: number; name: string }> }>;
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function buildOrderMessage(order: SavedOrder): string {
  const c = order.customer;
  const snapshot = order.fulfillment;
  const pickup = (snapshot?.type ?? c.delivery) === 'pickup';
  const lines = order.items.map(item => `${item.quantity}x ${item.name} — ${money(Number(item.price) * item.quantity)}${
    item.addons?.length ? `\n  + ${item.addons.map(a => `${a.qty}x ${a.name}`).join(', ')}` : ''
  }${item.notes ? `\n  Obs.: ${item.notes}` : ''}`);
  return [
    `🟠 *PEDIDO #${order.code} — Comedoria da Tata*`,
    `Cliente: ${c.name}\nTelefone: ${c.phone}`,
    pickup ? 'Atendimento: Retirada na Comedoria' : [
      'Atendimento: Entrega', `Endereço: ${c.street}, ${c.number}`, `Bairro: ${c.neighborhood}`,
      c.complement && `Complemento: ${c.complement}`, c.reference && `Referência: ${c.reference}`,
      snapshot?.delivery_zone_name && `Zona: ${snapshot.delivery_zone_name}`,
    ].filter(Boolean).join('\n'),
    `ITENS\n${lines.join('\n')}`,
    `Subtotal: ${money(order.subtotalCents / 100)}\nTaxa de entrega: ${money(snapshot?.delivery_fee ?? 0)}\n*Total: ${money(order.totalCents / 100)}*`,
    `Pagamento: ${c.payment === 'pix' ? 'PIX' : c.payment === 'cash' ? `Dinheiro${c.change ? ` (troco para R$ ${c.change})` : ''}` : 'Cartão'}`,
    c.notes && `Observações: ${c.notes}`,
    'Pedido registrado pelo cardápio. Confirme o envio desta mensagem no WhatsApp.',
  ].filter(Boolean).join('\n\n');
}
