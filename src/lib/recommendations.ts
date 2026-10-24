import type { DishAddon } from './addons';
import type { RelatedProduct } from './dishMedia';
export type RecommendationProduct = {
  id: string;
  type: 'dish' | 'beverage';
  name: string;
  slug?: string;
  price: number;
  promo_price?: number | null;
  promo_active?: boolean;
  image?: string | null;
  stock?: number | null;
  is_available?: boolean | null;
  related_products?: RelatedProduct[];
  addons?: DishAddon[] | null;
};
export function recommendProducts(
  catalog: RecommendationProduct[],
  cart: { id: string; type?: 'dish' | 'beverage'; related_products?: RelatedProduct[] }[],
  max = 3
) {
  const already = new Set(cart.map((p) => p.id));
  const available = catalog.filter(
    (p) =>
      !already.has(p.id) &&
      p.is_available !== false &&
      Number(p.stock ?? 0) > 0 &&
      Number.isFinite(p.price) &&
      p.price > 0
  );
  const configured = cart.flatMap(
    (p) => p.related_products || catalog.find((c) => c.id === p.id)?.related_products || []
  );
  const explicit = configured.flatMap((ref) =>
    available.filter((p) => p.id === ref.id && p.type === ref.type)
  );
  const drinks = cart.some((p) => p.type !== 'beverage')
    ? available.filter((p) => p.type === 'beverage')
    : [];
  return [...explicit, ...drinks]
    .filter((p, i, rows) => rows.findIndex((r) => r.id === p.id) === i)
    .slice(0, max);
}
