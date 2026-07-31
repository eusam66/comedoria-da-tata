import { NextResponse } from 'next/server';
import * as adminApi from '@/lib/adminApi';

export async function GET(req: Request) {
  try {
    await (await import('@/lib/adminAuth')).requireAdmin(req);
    const list = await adminApi.adminListDishes();
    return NextResponse.json(list);
  } catch (err:any) {
    console.error('admin GET dishes', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await (await import('@/lib/adminAuth')).requireAdmin(req);
    const body = await req.json();
    const created = await adminApi.adminCreateDish(body);
    return NextResponse.json(created);
  } catch (err:any) {
    console.error('admin POST dishes', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
