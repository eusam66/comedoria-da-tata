import { NextResponse } from 'next/server';
import { getPublicCommerce } from '@/lib/commercialServer';
export async function GET() {
  return NextResponse.json(await getPublicCommerce(), { headers: { 'Cache-Control': 'no-store' } });
}
