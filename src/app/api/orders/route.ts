import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateOrderCode } from '@/lib/orders';
import { normalizeDishAddons } from '@/lib/addons';

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

    const requestedLines = requested
      .map((item: any) => ({
        id: clean(item?.id, 80),
        quantity: Math.min(20, Math.max(1, Math.trunc(Number(item?.quantity) || 1))),
        selectedAddons: Array.isArray(item?.selectedAddons) ? item.selectedAddons : [],
        notes: clean(item?.notes, 300)
      }))
      .filter((item: any) => item.id);

    const ids = [...new Set(requestedLines.map((item: any) => item.id))];
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

    const dishesById = new Map(dishes.map((dish: any) => [String(dish.id), dish]));
    let addonValidationError = '';
    const items = requestedLines.map((requestedItem: any) => {
      const dish: any = dishesById.get(requestedItem.id);
      const availableAddons = normalizeDishAddons(dish.extras ?? dish.addons ?? null);
      const selectedAddons = availableAddons
        .map((addon) => {
          const selected = requestedItem.selectedAddons.find((item: any) => clean(item?.addonId, 80) === addon.id);
          const qty = Math.min(addon.maxQty, Math.max(0, Math.trunc(Number(selected?.qty) || 0)));
          return { addonId: addon.id, name: addon.name, price: addon.price, qty };
        })
        .filter((addon) => addon.qty > 0);

      const missingRequired = availableAddons.some((addon) => addon.required && !selectedAddons.some((selected) => selected.addonId === addon.id));
      if (missingRequired) addonValidationError = `Selecione os adicionais obrigatórios de ${clean(dish.name, 120)}.`;

      const basePrice = Number(dish.price) || 0;
      const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price * addon.qty, 0);
      return {
        dishId: dish.id,
        name: clean(dish.name, 120),
        price: basePrice + addonsTotal,
        basePrice,
        quantity: requestedItem.quantity,
        selectedAddons,
        notes: requestedItem.notes || undefined
      };
    });
    if (addonValidationError) return NextResponse.json({ error: addonValidationError }, { status: 400 });
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
    const customerAddress = delivery === 'pickup'
      ? 'Retirada no local'
      : [safeCustomer.street, safeCustomer.number, safeCustomer.neighborhood, safeCustomer.complement]
          .filter(Boolean)
          .join(', ');
    const code = generateOrderCode();
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('orders')
      .insert([{
        id: crypto.randomUUID(),
        code,
        customer_name: name,
        customer_phone: phone,
        customer_address: customerAddress,
        items,
        total,
        status: 'Novo',
        metadata: safeCustomer
      }])
      .select('id, code, total')
      .single();
    if (orderError) throw orderError;

    return NextResponse.json({ id: order.id, code: order.code, totalCents: Math.round(Number(order.total) * 100) });
  } catch (error) {
    console.error('public POST orders', error);
    return NextResponse.json({ error: 'Não foi possível registrar o pedido agora.' }, { status: 500 });
  }
}

