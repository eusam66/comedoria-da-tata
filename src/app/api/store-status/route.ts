import { NextResponse } from 'next/server';
import { getCurrentStoreStatus } from '@/lib/storeSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getCurrentStoreStatus(), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('public GET store-status', error);
    return NextResponse.json({ error: 'Não foi possível consultar o horário da loja.' }, { status: 500 });
  }
}

