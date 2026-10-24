import { NextResponse } from 'next/server';
import { recommendationCatalog } from '@/lib/recommendationsServer';
import { recommendProducts } from '@/lib/recommendations';
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get('ids') || '')
    .split(',')
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 30);
  if (!ids.length) return NextResponse.json([]);
  const catalog = await recommendationCatalog();
  return NextResponse.json(
    recommendProducts(
      catalog,
      catalog.filter((d) => ids.includes(d.id))
    ),
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
