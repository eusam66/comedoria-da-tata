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
        price: Number(dish.price) || 0,
        image: dish.image || null,
        tag: dish.isNew ? 'Novidade' : dish.popular ? 'Mais pedido' : 'Da casa',
        available: dish.isAvailable !== false
      }))
    );
  } catch (error) {
    console.error('public menu', error);
    return NextResponse.json({ error: 'Cardápio temporariamente indisponível.' }, { status: 503 });
  }
}
