import { createHash } from 'node:crypto';
import { createOrderOnce, IdempotencyConflict } from '@/lib/orderIdempotency';
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateOrderCode } from '@/lib/orders';
import { getCurrentStoreStatus } from '@/lib/storeSettings';
import { isZoneId, readFulfillment } from '@/lib/deliveryZones';

const clean = (value: unknown, max = 180) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
export async function handleOrder(req: Request, requireConfirmation = false) {
  try {
    if (!supabaseAdmin)
      return NextResponse.json(
        { error: 'Pedidos temporariamente indisponíveis.' },
        { status: 503 }
      );
    const client = supabaseAdmin as any;
    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey))
      return NextResponse.json({ error: 'Reabra o checkout para registrar o pedido.', code: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 });
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return NextResponse.json({ error: 'Revise os dados do pedido.' }, { status: 400 });
    const fingerprint = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const find = async () => {
      const { data, error } = await client.from('orders').select('*').eq('id', idempotencyKey).maybeSingle();
      if (error) throw error;
      return data;
    };
    const existing = await find();
    if (existing) {
      if (existing.metadata?.checkout_fingerprint !== fingerprint) throw new IdempotencyConflict();
      return orderResponse(existing);
    }
    const store = await getCurrentStoreStatus();
    if (!store.isOpen)
      return NextResponse.json(
        {
          error: `A loja está fechada. ${
            store.nextOpeningLabel || store.label
          }. Você pode manter sua sacola para pedir depois.`,
          store,
        },
        { status: 409 }
      );
    const customer = body?.customer || {};
    if (!Array.isArray(body?.items) || body.items.length > 30)
      return NextResponse.json({ error: 'Revise a sacola: são permitidas até 30 opções por pedido.' }, { status: 400 });
    const requested = body.items;
    if (requested.some((item: unknown) => !item || typeof item !== 'object' || Array.isArray(item)))
      return NextResponse.json({ error: 'Revise os itens do pedido.' }, { status: 400 });
    // O contrato legado é explícito: ausência total de expectativas cobra o
    // regular do catálogo, como o PWA antigo. Dados parciais nunca fazem fallback.
    const confirmed = requireConfirmation || 'expected_total_cents' in body ||
      requested.some((item: any) => item && 'expected_unit_cents' in item);
    const validCents = (value: unknown) => typeof value === 'number' &&
      Number.isSafeInteger(value) && value >= 0 && value <= 999999999999;
    if (confirmed && (!validCents(body.expected_total_cents) ||
      requested.some((item: any) => !validCents(item?.expected_unit_cents))))
      return NextResponse.json({ error: 'Atualize a página para confirmar os preços atuais.', code: 'PRICE_CONFIRMATION_REQUIRED' }, { status: 409 });
    if (requested.some((item: any) => !item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20))
      return NextResponse.json({ error: 'Revise as quantidades da sacola.', code: 'INVALID_ITEM' }, { status: 400 });
    const name = clean(customer.name, 100);
    const phone = clean(customer.phone, 30);
    const delivery = customer.delivery === 'pickup' ? 'pickup' : 'delivery';
    if (delivery === 'delivery' && !isZoneId(customer.delivery_zone_id))
      return NextResponse.json(
        { error: 'Selecione a localização de entrega.', code: 'DELIVERY_ZONE_REQUIRED' },
        { status: 400 }
      );
    if (!name || !phone || !requested.length)
      return NextResponse.json(
        { error: 'Preencha seus dados e adicione ao menos um item.' },
        { status: 400 }
      );
    if (
      delivery === 'delivery' &&
      (!clean(customer.street) || !clean(customer.number, 30) || !clean(customer.neighborhood))
    )
      return NextResponse.json({ error: 'Complete o endereço de entrega.' }, { status: 400 });
    const address =
      delivery === 'pickup'
        ? 'Retirada no local'
        : [
            clean(customer.street),
            clean(customer.number, 30),
            clean(customer.neighborhood),
            clean(customer.complement),
          ]
            .filter(Boolean)
            .join(', ');
    const safeCustomer = {
      checkout_fingerprint: fingerprint,
      expected_total_cents: body.expected_total_cents,
      name,
      phone,
      address,
      delivery,
      delivery_zone_id: delivery === 'delivery' ? customer.delivery_zone_id : null,
      street: clean(customer.street),
      number: clean(customer.number, 30),
      neighborhood: clean(customer.neighborhood),
      complement: clean(customer.complement),
      reference: clean(customer.reference),
      payment: ['pix', 'card', 'cash'].includes(customer.payment) ? customer.payment : 'pix',
      change: clean(customer.change, 30),
      notes: clean(customer.notes, 500),
    };
    const items = requested
      .map((item: any) => ({
        id: clean(item.id, 80),
        type: item.type === 'beverage' ? 'beverage' : 'dish',
        quantity: item.quantity,
        expected_unit_cents: item.expected_unit_cents,
        notes: clean(item.notes, 300),
        addons: Array.isArray(item.addons)
          ? item.addons.slice(0, 20)
          : Array.isArray(item.selectedAddons)
          ? item.selectedAddons.slice(0, 20)
          : [],
      }))
      .filter((item: any) => item.id);
    const order = await createOrderOnce<any>(fingerprint, find, async () => {
      const { data, error } = await client.rpc(confirmed ? 'create_order_with_stock_v2' : 'create_order_with_stock', {
        p_id: idempotencyKey,
        p_code: generateOrderCode(),
        p_customer: safeCustomer,
        p_items: items,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    });
    return orderResponse(order);
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: 'Revise os dados do pedido.' }, { status: 400 });
    const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
    if (error instanceof IdempotencyConflict)
      return NextResponse.json({ error: 'Esta tentativa pertence a outro pedido. Reabra a confirmação original.', code: 'IDEMPOTENCY_CONFLICT' }, { status: 409 });
    if (/PRICE_CHANGED/.test(message)) {
      let quote = null;
      try { quote = JSON.parse(String((error as any).details)); } catch { /* Sem resumo: não confirma automaticamente. */ }
      return NextResponse.json({ error: 'Os preços mudaram. Confira o resumo atualizado e confirme novamente.', code: 'PRICE_CHANGED', quote }, { status: 409 });
    }
    if (/PRICE_CONFIRMATION_REQUIRED/.test(message))
      return NextResponse.json({ error: 'Atualize a página para confirmar os preços atuais.', code: 'PRICE_CONFIRMATION_REQUIRED' }, { status: 409 });
    if (/DELIVERY_ZONE_REQUIRED|DELIVERY_ZONE_UNAVAILABLE/.test(message))
      return NextResponse.json({ error: 'Esta localização não está disponível. Selecione outra localização de entrega.', code: 'DELIVERY_ZONE_UNAVAILABLE' }, { status: 409 });
    if (/INSUFFICIENT_STOCK|INVALID_PRODUCT/.test(message))
      return NextResponse.json({ error: 'Um item ficou sem estoque. Revise sua sacola.' }, { status: 409 });
    if (/EMPTY_ORDER|TOO_MANY_ITEMS|INVALID_ITEM|DUPLICATE_PRODUCT|DUPLICATE_ADDON|INVALID_ADDON|REQUIRED_ADDON/.test(message))
      return NextResponse.json({ error: 'Revise os itens e adicionais da sacola.' }, { status: 400 });
    console.error('public POST orders', error);
    return NextResponse.json(
      { error: 'Não foi possível registrar o pedido agora.' },
      { status: 500 }
    );
  }
}

// Somente valores históricos persistidos: reabrir nunca recalcula preço ou taxa.
function orderResponse(order: any) {
  const fulfillment = readFulfillment(order.metadata);
  const customer = { ...order.metadata };
  delete customer.checkout_fingerprint;
  delete customer.fulfillment;
  return NextResponse.json({
    id: order.id, code: order.code,
    totalCents: Math.round(Number(order.total) * 100), items: order.items,
    fulfillment, customer,
    subtotalCents: Math.round(Number(fulfillment?.subtotal ?? order.total) * 100),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
