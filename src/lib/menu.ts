import type { Dish } from './api';
export function toMenuDish(dish: Dish) {
  return {
    id: dish.id,
    slug: dish.slug,
    name: dish.name,
    cat: dish.categoryName || 'Pratos',
    desc: dish.description || '',
    ingredients: dish.ingredients || '',
    accompaniments: dish.accompaniments || '',
    dish_notes: dish.dish_notes || '',
    servings: dish.servings,
    price: Number(dish.price),
    promo_price: dish.promo_price,
    promo_active: dish.promo_active,
    image: dish.image || null,
    is_new: Boolean(dish.isNew),
    popular: Boolean(dish.popular),
    tag: dish.isNew ? 'Novidade' : dish.popular ? 'Mais pedido' : 'Da casa',
    stock: Number(dish.stock ?? 0),
    available: dish.isAvailable !== false && Number(dish.stock ?? 0) > 0,
    addons: dish.addons || [],
    related_products: dish.related_products || [],
    type: 'dish' as const,
  };
}
