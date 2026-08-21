import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
export async function GET() {
  if (!supabaseAdmin) return NextResponse.json([]);
  const { data, error } = await (supabaseAdmin as any).from('beverages').select('*').order('position').order('created_at');
  if (error) return NextResponse.json({ error: 'Bebidas temporariamente indisponíveis.' }, { status: 503 });
  return NextResponse.json((data || []).map((item: any) => ({ id: item.id, type: 'beverage', name: item.name, size: item.size, price: Number(item.price), image: item.image_url, stock: Number(item.stock || 0), available: Number(item.stock || 0) >= 1 })));
}
