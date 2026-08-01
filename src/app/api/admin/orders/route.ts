import { NextResponse } from 'next/server';
import * as adminApi from '@/lib/adminApi';

export async function GET(req: Request) {
  try {
    await (await import('@/lib/adminAuthSafe')).requireAdmin(req);
    const list = await adminApi.adminListOrders();
    return NextResponse.json(list);
  } catch (err:any) {
    console.error('admin GET orders', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await (await import('@/lib/adminAuthSafe')).requireAdmin(req);
    const body = await req.json();
    const created = await adminApi.adminCreateOrder(body);
    return NextResponse.json(created);
  } catch (err:any) {
    console.error('admin POST orders', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
