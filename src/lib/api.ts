import { supabase } from './supabase';
import { dishPhotos, type DishPhoto, type RelatedProduct } from './dishMedia';
import { normalizeDishAddons } from './addons';

export type Category = { id: string; name: string; image?: string };
export type Dish = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  promo_price?: number | null;
  promo_active?: boolean;
  image?: string | null;
  gallery?: DishPhoto[];
  related_products?: RelatedProduct[];
  accompaniments?: string | null;
  dish_notes?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  ingredients?: string | null;
  servings?: number | null;
  popular?: boolean | null;
  isNew?: boolean | null;
  isAvailable?: boolean | null;
  stock?: number | null;
  position?: number | null;
  addons?: Array<{
    id: string;
    name: string;
    price: number;
    maxQty: number;
    required: boolean;
  }>;
};

function normalizeDishImage(imageValue: unknown): string | null {
  if (typeof imageValue !== 'string') return null;

  const image = imageValue.trim();
  if (!image) return null;

  if (/^(https?:)?\/\//i.test(image) || image.startsWith('data:')) {
    return image;
  }

  if (image.startsWith('/')) {
    return image;
  }

  if (image.startsWith('images/')) {
    return `/${image}`;
  }

  return `/images/dishes/${image.replace(/^\/+/, '')}`;
}

function mapDishRow(row: any): Dish {
  const image = normalizeDishImage(row.image || row.image_url || row.imageUrl || null);
  const normalizedAddons = normalizeDishAddons(row.extras ?? row.addons ?? null);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    promo_price: row.promo_price == null ? null : Number(row.promo_price),
    promo_active: row.promo_active === true,
    image: image,
    gallery: dishPhotos(row.gallery, image, row.name),
    related_products: row.related_products || [],
    accompaniments: row.accompaniments || null,
    dish_notes: row.dish_notes || null,
    categoryId: row.category_id || null,
    categoryName: row.category_name || row.categoryName || row.categories?.name || null,
    ingredients: typeof row.ingredients === 'string' ? row.ingredients : null,
    servings: row.servings ?? row.serves ?? null,
    popular: row.popular ?? row.is_featured ?? null,
    isNew: row.is_new || null,
    isAvailable:
      row.is_available !== false && Number(row.stock ?? (row.is_available === false ? 0 : 1)) >= 1,
    stock: Number(row.stock ?? (row.is_available === false ? 0 : 1)),
    position: row.position ?? 0,
    addons: normalizedAddons,
  };
}

function filterDishes(dishes: Dish[], query?: { q?: string; categoryId?: string }): Dish[] {
  const q = query?.q?.trim().toLowerCase() || '';
  const categoryId = query?.categoryId;
  return dishes.filter((dish) => {
    const matchesAvailability = dish.isAvailable !== false;
    const matchesCategory = !categoryId || dish.categoryId === categoryId;
    const haystack = [dish.name, dish.description, dish.categoryName, dish.ingredients]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    return matchesAvailability && matchesCategory && matchesQuery;
  });
}

function sortDishes(dishes: Dish[]): Dish[] {
  return [...dishes].sort((a, b) => {
    const positionDiff = Number(a.position || 0) - Number(b.position || 0);
    if (positionDiff !== 0) return positionDiff;
    return a.name.localeCompare(b.name);
  });
}

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return [];

  const { data, error } = await (supabase as any).from('categories').select('*').order('name');
  if (error) {
    console.error('getCategories error', error);
    return [];
  }
  return (data || [])
    .filter((row: any) => row.is_active !== false)
    .sort(
      (a: any, b: any) =>
        Number(a.position || 0) - Number(b.position || 0) ||
        String(a.name || '').localeCompare(String(b.name || ''))
    )
    .map((row: any) => ({
      id: row.id,
      name: row.name,
      image: row.image || row.image_url || undefined,
    })) as Category[];
}

export async function getDishes(options: { includeUnavailable?: boolean } = {}): Promise<Dish[]> {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from('dishes')
    .select('*, categories(name)')
    .order('name');
  if (error) {
    console.error('getDishes error', error);
    return [];
  }
  const dishes = sortDishes((data || []).map(mapDishRow));
  return options.includeUnavailable
    ? dishes
    : dishes.filter((dish: Dish) => dish.isAvailable !== false);
}

export async function getDishBySlug(slug: string): Promise<Dish | undefined> {
  if (!supabase) {
    return undefined;
  }

  const { data, error } = await (supabase as any)
    .from('dishes')
    .select('*, categories(name)')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('getDishBySlug error', error);
    return undefined;
  }
  if (!data) return undefined;
  return mapDishRow(data);
}

export async function searchDishes(query: { q?: string; categoryId?: string }): Promise<Dish[]> {
  if (!supabase) return [];

  const q = query.q?.trim();
  let builder = (supabase as any).from('dishes').select('*');
  if (query.categoryId) builder = builder.eq('category_id', query.categoryId);
  if (q && q.length > 0) {
    const like = `%${q}%`;
    builder = builder.or(`name.ilike.${like},description.ilike.${like},ingredients.ilike.${like}`);
  }
  const { data, error } = await builder.order('name');
  if (error) {
    console.error('searchDishes error', error);
    return [];
  }
  return sortDishes(filterDishes((data || []).map(mapDishRow), query));
}
