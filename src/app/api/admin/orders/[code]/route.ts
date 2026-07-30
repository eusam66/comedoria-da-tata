import { NextResponse } from 'next/server';
import * as adminApi from '../../../../../lib/adminApi';

export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  try {
    await (await import('../../../../../lib/adminAuth')).requireAdmin(req);
    const body = await req.json();
    const updated = await adminApi.adminUpdateOrderStatus(params.code, body.status);
    return NextResponse.json(updated);
  } catch (err:any) {
    console.error('admin PATCH order', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
