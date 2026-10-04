import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthSafe';
import { saveDeliveryZone } from '@/lib/deliveryZonesAdmin';
import { ZoneValidationError } from '@/lib/deliveryZones';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    return NextResponse.json(await saveDeliveryZone(await req.json(), id));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : error instanceof ZoneValidationError || error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? 'Não foi possível salvar a localização.' : message }, { status });
  }
}
