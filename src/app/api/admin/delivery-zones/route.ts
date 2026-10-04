import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthSafe';
import { listDeliveryZones, saveDeliveryZone } from '@/lib/deliveryZonesAdmin';
import { ZoneValidationError } from '@/lib/deliveryZones';

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : error instanceof ZoneValidationError || error instanceof SyntaxError ? 400 : 500;
  return NextResponse.json({ error: status === 500 ? 'Não foi possível acessar as taxas de entrega.' : message }, { status });
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await listDeliveryZones(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await saveDeliveryZone(await req.json()), { status: 201 });
  } catch (error) { return failure(error); }
}
