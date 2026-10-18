import { NextResponse } from 'next/server';
import { handleOrder } from '@/lib/orderRoute';

// Esta ponte deve permanecer disponível inclusive no rollback da interface.
export async function POST(req: Request) {
  return handleOrder(req, true);
}

export async function GET() {
  return NextResponse.json({ checkoutContract: 2 }, { headers: { 'Cache-Control': 'no-store' } });
}
