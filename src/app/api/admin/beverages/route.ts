import { NextResponse } from 'next/server';
import * as adminApi from '@/lib/adminApi';
const status = (error: any) => error.message === 'Forbidden' ? 403 : error.message === 'Unauthorized' ? 401 : 500;
export async function GET(req: Request) { try { await (await import('@/lib/adminAuthSafe')).requireAdmin(req); return NextResponse.json(await adminApi.adminListBeverages()); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: status(error) }); } }
export async function POST(req: Request) { try { await (await import('@/lib/adminAuthSafe')).requireAdmin(req); return NextResponse.json(await adminApi.adminCreateBeverage(await req.json())); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: status(error) }); } }
