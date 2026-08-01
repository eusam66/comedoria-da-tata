import { NextResponse } from 'next/server';
import { searchDishes, getDishes } from '@/lib/api';

const CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const dishes = q || category
      ? await searchDishes({ q, categoryId: category })
      : await getDishes();

    return new NextResponse(JSON.stringify(dishes), {
      headers: {
        'content-type': 'application/json',
        'cache-control': CACHE_CONTROL
      }
    });
  } catch (err: any) {
    console.error('API /api/dishes error', err);
    return new NextResponse(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
