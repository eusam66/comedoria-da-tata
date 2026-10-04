import { NextResponse } from 'next/server';
import { listDeliveryZones } from '@/lib/deliveryZonesAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await listDeliveryZones(true), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('public GET delivery zones', error);
    return NextResponse.json({ error: 'Não foi possível carregar as localizações de entrega. Tente novamente ou escolha retirada.' }, { status: 503 });
  }
}
