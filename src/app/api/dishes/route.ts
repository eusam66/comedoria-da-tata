import { NextResponse } from 'next/server';
import { searchDishes, getDishes } from '@/lib/api';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || undefined;
    const category = url.searchParams.get('category') || undefined;
    if (q || category) {
      const results = await searchDishes({ q, categoryId: category });
      console.log('/api/dishes search', { q, category, resultCount: results?.length, result: results });
      return NextResponse.json(results);
    }
    const all = await getDishes();
    console.log('/api/dishes get all', { resultCount: all?.length, result: all });
    return NextResponse.json(all);
  } catch (err:any) {
    console.error('API /api/dishes error', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
