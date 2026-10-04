export type DeliveryZone = { id: string; name: string; fee: number };
export type AdminDeliveryZone = DeliveryZone & {
  is_active: boolean;
  position: number;
};
export type OrderFulfillment = {
  type: 'delivery' | 'pickup';
  delivery_zone_id: string | null;
  delivery_zone_name: string | null;
  delivery_fee: number;
  subtotal: number;
};

export const isZoneId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Parse decimal money as integer cents; reject ambiguous thousands separators,
// exponents, negatives and fractional cents instead of rounding silently.
export function parseFeeCents(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export class ZoneValidationError extends Error {}

export function validateZonePayload(value: unknown, partial = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ZoneValidationError('Preencha os dados da localização.');
  const input = value as Record<string, unknown>;
  const patch: { name?: string; fee?: string; is_active?: boolean; position?: number } = {};
  if (!partial || input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100)
      throw new ZoneValidationError('Informe um nome de até 100 caracteres.');
    patch.name = input.name.trim();
  }
  if (!partial || input.fee !== undefined) {
    const cents = parseFeeCents(input.fee);
    if (cents === null) throw new ZoneValidationError('Informe uma taxa válida, a partir de 0,00 e com até duas casas decimais.');
    patch.fee = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
  }
  if (!partial || input.is_active !== undefined) {
    if (typeof input.is_active !== 'boolean') throw new ZoneValidationError('Selecione o status da localização.');
    patch.is_active = input.is_active;
  }
  if (!partial || input.position !== undefined) {
    const position = typeof input.position === 'number' ? input.position : NaN;
    if (!Number.isInteger(position) || position < 0 || position > 2147483647)
      throw new ZoneValidationError('Informe uma ordem inteira a partir de zero.');
    patch.position = position;
  }
  if (!Object.keys(patch).length) throw new ZoneValidationError('Informe os dados a alterar.');
  return patch;
}

export function checkoutTotalCents(subtotal: number, delivery: string, zone?: DeliveryZone) {
  return Math.round(subtotal * 100) + (delivery === 'delivery' && zone ? Math.round(zone.fee * 100) : 0);
}

// Legacy orders have no snapshot: never infer a fee or recalculate their total.
export function readFulfillment(metadata: unknown): OrderFulfillment | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const snapshot = (metadata as { fulfillment?: OrderFulfillment }).fulfillment;
  return snapshot && ['delivery', 'pickup'].includes(snapshot.type) ? snapshot : null;
}

export const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function fulfillmentLines(snapshot: OrderFulfillment | null, legacyDelivery?: string, address?: string | null) {
  const pickup = (snapshot?.type || legacyDelivery) === 'pickup';
  if (pickup) return ['Retirada na Comedoria'];
  return [
    ...(snapshot ? [
      `Subtotal: ${formatMoney(snapshot.subtotal)}`,
      `Entrega: ${snapshot.delivery_zone_name} — ${formatMoney(snapshot.delivery_fee)}`,
    ] : []),
    `Endereço: ${address || 'Não informado'}`,
  ];
}
