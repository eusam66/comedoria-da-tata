import { NextResponse } from 'next/server';
import { getDishes } from '@/lib/api';

export async function GET() {
  try {
    const dishes = await getDishes({ includeUnavailable: true });
    return NextResponse.json(
      dishes.map((dish: any) => ({
        id: dish.id,
        slug: dish.slug,
        name: dish.name,
        cat: dish.categoryName || 'Pratos',
        desc: dish.description || 'Receita caseira preparada com carinho.',
        ingredients: dish.ingredients || '',
        price: Number(dish.price) || 0,
        promo_price: dish.promo_price,
        promo_active: dish.promo_active,
        image: dish.image || null,
        is_new: dish.isNew,
        popular: dish.popular,
        tag: dish.isNew ? 'Novidade' : dish.popular ? 'Mais pedido' : 'Da casa',
        stock: Number(dish.stock ?? (dish.isAvailable === false ? 0 : 1)),
        available: dish.isAvailable !== false && Number(dish.stock ?? (dish.isAvailable === false ? 0 : 1)) >= 1
      })), { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('public menu', error);
    return NextResponse.json({ error: 'Cardápio temporariamente indisponível.' }, { status: 503 });
  }
}
