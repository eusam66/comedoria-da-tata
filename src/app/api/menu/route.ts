import { NextResponse } from 'next/server';
import { toMenuDish } from '@/lib/menu';
import { getDishes } from '@/lib/api';

export async function GET() {
  try {
    const dishes = await getDishes({ includeUnavailable: true });
    return NextResponse.json(dishes.map(toMenuDish), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('public menu', error);
    return NextResponse.json({ error: 'Cardápio temporariamente indisponível.' }, { status: 503 });
  }
}
