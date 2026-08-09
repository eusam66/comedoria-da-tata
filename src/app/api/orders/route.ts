import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateOrderCode } from '@/lib/orders';

const MAX_ITEMS = 30;

function clean(value: unknown, max = 180) {
  return String(value ?? '').trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Pedidos temporariamente indisponíveis.' }, { status: 503 });
    }

    const body = await req.json();
    const customer = body?.customer ?? {};
    const requested = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [];
    const name = clean(customer.name, 100);
    const phone = clean(customer.phone, 30);
    const delivery = customer.delivery === 'pickup' ? 'pickup' : 'delivery';

    if (!name || !phone || requested.length === 0) {
      return NextResponse.json({ error: 'Preencha seus dados e adicione ao menos um prato.' }, { status: 400 });
    }

    if (delivery === 'delivery' && (!clean(customer.street) || !clean(customer.number, 30) || !clean(customer.neighborhood))) {
      return NextResponse.json({ error: 'Complete o endereço de entrega.' }, { status: 400 });
    }

    const quantities = new Map<string, number>();
    for (const item of requested) {
      const id = clean(item?.id, 80);
      const quantity = Math.min(20, Math.max(1, Math.trunc(Number(item?.quantity) || 1)));
      if (id) quantities.set(id, quantity);
    }

    const ids = [...quantities.keys()];
    if (!ids.length) return NextResponse.json({ error: 'Sua sacola está vazia.' }, { status: 400 });

    const { data: rows, error: dishesError } = await (supabaseAdmin as any)
      .from('dishes')
      .select('*')
      .in('id', ids);
    if (dishesError) throw dishesError;

    const dishes = (rows || []).filter((row: any) => row.is_available !== false);
    if (dishes.length !== ids.length) {
      return NextResponse.json({ error: 'Um prato não está mais disponível. Atualize o cardápio.' }, { status: 409 });
    }

    const items = dishes.map((dish: any) => ({
      dishId: dish.id,
      name: clean(dish.name, 120),
      price: Number(dish.price) || 0,
      quantity: quantities.get(String(dish.id)) || 1
    }));
    const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const safeCustomer = {
      name,
      phone,
      delivery,
      street: clean(customer.street),
      number: clean(customer.number, 30),
      neighborhood: clean(customer.neighborhood),
      complement: clean(customer.complement),
      reference: clean(customer.reference),
      payment: ['pix', 'card', 'cash'].includes(customer.payment) ? customer.payment : 'pix',
      change: clean(customer.change, 30),
      notes: clean(customer.notes, 500)
    };
    const code = generateOrderCode();
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('orders')
      .insert([{ id: crypto.randomUUID(), code, items, total, status: 'Novo', customer: safeCustomer }])
      .select('id, code, total')
      .single();
    if (orderError) throw orderError;

    return NextResponse.json({ id: order.id, code: order.code, totalCents: Math.round(Number(order.total) * 100) });
  } catch (error) {
    console.error('public POST orders', error);
    return NextResponse.json({ error: 'Não foi possível registrar o pedido agora.' }, { status: 500 });
  }
}
