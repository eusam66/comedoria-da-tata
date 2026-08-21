import { NextResponse } from 'next/server';
import * as adminApi from '@/lib/adminApi';
const status = (error: any) => error.message === 'Forbidden' ? 403 : error.message === 'Unauthorized' ? 401 : 500;
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) { try { await (await import('@/lib/adminAuthSafe')).requireAdmin(req); const { id } = await context.params; return NextResponse.json(await adminApi.adminUpdateBeverage(id, await req.json())); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: status(error) }); } }
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) { try { await (await import('@/lib/adminAuthSafe')).requireAdmin(req); const { id } = await context.params; await adminApi.adminDeleteBeverage(id); return NextResponse.json({ ok: true }); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: status(error) }); } }
