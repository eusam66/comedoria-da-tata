import { NextResponse } from 'next/server';
import * as adminApi from '@/lib/adminApi';

export async function GET(req: Request) {
  try {
    await (await import('@/lib/adminAuthSafe')).requireAdmin(req);
    const settings = await adminApi.adminGetStoreSettings();
    return NextResponse.json(settings);
  } catch (err:any) {
    console.error('admin GET settings', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await (await import('@/lib/adminAuthSafe')).requireAdmin(req);
    const body = await req.json();
    const updated = await adminApi.adminUpdateStoreSettings(body);
    return NextResponse.json(updated);
  } catch (err:any) {
    console.error('admin PUT settings', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
