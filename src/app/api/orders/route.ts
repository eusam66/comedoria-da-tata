import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateOrderCode } from '@/lib/orders';
import { getCurrentStoreStatus } from '@/lib/storeSettings';

const clean = (value: unknown, max = 180) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin)
      return NextResponse.json(
        { error: 'Pedidos temporariamente indisponíveis.' },
        { status: 503 }
      );
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
    const body = await req.json();
    const customer = body?.customer || {};
    const requested = Array.isArray(body?.items) ? body.items.slice(0, 30) : [];
    const name = clean(customer.name, 100);
    const phone = clean(customer.phone, 30);
    const delivery = customer.delivery === 'pickup' ? 'pickup' : 'delivery';
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
      name,
      phone,
      address,
      delivery,
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
        quantity: Math.max(1, Math.min(20, Math.trunc(Number(item.quantity) || 1))),
        notes: clean(item.notes, 300),
        addons: Array.isArray(item.addons)
          ? item.addons.slice(0, 20)
          : Array.isArray(item.selectedAddons)
          ? item.selectedAddons.slice(0, 20)
          : [],
      }))
      .filter((item: any) => item.id);
    const { data, error } = await (supabaseAdmin as any).rpc('create_order_with_stock', {
      p_id: crypto.randomUUID(),
      p_code: generateOrderCode(),
      p_customer: safeCustomer,
      p_items: items,
    });
    if (error) {
      if (/INSUFFICIENT_STOCK|INVALID_PRODUCT/.test(error.message || ''))
        return NextResponse.json(
          { error: 'Um item ficou sem estoque. Revise sua sacola.' },
          { status: 409 }
        );
      throw error;
    }
    const order = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      id: order.id,
      code: order.code,
      totalCents: Math.round(Number(order.total) * 100),
      items: order.items,
    });
  } catch (error) {
    console.error('public POST orders', error);
    return NextResponse.json(
      { error: 'Não foi possível registrar o pedido agora.' },
      { status: 500 }
    );
  }
}
