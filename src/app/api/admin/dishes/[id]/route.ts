import { NextResponse } from 'next/server';
import * as adminApi from '@/lib/adminApi';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await (await import('@/lib/adminAuthSafe')).requireAdmin(req);
    const params = await context.params;
    const body = await req.json();
    const updated = await adminApi.adminUpdateDish(params.id, body);
    return NextResponse.json(updated);
  } catch (err:any) {
    console.error('admin PATCH dishes', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await (await import('@/lib/adminAuthSafe')).requireAdmin(req);
    const params = await context.params;
    const res = await adminApi.adminDeleteDish(params.id);
    return NextResponse.json({ ok: res });
  } catch (err:any) {
    console.error('admin DELETE dishes', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
